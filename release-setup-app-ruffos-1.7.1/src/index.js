'use strict';

var fs = require('fs');
var spawn = require('child_process').spawn;

var host_ip = '192.168.199.136:3000';

var defineVars = {
    uboot_size: 101580, // release uboot.img size
    uboot_url: "http://" + host_ip + "/images/uboot-release-20160411.img",
    uboot_md5: "bc2fda1408d33a4eaa9a159f52f5bd81",
    os_url: "http://" + host_ip + "/images/ruffos-1.7.0.bin",
    os_md5: "1c042a0ba71a8671d2ce863449139096",
    os_build_time: "Thu Jan 12 09:30:51 CST 2017"
};

var osBuildRegexp = new RegExp(defineVars.os_build_time);

function _getContents(filename) {
    return fs.readFileSync(filename)
}

function _writeContents(fileName, buffer) {
    fs.writeFileSync(fileName, buffer.toString());
}

function getMd5FromMd5sumFile(filename) {
    var cnt = _getContents(filename);
    return cnt.toString().replace(/\s[\s\S]*/, '').toLowerCase();
}

function checkUbootMd5(cb) {
    var cp = spawn('dd', ['if=/dev/mtd0', 'bs=64k', 'count=3', 'of=/tmp/mtd0.bin'], {
        cwd: '/tmp'
    });
    cp.on('exit', function (exitstatus, termSignal) {
        console.log("dd mtd0 done, exitstatus[" + exitstatus + "]");
        if (exitstatus === 0) {
            var buffer = _getContents('/tmp/mtd0.bin').slice(0, defineVars.uboot_size);
            _writeContents('/tmp/mtd0.size.fixed.bin', buffer);
            var ccp = spawn('md5sum', ['/tmp/mtd0.size.fixed.bin'], {
                cwd: '/tmp'
            });
            var md5Result = ''
            ccp.stdout.on('data', function (chunk) {
                md5Result += chunk.toString();
            })
            ccp.on('exit', function (exitstatus, termSignal) {
                if (exitstatus === 0) {
                    var md5 = md5Result.trim().split(/\s/)[0];
                    if (md5 === defineVars.uboot_md5) {
                        console.log("current uboot same.");
                    } else {
                        console.log("current uboot not same.");
                    }
                    cb(null, md5 === defineVars.uboot_md5);
                } else {
                    var err = new Error("md5sum mtd0 exitstatus is " + exitstatus);
                    cb(err);
                }
            });
        } else {
            var err = new Error("dd exitstatus is " + exitstatus);
            cb(err);
        }
    });
}

function getUboot(cb) {
    var cp = spawn('wget', [defineVars.uboot_url, '-O', '/tmp/uboot.img'], {
        cwd: '/tmp'
    });
    cp.on('exit', function (exitstatus, termSignal) {
        var err = null;
        if (exitstatus === 0) {
            var ccp = spawn('md5sum', ['/tmp/uboot.img'], {
                cwd: '/tmp'
            });
            var md5Result = '';
            ccp.stdout.on('data', function(chunk) {
                md5Result += chunk.toString();
            })
            ccp.on('exit', function (exitstatus, termSignal) {
                var err = null;
                if (exitstatus === 0) {
                    var md5 = md5Result.trim().split(/\s/)[0];
                    if (md5 === defineVars.uboot_md5) {
                        console.log("uboot image download ok.");
                        doFlashUboot(cb);
                    } else {
                        err = new Error("host uboot image md5[" + md5 + "] not same as defineVars.uboot_md5[" + defineVars.uboot_md5 + "]");
                        cb(err);
                    }
                } else {
                    err = new Error("get uboot image md5 error");
                    cb(err);
                }
            });
        } else {
            err = new Error("get uboot image exitstatus is " + exitstatus);
            cb(err);
        }
    });
}

