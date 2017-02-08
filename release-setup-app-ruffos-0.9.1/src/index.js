'use strict';

var host_ip = '192.168.199.136:3000';

var defineVars = {
    uboot_size : 101580, // release uboot.img size
    uboot_url : "http://" + host_ip + "/images/uboot-release-20160411.img",
    uboot_md5 : "bc2fda1408d33a4eaa9a159f52f5bd81",
    os_url : "http://" + host_ip + "/images/ruffos-1.7.0.bin",
    os_md5 : "1c042a0ba71a8671d2ce863449139096",
    os_build_time : "Thu Jan 12 09:30:51 CST 2017"
};

var osBuildRegexp = new RegExp( defineVars.os_build_time );

function _getContents( filename, size ) {
    var handle = uv.fs_open( filename, 'r', parseInt( '0666', 8 ) );
    var buffer = uv.fs_read( handle, size ? size : uv.fs_stat( filename ).size, 0 );
    uv.fs_close( handle );
    return new Buffer( buffer );
}

function _writeContents( fileName, buffer ) {
    var handle = uv.fs_open( fileName, 'w', parseInt( '0666', 8 ) );
    var ret = uv.fs_write( handle, buffer.toString(), 0 );
    uv.fs_close( handle );
    return ret;
}

function getMd5FromMd5sumFile( filename ) {
    var cnt = _getContents( filename );
    return cnt.toString().replace( /\s[\s\S]*/, '' ).toLowerCase();
}

function checkUbootMd5( cb ) {
    uv.spawn( 'sh', ['-c', 'dd if=/dev/mtd0 bs=64k count=3 of=/tmp/mtd0.bin'], '/tmp', 0, 1, 2, function ( exitstatus, termSignal ) {
        console.log( "dd mtd0 done, exitstatus[" + exitstatus + "]" );
        if ( exitstatus === 0 ) {
            var buffer = _getContents( '/tmp/mtd0.bin' ).slice( 0, defineVars.uboot_size );
            _writeContents( '/tmp/mtd0.size.fixed.bin', buffer );
            uv.spawn( 'sh', ['-c', 'md5sum /tmp/mtd0.size.fixed.bin>/tmp/mtd0.size.fixed.bin.md5'], '/tmp', 0, 1, 2, function ( exitstatus, termSignal ) {
                if ( exitstatus === 0 ) {
                    var md5 = getMd5FromMd5sumFile( "/tmp/mtd0.size.fixed.bin.md5" )
                    if ( md5 === defineVars.uboot_md5 ) {
                        console.log( "current uboot same." );
                    } else {
                        console.log( "current uboot not same." );
                    }
                    cb( null, md5 === defineVars.uboot_md5 );
                } else {
                    var err = new Error( "md5sum mtd0 exitstatus is " + exitstatus );
                    cb( err );
                }
            } );
        } else {
            var err = new Error( "dd exitstatus is " + exitstatus );
            cb( err );
        }
    } );
}

function flashUboot( cb ) {
    uv.spawn( 'sh', ['-c', 'wget "' + defineVars.uboot_url + '" -O /tmp/uboot.img && md5sum /tmp/uboot.img>/tmp/uboot.img.md5'], '/tmp', 0, 1, 2, function ( exitstatus, termSignal ) {
        var err = null;
        if ( exitstatus === 0 ) {
            var md5 = getMd5FromMd5sumFile( "/tmp/uboot.img.md5" );
            if ( md5 === defineVars.uboot_md5 ) {
                console.log( "uboot image download ok." );
                doFlashUboot( cb );
            } else {
                err = new Error( "host uboot image md5[" + md5 + "] not same as defineVars.uboot_md5[" + defineVars.uboot_md5 + "]" );
                cb( err );
            }
        } else {
            err = new Error( "get uboot image exitstatus is " + exitstatus );
            cb( err );
        }
    } );
}

function flashOs( cb ) {
    uv.spawn( 'sh', ['-c', 'wget "' + defineVars.os_url + '" -O /tmp/os.bin && md5sum /tmp/os.bin>/tmp/os.bin.md5'], '/tmp', 0, 1, 2, function ( exitstatus, termSignal ) {
        var err = null;
        if ( exitstatus == 0 ) {
            var md5 = getMd5FromMd5sumFile( "/tmp/os.bin.md5" );
            if ( md5 === defineVars.os_md5 ) {
                console.log( "os image download ok." );
                doFlashOs( cb );
            } else {
                err = new Error( "host os image md5[" + md5 + "] not same as defineVars.os_md5[" + defineVars.os_md5 + "]" );
                cb( err );
            }
        } else {
            err = new Error( "get os image exitstatus is " + exitstatus );
            cb( err );
        }
    } );
}

