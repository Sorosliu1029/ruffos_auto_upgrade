'use strict';

var os = require('os');
var assert = require('assert');
var child_process = require('child_process');

var netSegment = require('./configure').netSegment;
var ifaces = os.networkInterfaces();
var lanIP;
var ipReg = new RegExp('([0-9]{1,3}\.){3}[0-9]{1,3}', 'g');

function getLanIP(cb) {
  try {
    Object.keys(ifaces).forEach((ifname) => {
      ifaces[ifname].forEach((iface) => {
        if (iface.family === 'IPv4' && iface.internal === false) {
          if (iface.address.startsWith(netSegment)) {
            lanIP = iface.address;
            cb && cb(null, lanIP);
          }
        }
      });
    });
  } catch (err) {
    cb(err);
  }
}

function getAllConnectionIP(cb) {
  if (!lanIP) {
    getLanIP();
  }
  var netSegment = lanIP.slice(0, lanIP.lastIndexOf('.'));
  var routerIP = netSegment + '.1';
  var ips;
  child_process.exec(`nmap -sn -n ${netSegment}.0/24 --open -oG - | grep Up`, (err, stdout, stderr) => {
    ips = stdout.toString().replace(lanIP, '').replace(routerIP, '').match(ipReg);
    if (!ips) {
      ips = [];
    }
    console.log('Get all Ruff IPs:', ips);
    cb && cb(undefined, ips);
  });
}

module.exports = {
  getLanIP: getLanIP,
  getAllConnectionIP: getAllConnectionIP
}

if (require.main === module) {
  getLanIP((err, lanIP) => {
    console.log('Get LAN IP:', lanIP);
  });
  getAllConnectionIP();
}