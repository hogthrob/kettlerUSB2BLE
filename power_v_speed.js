/*
 * Cycling power vs. velocity, based on a physical model.
 *
 * Copyright 2012 by Steven Gribble (gribble [at] gmail (dot) com)
 * http://www.gribble.org/
 */

// The default values for the various fields, to be set when the page
// loads.

var defaults = {
    units : "imperial",
    rp_wr : 165,        // weight of rider (lb)
    rp_wb : 17,         // weight of bike (lb)
    rp_a : 5.4788,      // frontal area, rider+bike (ft^2)
    rp_cd : 0.63,       // drag coefficient Cd
    rp_dtl : 2,         // drivetrain loss Loss_dt
    ep_crr : 0.005,     // coefficient of rolling resistance Crr
    ep_rho : 0.076537,  // air density (lb / ft^3)
    ep_g : 0,           // grade of hill (%)
    ep_headwind : 0,    // headwind; negative for tailwind (mph)
    p2v : 200,          // 200 watts of power default for the P2V field
    v2p : 22            // 22mph default for the V2P field
};

// Conversion factors for imperial --> metric
var LB_TO_KG = 0.45359237;
var FT_TO_M = 0.30480000;
var MI_TO_KM = 1.609344;
var LBF_TO_N = 4.4482216152605;

// A function to override the defaults with URL-supplied parameters.
function OverrideDefaultsWithUrlParameters() {
    var querystring = location.search.slice(1);
    let params = new URLSearchParams(querystring);

    // If the URL indicates to use metric, convert the already-set default
    // values from imperial to metric. This will make sure that any values
    // that are NOT supplied by parameters are the defaults (but in metric).
    if (params.get("units") == "metric") {
        $('input:radio[name=units][value=metric]').attr('checked', true);
        $('input:radio[name=units][value=imperial]').attr('checked', false);
        ChangeUnits();
    }

    // Check each field to see if a URL-parameter should override it. If so,
    // apply the override.

    if ((params.get("rp_wr") != null) && !isNaN(Number(params.get("rp_wr")))) {
        $('input:text[name=rp_wr]').val(Number(params.get("rp_wr")));
    }
    if ((params.get("rp_wb") != null) && !isNaN(Number(params.get("rp_wb")))) {
        $('input:text[name=rp_wb]').val(Number(params.get("rp_wb")));
    }
    if ((params.get("rp_a") != null) && !isNaN(Number(params.get("rp_a")))) {
        $('input:text[name=rp_a]').val(Number(params.get("rp_a")));
    }
    if ((params.get("rp_cd") != null) && !isNaN(Number(params.get("rp_cd")))) {
        $('input:text[name=rp_cd]').val(Number(params.get("rp_cd")));
    }
    if ((params.get("rp_dtl") != null) && !isNaN(Number(params.get("rp_dtl")))) {
        $('input:text[name=rp_dtl]').val(Number(params.get("rp_dtl")));
    }
    if ((params.get("ep_crr") != null) && !isNaN(Number(params.get("ep_crr")))) {
        $('input:text[name=ep_crr]').val(Number(params.get("ep_crr")));
    }
    if ((params.get("ep_rho") != null) && !isNaN(Number(params.get("ep_rho")))) {
        $('input:text[name=ep_rho]').val(Number(params.get("ep_rho")));
    }
    if ((params.get("ep_g") != null) && !isNaN(Number(params.get("ep_g")))) {
        $('input:text[name=ep_g]').val(Number(params.get("ep_g")));
    }
    if ((params.get("ep_headwind") != null) && !isNaN(Number(params.get("ep_headwind")))) {
        $('input:text[name=ep_headwind]').val(Number(params.get("ep_headwind")));
    }
    if ((params.get("p2v") != null) && !isNaN(Number(params.get("p2v")))) {
        $('input:text[name=p2v]').val(Number(params.get("p2v")));
    }
    if ((params.get("v2p") != null) && !isNaN(Number(params.get("v2p")))) {
        $('input:text[name=v2p]').val(Number(params.get("v2p")));
    }
}

// A function to set all the fields to their initial default values.
function SetDefaultVals() {
    // Set the radio buttons
    if (defaults.units == "imperial") {
        $('input:radio[name=units][value=metric]').attr('checked', false);
        $('input:radio[name=units][value=imperial]').attr('checked', true);
    } else {
        // Metric.
        $('input:radio[name=units][value=metric]').attr('checked', true);
        $('input:radio[name=units][value=imperial]').attr('checked', false);
    }

    // Set the rider/bike parameter initial values.
    $('input:text[name=rp_wr]').val(defaults.rp_wr);
    $('input:text[name=rp_wb]').val(defaults.rp_wb);
    $('input:text[name=rp_a]').val(defaults.rp_a);
    $('input:text[name=rp_cd]').val(defaults.rp_cd);
    $('input:text[name=rp_dtl]').val(defaults.rp_dtl);

    // Set the environmental parameter initial values.
    $('input:text[name=ep_crr]').val(defaults.ep_crr);
    $('input:text[name=ep_rho]').val(defaults.ep_rho);
    $('input:text[name=ep_headwind]').val(defaults.ep_headwind);
    $('input:text[name=ep_g]').val(defaults.ep_g);

    // Set the p2v and v2p field initial values.
    $('input:text[name=p2v]').val(defaults.p2v);
    $('input:text[name=v2p]').val(defaults.v2p);
}

