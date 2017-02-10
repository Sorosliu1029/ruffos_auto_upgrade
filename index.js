'use strict';

var util = require('util');

var sever = require('./server');
var cmd = require('./command');
var host = require('./host');
var conf = require('./configure');

const INIT = 'init',
  OLD_DEPLOYING = 'rap11Deploying',
  NEW_DEPLOYING = 'rap17Deploying',
  SUCCESS = 'upgradeSuccess';

var states = [INIT, OLD_DEPLOYING, NEW_DEPLOYING, SUCCESS];
var ruffList = {};

function changeRuffUboot(info) {
  cmd.deployApp('rap11', info.IP, (err) => {
    if (err) {
      console.log(err);
      return;
    }
    ruffList[info.SN].state = transferState(ruffList[info.SN].state);
  });
}

function changeRuffOs(info) {
  cmd.deployApp('rap17', info.IP, (err) => {
    if (err) {
      console.log(err);
      return;
    }
    ruffList[info.SN].state = transferState(ruffList[info.SN].state);
  });
}

function success(info) {
  console.log(`Ruff ${info.SN} upgraded to OS${info.osVersion}.`);
  ruffList[info.SN].state = transferState(ruffList[info.SN].state);
}

function transferState(state) {
  return states[states.indexOf(state) + 1];
}

var scanTimer = setInterval(() => {
    host.getAllConnectionIP((err, IPs) => {
      if (err) {
        console.log(err);
        return;
      }
      IPs.forEach((ruffIP) => {
        cmd.getRuffInfo(ruffIP, (err, info) => {
          if (err) {
            console.log(err);
            return;
          }
          console.log(util.inspect(info));
          var sn = info.SN;
          if (!ruffList[sn]) {
            ruffList[sn] = {
              'state': INIT,
              'os': info.osVersion
            }
          }

          console.log(ruffList[sn]);
          if (info.osVersion === '1.1.0') {
            if (ruffList[sn].state === 'init') {
              changeRuffUboot(info);
            }
          } else if (info.osVersion === '1.7.1') {
            if (ruffList[sn].os === '1.1.0') {
              if (ruffList[sn].state === OLD_DEPLOYING) {
                ruffList[sn].os = info.osVersion;
                changeRuffOs(info);
              }
            }
          } else {
            success(info);
          }
        });
      });
    });
  },
  conf.scanInterval);