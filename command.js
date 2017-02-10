'use strict';

var spawn = require('child_process').spawn;
var conf = require('./configure');

function parseInfoObject(infoStr) {
  return {
    "SN": infoStr.match(/(R[0-9]{7})/)[1],
    "osVersion": infoStr.match(/Ruff Version: ([0-9]\.[0-9]\.[0-9])/)[1]
  }
}

function getRuffInfo(ruffIP, cb) {
  var p = spawn(conf['rap17'].sdk, ['system', 'info', ruffIP]);
  var infoStr = '';
  p.stdout.on('data', (chunk) => {
    infoStr += chunk.toString();
  });
  p.on('exit', (exitStatus, termSignal) => {
    if (exitStatus === 0) {
      var info = parseInfoObject(infoStr);
      info.IP = ruffIP;
      cb && cb(undefined, info);
    } else {
      var err = `get system info from ${ruffIP} fail.`;
      console.log(err);
      cb && cb(new Error(err));
    }
  });
}

function deployApp(appVersion, ruffIP, cb) {
  var sdk = conf[appVersion].sdk;
  var cwd = conf[appVersion].app;
  var p = spawn(sdk, ['deploy', ruffIP, '-s'], {
    cwd: cwd,
    stdio: ['inherit', 'inherit', 'inherit']
  });
  // p.stdout.on('data', (chunk) => {
  //   console.log(chunk.toString());
  // })
  p.on('exit', (exitStatus, termSignal) => {
    if (exitStatus === 0) {
      console.log(`deploy ${appVersion} to ${ruffIP} succeed.`);
      cb && cb(undefined);
    } else {
      var err = `deploy ${appVersion} to ${ruffIP} fail.`;
      console.log(err);
      cb && cb(new Error(err));
    }
  });
}

module.exports = {
  getRuffInfo: getRuffInfo,
  deployApp: deployApp
}

if (require.main === module) {
  deployApp('rap17',  '192.168.199.133');
}