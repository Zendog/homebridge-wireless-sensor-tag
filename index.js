const axios = require("axios");

let Service, Characteristic;

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform(
        "homebridge-wireless-sensor-tag",
        "wireless-sensor-tag",
        WirelessTagPlatform,
        true // Enable dynamic platform
    );
};

class WirelessTagPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config || {};
        this.api = api;

        this.token = this.config.token;
        this.queryFrequency = this.config.queryFrequency || 60000;
        this.tagManagers = this.config.tagManagers || {};
        this.accessories = new Map();

        if (!this.token) {
            throw new Error(
                "No token specified in configuration for Wireless Sensor Tags."
            );
        }

        this.log(`Plugin configuration: ${JSON.stringify(this.config, null, 2)}`);

        if (this.queryFrequency < 5000) {
            this.log("Invalid query frequency; setting to 20000ms default.");
            this.queryFrequency = 20000;
        }

        if (this.api) {
            this.api.on("didFinishLaunching", this.onReady.bind(this));
        }
    }

    onReady() {
        this.log("Homebridge has finished launching.");
        this.startPolling();
    }

    startPolling() {
        this.log(`Setting up periodic updates every ${this.queryFrequency} ms.`);
        this.reloadData();
        setInterval(this.reloadData.bind(this), this.queryFrequency);
    }

    async reloadData() {
        this.log("Starting reloadData...");
        for (const [managerName, macAddress] of Object.entries(this.tagManagers)) {
            try {
                const devices = await this.getTagList(macAddress);
                this.log(`Fetched tag list for manager: ${macAddress}`);

                devices.forEach((device) => this.processDevice(device, managerName));
            } catch (error) {
                this.log(
                    `Error fetching devices for manager "${managerName}" (MAC: ${macAddress}): ${error.message}`
                );
            }
        }
    }

    async getTagList(macAddress) {
        const url = "https://mytaglist.com/ethClient.asmx/GetTagList2";
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
        };

        try {
            const response = await axios.post(url, {}, { headers });
            return response.data?.d.filter((device) => device.mac === macAddress) || [];
        } catch (error) {
            this.log(
                `Error fetching tag list for MAC ${macAddress}: ${error.message}`
            );
            throw error;
        }
    }

    processDevice(device, managerName) {
        const uuid = this.api.hap.uuid.generate(device.uuid);

        if (this.accessories.has(uuid)) {
            // Update existing accessory
            const existingAccessory = this.accessories.get(uuid);
            this.log(`Updating existing accessory: ${device.name} (${uuid})`);
            existingAccessory.context.device = device;
            existingAccessory.updateReachability(true);
            this.updateAccessoryData(existingAccessory, device);
        } else {
            // Register a new accessory
            this.log(`Adding new accessory: ${device.name} (${uuid})`);
            const accessory = new this.api.platformAccessory(device.name, uuid);
            accessory.context.device = device;

            this.addAccessoryServices(accessory, device);

            this.accessories.set(uuid, accessory);
            this.api.registerPlatformAccessories(
                "homebridge-wireless-sensor-tag",
                "wireless-sensor-tag",
                [accessory]
            );
        }
    }

    addAccessoryServices(accessory, device) {
        const tempService =
            accessory.getService(Service.TemperatureSensor) ||
            accessory.addService(Service.TemperatureSensor);

        tempService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on("get", (callback) => {
                callback(null, device.temperature || 0);
            });

        this.log(`Added temperature service for ${device.name}.`);
    }

    updateAccessoryData(accessory, device) {
        const tempService = accessory.getService(Service.TemperatureSensor);
        if (tempService) {
            tempService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(device.temperature || 0);
            this.log(`Updated temperature for ${device.name}: ${device.temperature}`);
        }
    }

    configureAccessory(accessory) {
        this.log(`Loading cached accessory: ${accessory.displayName}`);
        this.accessories.set(accessory.UUID, accessory);
    }
}
