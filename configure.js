'use strict';

var join = require('path').join;

module.exports = {
  "port": 3000,
  "netSegment": "192.168.199",
  "scanInterval": 10 * 1000,
  "rap11": {
    "sdk": join(__dirname, '/sdk/ruff-sdk-mac-1.1.0/bin/rap'),
    "app": join(__dirname, '/release-setup-app-ruffos-1.1.0')
  },
  "rap17": {
    "sdk": join(__dirname, '/sdk/ruff-sdk-mac-1.7.1/bin/rap'),
    "app": join(__dirname, '/release-setup-app-ruffos-1.7.1')
  },
  "shell": "/bin/zsh"
}