// Scrape the current values of all the type-in boxes, convert
// them to numbers, and return them in an object dictionary.
//
// If "convert_to_metric" is true and the units are in imperial, this function
// will convert the returned values to metric. Otherwise, the values are
// returned as-is, without conversion.
function ScrapeParameters(convert_to_metric) {
    // prepare the return object
    var ret = { };

    // scrape the units
    ret.units = $('input:radio[name=units]:checked').val();

    // scrape the rider parameters
    ret.rp_wr = +$('input:text[name=rp_wr]').val();
    ret.rp_wb = +$('input:text[name=rp_wb]').val();
    ret.rp_a = +$('input:text[name=rp_a]').val();
    ret.rp_cd = +$('input:text[name=rp_cd]').val();
    ret.rp_dtl = +$('input:text[name=rp_dtl]').val();

    // scrape the environmental parameters
    ret.ep_crr = +$('input:text[name=ep_crr]').val();
    ret.ep_rho = +$('input:text[name=ep_rho]').val();
    ret.ep_headwind = +$('input:text[name=ep_headwind]').val();

    // special case the handling of grade; if it ends in a "%" character, then
    // strip it, since we want a number.
    var grstr = $('input:text[name=ep_g]').val();
    if (grstr.substr(grstr.length-1) == "%")
        grstr = grstr.substr(0, grstr.length - 1);
    ret.ep_g = +grstr;

    // scrape the p2v and v2p fields
    ret.p2v = parseFloat($('input:text[name=p2v]').val());
    ret.v2p = parseFloat($('input:text[name=v2p]').val());

    // if "imperial" is selected, convert to metric
    if ((convert_to_metric == true) && (ret.units == "imperial")) {
        ret.rp_wr *= LB_TO_KG;
        ret.rp_wb *= LB_TO_KG;
        ret.rp_a *= FT_TO_M * FT_TO_M;
        ret.ep_rho *= (LB_TO_KG) / (FT_TO_M * FT_TO_M * FT_TO_M);
        ret.ep_headwind *= MI_TO_KM;
        ret.v2p *= MI_TO_KM;
    }

    return ret;
}

// Sets the "field has changed" handlers for the input fields to
// ProcessChanges(); this causes the UI to dynamically update.
function SetChangeHandlers() {
    $('input:radio[name=units]').change(ChangeUnits);
    $('input:text[name=rp_wr]').change(ProcessChanges);
    $('input:text[name=rp_wb]').change(ProcessChanges);
    $('input:text[name=rp_a]').change(ProcessChanges);
    $('input:text[name=rp_cd]').change(ProcessChanges);
    $('input:text[name=rp_dtl]').change(ProcessChanges);
    $('input:text[name=ep_crr]').change(ProcessChanges);
    $('input:text[name=ep_rho]').change(ProcessChanges);
    $('input:text[name=ep_g]').change(ProcessChanges);
    $('input:text[name=ep_headwind]').change(ProcessChanges);
    $('input:text[name=p2v]').change(ProcessChanges);
    $('input:text[name=v2p]').change(ProcessChanges);
}

