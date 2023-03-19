# Kettler Bridge
This software is a bridge between an old KettlerBike with USB or serial port to a fresh Bluetooth Low Energy peripheral implementing FTMS and some GATT services.
* the bike appears as a controllable bike (FTMS, with SIM and ERG support)
* there is also a cadence sensor, power meter and other services
* In SIM mode : It implements a power curve to fit to external feeling.

it's a work in progress:
* Working on the power curve
* Implementing Gear Shift
* Using Momentary buttons to shift gear up and down
* Oled screen feedback

Tested on a Kettler Ergorace (https://www.bikeradar.com/reviews/training/indoor-trainers/resistance-trainer/kettler-ergorace-trainer-review/) and Kettler AX1 (with USB to RS232 adapter)  and ZWIFT, Rouvy and FulGaz.


## Setup
Install on a rasperypi zero w with Raspberry Pi OS.

### Power
We  need to enable 1.2A USB power draw mode, otherwise the RPi limits the draw to 0.6A:
```
/boot/config.txt
---
# Force 1.2A USB draw
max_usb_current=1
```

### NodeJS
The provided packages for node.js with Raspberry Pi OS are too old, see installing the newer v18 LTS is required (yaml needs >= v14):
```
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
```
### BLEno Setup
We use the great bleno (from abandonware for continuous support) library for simulating a Bluetooth Peripheral followin the GATT FTMS protocol.
see https://github.com/noble/bleno

Stop the bluetooth service (Bleno implements another stack)
```
sudo systemctl disable bluetooth
sudo hciconfig hci0 up
```
install lib
```
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```
Optional but recommended: give node the rights to do bluetooth (and more networking) without superuser rights
```
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```


### KettlerUSB2BLE
* download the sources
```
git clone https://github.com/360manu/kettlerUSB2BLE.git
cd kettlerUSB2BLE
```

* Install
!! No Sudo for node install. It breaks the compilation
```
npm install
```
it can take a while as bleno must be compiled from sources.

### Bike Setup
Just plug an USB cable from your PI (data USB, the central one) to the USB or use an USB to RS232 serial converter for bikes with a serial interface (such as the Kettler AX1 and Kettler Ergoracer)

## Usage

### Configuration
Initial support for configuration via config.yml has been integrated (metric values, i.e. kg for weights / mm for tire/wheel dimensions)
Adjust the values in this file to adjust simulation performance.

### Start
First try (`sudo` not be required if you executed the setcap command ):
```
sudo node server.js
```

You should hear a sound from the bike when the serial connection is OK. 
On the bike screen, you can now see the "USB" icons.
Note: older bikes (like the AX1) have no sound and will not show an icon when connected.

If you scan for BLE peripheral (use Nordic RF app fro ANdroid or IPhone for example)
Your kettler bike should appear as `KettlerBLE` device with two services (power & FTMS)

### Web Site
The Bridge is also a simple web server.
It helps debugging and has more feedback on the current state of the bike.

* Start your browser http://<pi-adress>:3000

You can follow the bridge activity on a simple website.
It will display the current power, HR et speed and some logs.
It's also possible to switch gears.

### Running As A Service
For an automatic launch with the raspberry 
```
sudo systemctl link /home/pi/kettlerUSB2BLE/kettler.service
```
-> Created symlink /etc/systemd/system/kettler.service → /home/pi/kettlerUSB2BLE/kettler.service.

```
sudo systemctl enable kettler.service
sudo systemctl start kettler.service
```

## Connecting Additional Hardware
### OLED Display
Connect an SSD1306 compatible OLED with 128x64 pixels to the GPIO pins 1(3.3V/VDD), 3 (SDA), 5(SCL), and 6(GND).
Currently the display is only showing a few details like connection status, mode (ERG/SIM) and depending on mode target power or grade.

### Buttons
For shifting gears up and down, buttons can be connected to pin 7 (gear up), pin 11 (gear down). Buttons must have a pull-up resistor to 3.3V and be normally open.