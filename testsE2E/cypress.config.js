const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1366,
    viewportHeight: 768,
    video: false,
    setupNodeEvents(on, config) {},
  },
});