// The user has changed units from metric to imperial, or vice-versa.
// We need to update the web page HTML and type-in boxes to the new units.
function ChangeUnits() {
    var ret = ScrapeParameters(true);

    if (ret.units == "imperial") {
        // Convert from metric to imperial.  Start by converting the type-in boxes.
        //
        // Remember that ScrapeParameters() already does imperial to metric
        // conversion if ret.units == "imperial". So, "ret" contains doubly-metricized
        // units that we need to undo into singly metricized units.
        var wr = Math.round(ret.rp_wr / (LB_TO_KG*LB_TO_KG) * 1000) / 1000;
        $('input:text[name=rp_wr]').val(wr);

        var wb = Math.round(ret.rp_wb / (LB_TO_KG*LB_TO_KG) * 1000) / 1000;
        $('input:text[name=rp_wb]').val(wb);

        var a = Math.round(ret.rp_a / (FT_TO_M * FT_TO_M * FT_TO_M * FT_TO_M) * 10000) / 10000;
        $('input:text[name=rp_a]').val(a);

        var rho = Math.round(ret.ep_rho /
                             (LB_TO_KG * LB_TO_KG /
                              (FT_TO_M * FT_TO_M * FT_TO_M * FT_TO_M * FT_TO_M * FT_TO_M)) * 1000000) / 1000000;
        $('input:text[name=ep_rho]').val(rho);

        var headwind = Math.round(ret.ep_headwind / (MI_TO_KM * MI_TO_KM) * 100) / 100;
        $('input:text[name=ep_headwind]').val(headwind);

        var v2p = Math.round(ret.v2p / (MI_TO_KM * MI_TO_KM) * 100) / 100;
        $('input:text[name=v2p]').val(v2p);

        RewriteUnitsFromMetricToImperial();
    } else {
        // Convert the form's type-in boxes from imperial to metric.
        var wr = Math.round(ret.rp_wr * LB_TO_KG * 1000) / 1000;
        $('input:text[name=rp_wr]').val(wr);

        var wb = Math.round(ret.rp_wb * LB_TO_KG * 1000) / 1000;
        $('input:text[name=rp_wb]').val(wb);

        var a = Math.round(ret.rp_a * (FT_TO_M * FT_TO_M) * 10000) / 10000;
        $('input:text[name=rp_a]').val(a);

        var rho = Math.round(ret.ep_rho * (LB_TO_KG / (FT_TO_M * FT_TO_M * FT_TO_M)) * 100000) / 100000;
        $('input:text[name=ep_rho]').val(rho);

        var headwind = Math.round(ret.ep_headwind * (MI_TO_KM) * 100) / 100;
        $('input:text[name=ep_headwind]').val(headwind);

        var v2p = Math.round(ret.v2p * (MI_TO_KM) * 100) / 100;
        $('input:text[name=v2p]').val(v2p);

        RewriteUnitsFromImperialToMetric();
    }

    // Update the dynamic part of the UI.
    ProcessChanges();
}

function RewriteUnitsFromMetricToImperial() {
    $('#rp_wr').html(function(i,v) { return v.replace("kg", "lb"); });
    $('#rp_wb').html(function(i,v) { return v.replace("kg", "lb"); });
    $('#rp_totalw').html(function(i,v) { return v.replace("kg", "lb"); });
    $('#rp_a').html(function(i,v) { return v.replace("m<sup>2</sup>", "ft<sup>2</sup>"); });
    $('#rp_cdatot').html(function(i,v) { return v.replace("m<sup>2</sup>", "ft<sup>2</sup>"); });
    $('#ep_rho').html(function(i,v) { return v.replace("kg/m<sup>3</sup>", "lb/ft<sup>3</sup>"); });
    $('#ep_headwind').html(function(i,v) { return v.replace("km/h", "mph"); });
    $('#p2v_ov_td').html(function(i,v) { return v.replace("km/h", "mph"); });
    $('#v2p_td').html(function(i,v) { return v.replace("km/h", "mph"); });
}

function RewriteUnitsFromImperialToMetric() {
    $('#rp_wr').html(function(i,v) { return v.replace("lb", "kg"); });
    $('#rp_wb').html(function(i,v) { return v.replace("lb", "kg"); });
    $('#rp_totalw').html(function(i,v) { return v.replace("lb", "kg"); });
    $('#rp_a').html(function(i,v) { return v.replace("ft<sup>2</sup>", "m<sup>2</sup>"); });
    $('#rp_cdatot').html(function(i,v) { return v.replace("ft<sup>2</sup>", "m<sup>2</sup>"); });
    $('#ep_rho').html(function(i,v) { return v.replace("lb/ft<sup>3</sup>", "kg/m<sup>3</sup>"); });
    $('#ep_headwind').html(function(i,v) { return v.replace("mph", "km/h"); });
    $('#p2v_ov_td').html(function(i,v) { return v.replace("mph", "km/h"); });
    $('#v2p_td').html(function(i,v) { return v.replace("mph", "km/h"); });
}

// Updates the sharing URL with the current parameter set.
function UpdateSharingURL() {
    var sharingURL = "https://www.gribble.org/cycling/power_v_speed.html";

    // Get the field values, but don't convert them if they are imperial.
    var ret = ScrapeParameters(false);

    // Add all the params to the end of the sharing URL.
    sharingURL += "?units=" + ret.units;
    sharingURL += "&rp_wr=" + ret.rp_wr;
    sharingURL += "&rp_wb=" + ret.rp_wb;
    sharingURL += "&rp_a=" + ret.rp_a;
    sharingURL += "&rp_cd=" + ret.rp_cd;
    sharingURL += "&rp_dtl=" + ret.rp_dtl;
    sharingURL += "&ep_crr=" + ret.ep_crr;
    sharingURL += "&ep_rho=" + ret.ep_rho;
    sharingURL += "&ep_g=" + ret.ep_g;
    sharingURL += "&ep_headwind=" + ret.ep_headwind;
    sharingURL += "&p2v=" + ret.p2v;
    sharingURL += "&v2p=" + ret.v2p;

    // Rewrite the sharing URL.
    $('input:text[id=clipurl]').val(sharingURL);
}

