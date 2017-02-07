'use strict';

var os = require('os');

var ifaces = os.networkInterfaces();
var lanIP;

function getLanIP(cb) {
  try {
    Object.keys(ifaces).forEach(function (ifname) {
      ifaces[ifname].forEach(function (iface) {
        if (iface.family === 'IPv4' && iface.internal === false) {
          // console.log('host ip address:', iface.address);
          if (iface.address.startsWith('192.168')) {
            lanIP = iface.address;
            cb(null, lanIP);
          }
        }
      });
    });
  } catch (err) {
    cb(err);
  }
}

module.exports = {
  getLanIP : getLanIP
}

if (require.main === module) {
  getLanIP(function(err, lanIP) {
    console.log('Get lan IP:', lanIP);
  });
}