function doFlashUboot( cb ) {
    uv.spawn( 'mtd', ['write', '/tmp/uboot.img', 'uboot'], '/', 0, 1, 2, function ( exitstatus, termSignal ) {
        if ( exitstatus === 0 ) {
            console.log( "flashing uboot done." );
            cb( null );
        } else {
            console.log( "flashing uboot failed.");
            cb( new Error( "flashing uboot failed."  ) );
        }
    } );
}

function doFlashOs( cb ) {
    uv.spawn( 'mtd', ['write', '/tmp/os.bin', 'firmware'], '/', 0, 1, 2, function ( exitstatus, termSignal ) {
        if ( exitstatus === 0 ) {
            console.log( "flashing os done." );
            //console.log( "flashing os done, rebooting in 20s." );
            //setTimeout( function () {
            //    doReboot( function () {
            //    } );
            //}, 20 * 1000 );
            cb( null );
        } else {
            console.log( "flashing os failed." );
            cb( new Error( "flashing uboot failed." ) );
        }
    } );
}

function doReboot( cb ) {
    uv.spawn( 'reboot', [], '/', 0, 1, 2, function () {
        cb( null );
    } );
}

function doReset( cb ) {
    uv.spawn( 'jffs2reset', ['-y'], '/', 0, 1, 2, function ( exitstatus, termSignal ) {
        if ( exitstatus === 0 ) {
            doReboot( function () {
            } );
            cb( null )
        } else {
            console.log( "reset failed." );
            cb( new Error( "reset failed." ) );
        }
    } );
}

function getBlinkTimer( leds, deley ) {
    return (function () {
        var i = 0;
        return setInterval( function () {
            if ( i = !i ) {
                leds.forEach( function ( led ) {
                    led.turnOn();
                } );
            } else {
                leds.forEach( function ( led ) {
                    led.turnOff();
                } );
            }
        }, deley );
    })();
}

function checkOsVersion( cb ) {
    var osVersion = _getContents( '/proc/version', 1024 ).toString();
    console.log( "current os version[" + osVersion + "], expect[" + defineVars.os_build_time + "]." );

    if ( osVersion.match( osBuildRegexp ) ) {
        cb( null, true );
    } else {
        cb( null, false );
    }
}

var ubootStatusTimer;
var osStatusTimer;
var ubootOk = false;
var osOk = false;

$.ready( function ( error ) {

    checkUbootMd5( function ( err, latest ) {
        if ( err ) {
            console.log( err );
            return false;
        }
        if ( !latest ) {
            console.log( "flash uboot need." );
            ubootStatusTimer = getBlinkTimer( [$( '#led-r' )], 100 * 1 );
            flashUboot( function ( err ) {
                clearInterval( ubootStatusTimer );
                $( '#led-r' ).turnOff();
                if ( err ) {
                    console.log( "flash uboot err[" + err + "]." );
                    return false;
                }
                ubootOk = true;
            } );
        } else {
            console.log( "flash uboot skip." );
            ubootOk = true;
        }
    } );

    // checkOsVersion( function ( err, latest ) {
    //     if ( latest ) {
    //         console.log( "flash os skip." );
    //         osOk = true;
    //     } else {
    //         console.log( "flash os need." );
    //         osStatusTimer = getBlinkTimer( [$( '#led-b' )], 100 * 1 );
    //         flashOs( function ( err ) {
    //             clearInterval( osStatusTimer );
    //             $( '#led-b' ).turnOff();
    //             if ( err ) {
    //                 console.log( err );
    //                 return false;
    //             }
    //             osOk = true;
    //         } );
    //     }
    // } );

    var checkTimer = setInterval( function () {
        if ( ubootOk && osOk ) {
            clearInterval( checkTimer );
            getBlinkTimer( [$( '#led-g' )], 1000 );
        }
    }, 1000 );

} );

$.end( function () {
    $( '#led-b' ).turnOff();
    $( '#led-g' ).turnOff();
    $( '#led-r' ).turnOff();
} );