// Re-scrapes and updates the UI, given that something has changed.
function ProcessChanges() {
    // Update the sharing URL.
    UpdateSharingURL();

    // Get the (metric) parameters.
    var ret = ScrapeParameters(true);

    // Update the total weight and CdA fields
    if (ret.units == "metric") {
        $("#rp_wt").html((ret.rp_wr + ret.rp_wb).toFixed(2));
        $("#rp_cda").html((ret.rp_a * ret.rp_cd).toFixed(3));
    } else {
        $("#rp_wt").html(((ret.rp_wr + ret.rp_wb)/LB_TO_KG).toFixed(2));
        $("#rp_cda").html(((ret.rp_a * ret.rp_cd)/(FT_TO_M*FT_TO_M)).toFixed(3));
    }

    // Update the p2v and v2p fields
    var v_from_p = CalculateVelocity(ret.p2v, ret);
    if (ret.units == "metric") {
        $("#p2v_ov").html(v_from_p.toFixed(2));
    } else {
        $("#p2v_ov").html((v_from_p / MI_TO_KM).toFixed(2));
    }
    var p_from_v = PowDictToLegPower(CalculatePower(ret.v2p, ret));
    $("#v2p_op").html(p_from_v.toFixed(2));

    // Update the graph in S1.
    var pmax = 800;
    var vmax = CalculateVelocity(pmax, ret);

    // Assistive power.
    var legpowerdata = [ ];
    var gravityassistdata = [ ];
    var windassistdata = [ ];

    // Resistive power.
    var rollingresistdata = [ ];
    var gravityresistdata = [ ];
    var dragresistdata = [ ];
    var drivetrainlossdata = [ ];
    var brakepowerdata = [ ];

    for (var vs = vmax; vs >= 0; vs -= 0.1) {
        var nextpower = CalculatePower(vs, ret);
        var forces = CalculateForces(vs, ret);
        var speed_to_push = vs;
        if (ret.units != "metric") {
            speed_to_push = speed_to_push / MI_TO_KM;
        }

        var pfd = BrokenDownPowerForce(nextpower, forces, vs);

        // Add in all of the assistive forces.
        windassistdata.push([speed_to_push, pfd.windassistpower]);
        gravityassistdata.push([speed_to_push, pfd.windassistpower + pfd.gravityassistpower]);
        legpowerdata.push([speed_to_push, pfd.legpower + pfd.windassistpower + pfd.gravityassistpower]);

        // Add in all of the resistive forces.
        dragresistdata.push([speed_to_push, -1.0 * pfd.dragresistpower]);
        gravityresistdata.push([speed_to_push, -1.0 * (pfd.dragresistpower + pfd.gravityresistpower)]);
        rollingresistdata.push([speed_to_push, -1.0 * (pfd.dragresistpower + pfd.gravityresistpower + pfd.rollingresistpower)]);
        drivetrainlossdata.push([speed_to_push, -1.0 * (pfd.drivetrainlosspower + pfd.dragresistpower + pfd.gravityresistpower + pfd.rollingresistpower)]);
        brakepowerdata.push([speed_to_push, -1.0 * (pfd.drivetrainlosspower + pfd.brakepower + pfd.dragresistpower + pfd.gravityresistpower + pfd.rollingresistpower)]);
    }

    var plotdata = [ { data: legpowerdata,
                       lines: {show:true, fill:1, lineWidth:2},
                       color: "rgb(255,0,0)",
                       points: {show:false},
                       shadowSize: 0
                     },
                     { data : gravityassistdata,
                       lines: {show:true, fill:1, lineWidth:0},
                       color: "rgb(0,148,0)",
                       points: {show:false},
                       shadowSize: 0
                     },
                     { data : windassistdata,
                       lines: {show:true, fill:1, lineWidth:0},
                       color: "rgb(67,107,239)",
                       points: {show:false},
                       shadowSize: 0
                     },

                     { data : brakepowerdata,
                       lines: {show:true, fill:1, lineWidth:0},
                       color: "rgb(245,128,37)",
                       points: {show:false},
                       shadowSize: 0
                     },
                     { data : drivetrainlossdata,
                       lines: {show:true, fill:1, lineWidth:0},
                       color: "rgb(255,215,0)",
                       points: {show:false},
                       shadowSize: 0,
                     },
                     { data : rollingresistdata,
                       lines: {show:true, fill:1, lineWidth:0},
                       color: "rgb(173,97,154)",
                       points: {show:false},
                       shadowSize: 0,
                     },
                     { data : gravityresistdata,
                       lines: {show:true, fill:1, lineWidth:0},
                       color: "rgb(49,120,115)",
                       points: {show:false},
                       shadowSize: 0,
                     },
                     { data : dragresistdata,
                       lines: {show:true, fill:1, lineWidth:0},
                       color: "rgb(128,0,255)",
                       points: {show:false},
                       shadowSize: 0,
                     },

                     ];
    var options = {
        grid: {
            hoverable: true,
            autoHighlight: false,
            backgroundColor: { colors: ["#fff", "#eee" ] }
        }, xaxis: {
            axisLabel: ret.units == "metric" ? "velocity (km/h)" : "velocity (mph)",
            axisLabelUseCanvas: true,
            axisLabelFontFamily: 'Arial'
        }, yaxis: {
            axisLabel: "power (watts)",
            axisLabelUseCanvas: true,
            axisLabelFontFamily: 'Arial'
        }, crosshair: {
            mode: "x"
        }
    };

    // Draw the graph.
    var plot = $.plot($("#powergraph"), plotdata, options);

    // Bind the hover events.
    var updateLegendTimeout = null;
    var axes = plot.getAxes();
    var latestPosition = {
        x: (axes.xaxis.min + axes.xaxis.max) / 2,
        y: (axes.yaxis.min + axes.yaxis.max) / 2
    };

    updateLegend();
    $("#powergraph").bind(
        "plothover",
        function (event, pos, item) {
            latestPosition = pos;
            if (!updateLegendTimeout)
                updateLegendTimeout = setTimeout(updateLegend, 50);
        }
    );

    function updateLegend() {
        updateLegendTimeout = null;
        var pos = latestPosition;
        var axes = plot.getAxes();
        if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
            pos.y < axes.yaxis.min || pos.y > axes.yaxis.max)
            return;

        var params = ScrapeParameters(true);
        var velocity = pos.x;
        var vmetric = ret.units == "metric" ? velocity : velocity * MI_TO_KM;
        var powerdict = CalculatePower(vmetric, params);
        var forcedict = CalculateForces(vmetric, params);
        var pfd = BrokenDownPowerForce(powerdict, forcedict, vmetric);
        var net_wind = (vmetric + params.ep_headwind) / (ret.units == "metric" ? 1.0 : MI_TO_KM);

        var breakout_text = "<br>\n";
        breakout_text += "To maintain <b>" + velocity.toFixed(2) + (ret.units == "metric" ? " km/h" : " mph") + "</b> ";
        breakout_text += "in these conditions, you ";
        if (pfd.legpower != 0.0) {
            breakout_text += "must pedal with <b>" + pfd.legpower.toFixed(2) + " watts</b> of power.";
        } else if (pfd.brakepower != 0.0) {
            breakout_text += "must brake with <b>" + pfd.brakepower.toFixed(2) + " watts</b> of power.";
        } else {
            breakout_text += "don't need to pedal or brake: you can simply coast.";
        }
        breakout_text += "\n<br><br>\n";

        breakout_text += "<b>Assistive forces</b><br>\n";
        var assistive_forces = { };
        var assistive_total = 0.0;
        if (pfd.gravityassistforce > 0.0) {
            breakout_text += "You are cycling downhill: gravity is helping you with <b>";
            breakout_text += ret.units == "metric" ? (pfd.gravityassistforce.toFixed(2) + " (N)") : ((pfd.gravityassistforce/LBF_TO_N).toFixed(2) + " (lbf)");
            breakout_text += "</b> of force, or <font style='color:rgb(0,148,0)'><b>" + pfd.gravityassistpower.toFixed(2) + " watts</b> of power</font>.<br>\n";
            assistive_forces.Pgravity = pfd.gravityassistpower;
            assistive_total += pfd.gravityassistpower;
        }
        if (pfd.windassistforce > 0.0) {
            breakout_text += "A net tailwind of <b>";
            breakout_text += (-1.0 * net_wind.toFixed(2)) + (ret.units == "metric" ? " km/h" : " mph") + "</b>";
            breakout_text += " is helping you with <b>";
            breakout_text += ret.units == "metric" ? (pfd.windassistforce.toFixed(2) + " (N)") : ((pfd.windassistforce/LBF_TO_N).toFixed(2) + " (lbf)");
            breakout_text += "</b> of force, or <font style='color:rgb(67,107,239)'><b>" + pfd.windassistpower.toFixed(2) + " watts</b> of power</font>.<br>\n";
            assistive_forces.Ptailwind = pfd.windassistpower;
            assistive_total += pfd.windassistpower;
        }
        if (pfd.legpower > 0.0) {
            breakout_text += "You must pedal with <font style='color:rgb(255,0,0)'><b>" + pfd.legpower.toFixed(2) + " watts</b> of power</font>; after ";
            breakout_text += "drivetrain loss of " + pfd.drivetrainlosspower.toFixed(2) + " watts, you'll supply ";
            breakout_text += (pfd.legpower - pfd.drivetrainlosspower).toFixed(2) + " watts to your wheel.<br>\n";
            assistive_forces.Plegs = pfd.legpower;
            assistive_total += pfd.legpower;
        }
        var isFirstAssist = true;
        if (assistive_forces.hasOwnProperty('Pgravity')) {
            breakout_text += "<font style='color:rgb(0,148,0);font-size:75%;'>";
            if (!isFirstAssist) { breakout_text += "&nbsp;&nbsp;"; } isFirstAssist = false;
            breakout_text += "Pgravity = " + assistive_forces.Pgravity.toFixed(2) + "w (";
            breakout_text += (100.0 * assistive_forces.Pgravity / assistive_total).toFixed(2) + "&percnt;)</font>";
        }
        if (assistive_forces.hasOwnProperty('Ptailwind')) {
            breakout_text += "<font style='color:rgb(67,107,239)';font-size:75%;'>"
            if (!isFirstAssist) { breakout_text += "&nbsp;&nbsp;"; } isFirstAssist = false;
            breakout_text += "Ptailwind = " + assistive_forces.Ptailwind.toFixed(2) + "w (";
            breakout_text += (100.0 * assistive_forces.Ptailwind / assistive_total).toFixed(2) + "&percnt;)</font>";
        }
        if (assistive_forces.hasOwnProperty('Plegs')) {
            breakout_text += "<font style='color:rgb(255,0,0);font-size:75%;'>"
            if (!isFirstAssist) { breakout_text += "&nbsp;&nbsp;"; } isFirstAssist = false;
            breakout_text += "Plegs = " + assistive_forces.Plegs.toFixed(2) + "w (";
            breakout_text += (100.0 * assistive_forces.Plegs / assistive_total).toFixed(2) + "&percnt;)</font>";
        }
        breakout_text += "<br>\n";

        breakout_text += "<br>\n";
        breakout_text += "<b>Resistive forces</b><br>\n";
        var resistive_forces = { };
        var resistive_total = 0.0;
        if (pfd.gravityresistforce > 0.0) {
            breakout_text += "You are cycling uphill: gravity is working against you with <b>";
            breakout_text += ret.units == "metric" ? (pfd.gravityresistforce.toFixed(2) + " (N)") : ((pfd.gravityresistforce/LBF_TO_N).toFixed(2) + " (lbf)");
            breakout_text += "</b> of force, or <font style='color:rgb(49,120,115)'><b>" + pfd.gravityresistpower.toFixed(2) + " watts</b> of power</font>.<br>\n";
            resistive_forces.Pgravity = pfd.gravityresistpower;
            resistive_total += pfd.gravityresistpower;
        }
        if (pfd.dragresistforce > 0.0) {
            breakout_text += "A net headwind of <b>";
            breakout_text += (net_wind.toFixed(2)) + (ret.units == "metric" ? " km/h" : " mph") + "</b>";
            breakout_text += " is working against you with <b>";
            breakout_text += ret.units == "metric" ? (pfd.dragresistforce.toFixed(2) + " (N)") : ((pfd.dragresistforce/LBF_TO_N).toFixed(2) + " (lbf)");
            breakout_text += "</b> of force, or <font style='color:rgb(128,0,255)'><b>" + pfd.dragresistpower.toFixed(2) + " watts</b> of power.</font><br>\n";
            resistive_forces.Pdrag = pfd.dragresistpower;
            resistive_total += pfd.dragresistpower;
        }
        if (pfd.rollingresistforce > 0.0) {
            breakout_text += "Rolling resistance is working against you with <b>";
            breakout_text += ret.units == "metric" ? (pfd.rollingresistforce.toFixed(2) + " (N)") : ((pfd.rollingresistforce/LBF_TO_N).toFixed(2) + " (lbf)");
            breakout_text += "</b> of force, or <font style='color:rgb(173,97,154)'><b>" + pfd.rollingresistpower.toFixed(2) + " watts</b> of power</font>.<br>\n";
            resistive_forces.Prollingresist = pfd.rollingresistpower;
            resistive_total += pfd.rollingresistpower;
        }
        if (pfd.drivetrainlosspower > 0.0) {
            breakout_text += "Drivetrain loss is costing you <font style='color:rgb(255,215,0)'><b>" + pfd.drivetrainlosspower.toFixed(2) + " watts</b> of power</font>.<br>\n";
            resistive_forces.Pdrivetrain = pfd.drivetrainlosspower;
            resistive_total += pfd.drivetrainlosspower;
        }
        if (pfd.brakepower > 0.0) {
            breakout_text += "You must brake with <font style='color:rgb(245,128,37)'><b>" + pfd.brakepower.toFixed(2) + " watts</b> of power</font>.<br>\n";
            resistive_forces.Pbrake = pfd.brakepower;
            resistive_total += pfd.brakepower;
        }
        var isFirstResist = true;
        if (resistive_forces.hasOwnProperty('Pgravity')) {
            breakout_text += "<font style='color:rgb(49,120,115);font-size:75%;'>"
            if (!isFirstResist) { breakout_text += "&nbsp;&nbsp;"; } isFirstResist = false;
            breakout_text += "Pgravity = " + resistive_forces.Pgravity.toFixed(2) + "w (";
            breakout_text += (100.0 * resistive_forces.Pgravity / resistive_total).toFixed(2) + "&percnt;)</font>";
        }
        if (resistive_forces.hasOwnProperty('Pdrag')) {
            breakout_text += "<font style='color:rgb(128,0,255);font-size:75%;'>"
            if (!isFirstResist) { breakout_text += "&nbsp;&nbsp;"; } isFirstResist = false;
            breakout_text += "Pdrag = " + resistive_forces.Pdrag.toFixed(2) + "w (";
            breakout_text += (100.0 * resistive_forces.Pdrag / resistive_total).toFixed(2) + "&percnt;)</font>";
        }
        if (resistive_forces.hasOwnProperty('Prollingresist')) {
            breakout_text += "<font style='color:rgb(173,97,154);font-size:75%;'>"
            if (!isFirstResist) { breakout_text += "&nbsp;&nbsp;"; } isFirstResist = false;
            breakout_text += "Prollingresist = " + resistive_forces.Prollingresist.toFixed(2) + "w (";
            breakout_text += (100.0 * resistive_forces.Prollingresist / resistive_total).toFixed(2) + "&percnt;)</font>";
        }
        if (resistive_forces.hasOwnProperty('Pdrivetrain')) {
            breakout_text += "<font style='color:rgb(255,215,0);font-size:75%;'>"
            if (!isFirstResist) { breakout_text += "&nbsp;&nbsp;"; } isFirstResist = false;
            breakout_text += "Pdrivetrainloss = " + resistive_forces.Pdrivetrain.toFixed(2) + "w (";
            breakout_text += (100.0 * resistive_forces.Pdrivetrain / resistive_total).toFixed(2) + "&percnt;)</font>";
        }
        if (resistive_forces.hasOwnProperty('Pbrake')) {
            breakout_text += "<font style='color:rgb(245,128,37);font-size:75%;'>"
            if (!isFirstResist) { breakout_text += "&nbsp;&nbsp;"; } isFirstResist = false;
            breakout_text += "Pbrake = " + resistive_forces.Pbrake.toFixed(2) + "w (";
            breakout_text += (100.0 * resistive_forces.Pbrake / resistive_total).toFixed(2) + "&percnt;)</font>";
        }
        breakout_text += "<br>\n";

        breakout_text += "<br>\n";
        $("#fbreakout").html(breakout_text);
    }
}

