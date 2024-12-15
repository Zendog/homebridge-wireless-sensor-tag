# homebridge-wireless-sensor-tag
 
Homebridge platform for Wireless Sensor Tags. (http://wirelesstags.net/)

Supports 13-bit temperature/humidity sensor, Pro ALS sensor, and PIR sensor.
 
# Installation

1. Install homebridge using: npm install -g homebridge
2. After cloning this repo, install this plugin (while inside the repo): npm install; npm link
3. Update your configuration file. See sampleconfig.json in this repository for a sample. 
 

## Configuration

To use this plugin, include the following in your Homebridge `config.json` file:

```json
{
  "platforms": [
    {
      "platform": "wireless-sensor-tag",
      "name": "Wireless Sensor Tags",
      "token": "YOUR_API_TOKEN_HERE",
      "queryFrequency": 60,
      "tagManagers": {
        "TagManager1": "MAC_ADDRESS_1",
        "TagManager2": "MAC_ADDRESS_2"
      }
    }
  ]
}


 Fields:
 * platform - Must be set to wireless-sensor-tag
 * name - Up to you. 
 * token - Your OAuth2 access token - see http://wirelesstag.net/eth/oauth2_apps.html 
 * queryFrequency - The amount of time (in ms) between updates. Minimum value is 5000; default is 20000.
 * motionSensors - A list of sensors that should be treated like motion sensors in addition to temperature/humidity.
 * contactSensors - A list of sensors that should be treated like contact (open/close) sensors in addition to temperature/humidity. For the Pro ALS sensor, the "too bright" light state signifies "open" while "normal"/"too dark" signifies "closed"; for all other sensors, the "opened" and "closed" event states are used.
 * TagManager1&2 are the MAC addresses of tagmanagers in your account so the plugin can account for all of your tags instead of just the active tagmanager by default.
 
# To do
* Nothing at this time
