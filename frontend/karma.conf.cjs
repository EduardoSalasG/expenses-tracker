const os = require('node:os');
const path = require('node:path');

const chromeProfileDir = path.join(os.tmpdir(), `expenses-tracker-karma-${process.pid}`);

module.exports = (config) => {
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    customLaunchers: {
      ChromeHeadlessStable: {
        base: 'ChromeHeadless',
        flags: [
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          `--user-data-dir=${chromeProfileDir}`,
          `--disk-cache-dir=${path.join(chromeProfileDir, 'cache')}`,
          `--gpu-cache-dir=${path.join(chromeProfileDir, 'gpu-cache')}`,
        ],
      },
    },
  });
};