// Calculates and returns the force components needed to achieve the
// given velocity. <params> is a dictionary containing the rider and
// environmental parameters, as returned by ScrapeParameters(), i.e.,
// all in metric units.  'velocity' is in km/h.
function CalculateForces(velocity, params) {
    // calculate Fgravity
    var Fgravity = 9.8067 *
        (params.rp_wr + params.rp_wb) *
        Math.sin(Math.atan(params.ep_g / 100.0));

    // calculate Frolling
    var Frolling = 9.8067 *
        (params.rp_wr + params.rp_wb) *
        Math.cos(Math.atan(params.ep_g / 100.0)) *
        (params.ep_crr);
    if (velocity < 0) {
        Frolling *= -1.0;
    }

    // calculate Fdrag
    var Fdrag = 0.5 *
        (params.rp_a) *
        (params.rp_cd) *
        (params.ep_rho) *
        ((velocity + params.ep_headwind) * 1000.0 / 3600.0) *
        ((velocity + params.ep_headwind) * 1000.0 / 3600.0);
    if (velocity + params.ep_headwind < 0) {
        Fdrag *= -1.0;
    }

    // cons up and return the force components
    var ret = { };
    ret.Fgravity = Fgravity;
    ret.Frolling = Frolling;
    ret.Fdrag = Fdrag;
    return ret;
}