function getOs(cb) {
    var cp = spawn('wget', [defineVars.os_url, '-O', '/tmp/os.bin'], {
        cwd: '/tmp'
    });
    cp.on('exit', function (exitstatus, termSignal) {
        var err = null;
        if (exitstatus === 0) {
            var ccp = spawn('md5sum', ['/tmp/os.bin'], {
                cwd: '/tmp'
            });
            var md5Result = '';
            ccp.stdout.on('data', function (chunk) {
                md5Result += chunk.toString();
            })
            ccp.on('exit', function (exitstatus, termSignal) {
                var err = null;
                if (exitstatus == 0) {
                    var md5 = md5Result.trim().split(/\s/)[0];
                    if (md5 === defineVars.os_md5) {
                        console.log("os image download ok.");
                        doFlashOs(cb);
                    } else {
                        err = new Error("host os image md5[" + md5 + "] not same as defineVars.os_md5[" + defineVars.os_md5 + "]");
                        cb(err);
                    }
                } else {
                    err = new Error("get os image md5 error");
                    cb(err);
                }
            });
        } else {
            err = new Error("get os image exitstatus is " + exitstatus);
            cb(err);
        }
    });
}

function doFlashUboot(cb) {
    var cp = spawn('mtd', ['write', '/tmp/uboot.img', 'uboot'], {
        cwd: '/'
    });
    cp.on('exit', function (exitstatus, termSignal) {
        if (exitstatus === 0) {
            console.log("flashing uboot done.");
            cb(null);
        } else {
            console.log("flashing uboot failed.");
            cb(new Error("flashing uboot failed."));
        }
    });
}

function doFlashOs(cb) {
    var cp = spawn('mtd', ['write', '/tmp/os.bin', 'firmware'], {
        cwd: '/'
    });
    cp.on('exit', function (exitstatus, termSignal) {
        if (exitstatus === 0) {
            console.log("flashing os done, rebooting in 5s.");
            setTimeout(function () {
                doReboot(function () {});
            }, 5 * 1000);
            cb(null);
        } else {
            console.log("flashing os failed.");
            cb(new Error("flashing uboot failed."));
        }
    });
}

function doReboot(cb) {
    spawn('reboot');
}

function doReset(cb) {
    var cp = spawn('jffs2reset', ['-y'], {
        cwd: '/'
    });
    cp.on('exit', function (exitstatus, termSignal) {
        if (exitstatus === 0) {
            doReboot(function () {});
            cb(null)
        } else {
            console.log("reset failed.");
            cb(new Error("reset failed."));
        }
    });
}

function getBlinkTimer(leds, deley) {
    return (function () {
        var i = 0;
        return setInterval(function () {
            if (i = !i) {
                leds.forEach(function (led) {
                    led.turnOn();
                });
            } else {
                leds.forEach(function (led) {
                    led.turnOff();
                });
            }
        }, deley);
    })();
}

function checkOsVersion(cb) {
    var osVersion = _getContents('/proc/version').toString();
    console.log("current os version[" + osVersion + "], expect[" + defineVars.os_build_time + "].");

    if (osVersion.match(osBuildRegexp)) {
        console.log("current os same.")
        cb(null, true);
    } else {
        console.log("current os not same.")
        cb(null, false);
    }
}

var ubootStatusTimer;
var osStatusTimer;
var ubootOk = false;
var osOk = false;

$.ready(function (error) {

    checkUbootMd5(function (err, latest) {
        if (err) {
            console.log(err);
            return false;
        }
        if (latest) {
            console.log("flash uboot skip.");
            ubootOk = true;
        } else {
            console.log("flash uboot need.");
            ubootStatusTimer = getBlinkTimer([$('#led-r')], 100 * 1);
            getUboot(function (err) {
                clearInterval(ubootStatusTimer);
                $('#led-r').turnOff();
                if (err) {
                    console.log("flash uboot err[" + err + "].");
                    return false;
                }
                ubootOk = true;
            });
        }
    });

    checkOsVersion(function (err, latest) {
        if (err) {
            console.log(err);
            return false;
        }
        if (latest) {
            console.log("flash os skip.");
            osOk = true;
        } else {
            console.log("flash os need.");
            osStatusTimer = getBlinkTimer([$('#led-b')], 100 * 1);
            getOs(function (err) {
                clearInterval(osStatusTimer);
                $('#led-b').turnOff();
                if (err) {
                    console.log("flash os err[" + err + "].");
                    return false;
                }
                osOk = true;
            });
        }
    });

    var checkTimer = setInterval(function () {
        if (ubootOk && osOk) {
            clearInterval(checkTimer);
            getBlinkTimer([$('#led-g')], 500);
        }
    }, 1000);

});

$.end(function () {
    $('#led-b').turnOff();
    $('#led-g').turnOff();
    $('#led-r').turnOff();
});