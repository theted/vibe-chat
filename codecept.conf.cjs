const path = require("path");

exports.config = {
  tests: "./tests/e2e/**/*_test.js",
  output: "./tests/e2e/output",
  helpers: {
    Playwright: {
      url: process.env.CODECEPT_BASE_URL || "http://localhost:3000",
      show: false,
      browser: "chromium",
      waitForNavigation: "networkidle0",
      waitForTimeout: 10000,
      waitForAction: 500,
    },
  },
  include: {},
  plugins: {
    retryFailedStep: {
      enabled: true,
    },
    tryTo: {
      enabled: true,
    },
    screenshotOnFail: {
      enabled: true,
    },
  },
  mocha: {
    reporterOptions: {
      reportDir: path.resolve(__dirname, "./tests/e2e/output"),
    },
  },
  name: "vibe-chat",
};
