const axios = require('axios');

class WirelessTagsAPI {
    constructor(token) {
        this.token = token;
        this.url = "https://www.mytaglist.com/ethClient.asmx/GetTagList";
    }

    fetchTagList(macAddress) {
        const headers = {
            "Authorization": `Bearer ${this.token}`,
            "Content-Type": "application/json",
            "X-Set-Mac": macAddress,
        };

        return axios
            .post(this.url, {}, { headers })
            .then((response) => response.data.d)
            .catch((error) => {
                throw new Error(`Failed to fetch tags: ${error.message}`);
            });
    }
}

module.exports = WirelessTagsAPI;