// Calculates and returns the power needed to achieve the given velocity.
//
// <params> is a dictionary containing the rider and environmenetal
// parameters, as returned by ScrapeParameters() in metric units.
// 'velocity' is in km/h.
//
// Returns a dictionary of power parameters, in watts:
//   ret.legpower
//   ret.wheelpower
//   ret.drivetrainloss
//   ret.brakingpower
//
// Only one of legpower or brakingpower is greater than zero. So, if
// the rider is pedaling, legpower (and wheelpower, drivetrainloss) are
// positive. If the rider is braking, brakingpower is positive.
function CalculatePower(velocity, params) {
    // calculate the forces on the rider.
    var forces = CalculateForces(velocity, params);
    var totalforce = forces.Fgravity + forces.Frolling + forces.Fdrag;

    // calculate necessary wheelpower.
    var wheelpower = totalforce * (velocity * 1000.0 / 3600.0);

    // calculate necessary legpower. Note: if wheelpower is negative,
    // i.e., braking is needed instead of pedaling, then there is
    // no drivetrain loss.
    var drivetrainfrac = 1.0;
    if (wheelpower > 0.0) {
        drivetrainfrac = drivetrainfrac - (params.rp_dtl/100.0);
    }
    var legpower = wheelpower / drivetrainfrac;

    var ret = { };
    if (legpower > 0.0) {
        ret.legpower = legpower;
        ret.wheelpower = wheelpower;
        ret.drivetrainloss = legpower - wheelpower;
        ret.brakingpower = 0.0;
    } else {
        ret.legpower = 0.0;
        ret.wheelpower = 0.0;
        ret.drivetrainloss = 0.0;
        ret.brakingpower = legpower * -1.0;
    }

    return ret;
}

