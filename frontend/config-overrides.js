const path = require("path");

module.exports = function override(config) {
    console.log("WIDGET BUILD:", process.env.REACT_APP_WIDGET);

    if (process.env.REACT_APP_WIDGET === "true") {
        console.log("USING WIDGET ENTRY");

        config.entry = path.resolve(__dirname, "src/widget.js");
    }

    return config;
};