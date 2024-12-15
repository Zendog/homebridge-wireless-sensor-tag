const axios = require("axios");
const xmldoc = require("xmldoc");

let Service, Characteristic, Accessory;

// Handle registration with Homebridge
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;

    homebridge.registerPlatform(
        "homebridge-wireless-sensor-tag",
        "wireless-sensor-tag",
        WirelessTagPlatform
    );
};

// Platform object for the wireless tags. Represents the wireless tag manager
function WirelessTagPlatform(log, config) {
    this.log = log;
    this.token = config.token;
    this.queryFrequency = config.queryFrequency || 60; // default query frequency is 60 seconds
    this.tagManagers = config.tagManagers || {};
    this.deviceLookup = {};

    if (!this.token) {
        throw new Error(
            "No token specified in configuration for Wireless Sensor Tags."
        );
    }

    this.log(`Plugin configuration: ${JSON.stringify(config, null, 2)}`);
}

WirelessTagPlatform.prototype = {
    // Reload data from the wireless tags API
    reloadData: function (callback) {
        this.log("Starting reloadData...");
        const foundAccessories = [];
        const that = this;

        const tagManagerRequests = Object.entries(this.tagManagers).map(
            ([name, macAddress]) => {
                return this.getTagList(macAddress)
                    .then((devices) => {
                        if (devices && Array.isArray(devices)) {
                            devices.forEach((device) => {
                                this.log(
                                    `Processing device ${device.name} (${device.uuid}) from ${name}`
                                );
                                let accessory;
                                if (that.deviceLookup[device.uuid]) {
                                    accessory = that.deviceLookup[device.uuid];
                                    accessory.device = device;
                                    accessory.loadData(device);
                                } else {
                                    accessory = new WirelessTagAccessory(
                                        that,
                                        device,
                                        name
                                    );
                                    if (accessory) {
                                        that.log(
                                            `Device added from ${name} - ${device.uuid}`
                                        );
                                        that.deviceLookup[device.uuid] =
                                            accessory;
                                        foundAccessories.push(accessory);
                                    }
                                }
                            });
                        } else {
                            this.log(`No devices found for ${name}`);
                        }
                    })
                    .catch((error) => {
                        this.log(
                            `Error fetching devices for ${name}: ${error.message}`
                        );
                    });
            }
        );

        Promise.all(tagManagerRequests).then(() => {
            this.log("Completed reloadData");
            if (callback) {
                callback(foundAccessories);
            }
        });
    },

    // Fetch the tag list for a specific tag manager
    getTagList: function (macAddress) {
        const url = "https://www.mytaglist.com/ethClient.asmx/GetTagList";
        const headers = {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            "X-Set-Mac": macAddress,
        };

        return axios
            .post(url, {}, { headers })
            .then((response) => {
                this.log(
                    `API response for MAC ${macAddress}: ${JSON.stringify(
                        response.data,
                        null,
                        2
                    )}`
                );
                return response.data.d; // Return the device list
            })
            .catch((error) => {
                this.log(
                    `Error fetching tag list for MAC ${macAddress}: ${error.message}`
                );
                throw error;
            });
    },

    // Called by Homebridge to load accessories
    accessories: function (callback) {
        this.reloadData(callback);
    },
};

// Accessory class for Wireless Tags
function WirelessTagAccessory(platform, device, tagManagerName) {
    this.platform = platform;
    this.device = device;
    this.tagManagerName = tagManagerName;
    this.name = device.name;

    // Create the information service
    this.informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, "Wireless Sensor Tags")
        .setCharacteristic(Characteristic.Model, device.tagType || "Unknown Model")
        .setCharacteristic(Characteristic.SerialNumber, device.uuid);

    // Create the temperature service
    this.temperatureService = new Service.TemperatureSensor(this.name);
    this.temperatureService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on("get", (callback) => {
            if (device.temperature !== undefined) {
                callback(null, device.temperature);
            } else {
                callback(new Error("Temperature not available"));
            }
        });
}

WirelessTagAccessory.prototype = {
    loadData: function (device) {
        this.device = device;
        if (this.temperatureService) {
            this.temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(device.temperature || 0);
        }
    },

    getServices: function () {
        return [this.informationService, this.temperatureService];
    },
};