// Calculates the velocity obtained from a given power. <params> is a
// dictionary containing the rider and model parameters in metric units.
//
// Runs a simple midpoint search, using CalculatePower().
//
// Returns velocity, in km/h.
function CalculateVelocity(power, params) {
    // How close to get before finishing.
    var epsilon = 0.000001;

    // Set some reasonable upper / lower starting points.
    var lowervel = -1000.0;
    var uppervel = 1000.0;
    var midvel = 0.0;
    var midpowdict = CalculatePower(midvel, params);

    // Iterate until completion.
    var itcount = 0;
    do {
        var midpow = PowDictToLegPower(midpowdict);
        if (Math.abs(midpow - power) < epsilon)
            break;

        if (midpow > power)
            uppervel = midvel;
        else
            lowervel = midvel;

        midvel = (uppervel + lowervel) / 2.0;
        midpowdict = CalculatePower(midvel, params);
    } while (itcount++ < 100);

    return midvel;
}

// Calculates broken out force and power data.
function BrokenDownPowerForce(powerdict, forcedict, speed) {
    var ret = {}
    ret.legpower = 0.0;
    ret.gravityassistforce = ret.gravityassistpower = 0.0;
    ret.windassistforce = ret.windassistpower = 0.0;
    ret.gravityresistforce = ret.gravityresistpower = 0.0;
    ret.dragresistforce = ret.dragresistpower = 0.0;
    ret.rollingresistforce = ret.rollingresistpower = 0.0;
    ret.drivetrainlosspower = 0.0;
    ret.brakepower = 0.0;

    // Human forces.
    if (powerdict.legpower > 0.0) {
        ret.legpower = powerdict.legpower;
        ret.drivetrainlosspower = powerdict.drivetrainloss;
    } else {
        ret.brakepower = powerdict.brakingpower;
    }

    // Gravity forces.
    if (forcedict.Fgravity > 0.0) {
        ret.gravityresistforce = forcedict.Fgravity;
        ret.gravityresistpower = ret.gravityresistforce * speed / 3.6;
    } else {
        ret.gravityassistforce = -1.0 * forcedict.Fgravity;
        ret.gravityassistpower = ret.gravityassistforce * speed / 3.6;
    }

    // Air drag/boost forces.
    if (forcedict.Fdrag > 0.0) {
        ret.dragresistforce = forcedict.Fdrag;
        ret.dragresistpower = ret.dragresistforce * speed / 3.6;
    } else {
        ret.windassistforce = -1.0 * forcedict.Fdrag;
        ret.windassistpower = ret.windassistforce * speed / 3.6;
    }

    // Rolling resistance.
    ret.rollingresistforce = forcedict.Frolling;
    ret.rollingresistpower = ret.rollingresistforce * speed / 3.6;

    return ret;
}

// Returns the legpower (negative for brakepower) from the powerdict.
function PowDictToLegPower(powdict) {
    var midpow = 0.0;
    if (powdict.brakingpower > 0.0) {
        midpow = powdict.brakingpower * -1.0;
    } else {
        midpow = powdict.legpower;
    }
    return midpow;
}

$(document).ready(
    // This is the code that fires when the document has finished
    // loading, i.e., the C equivalent of main().
    function() {
        var clipboard = new ClipboardJS('#copy-button');
        SetDefaultVals();
        OverrideDefaultsWithUrlParameters();
        SetChangeHandlers();
        ProcessChanges();
    }
);

