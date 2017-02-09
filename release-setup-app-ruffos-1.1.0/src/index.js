'use strict';

var host_ip = '192.168.199.136:3000';

var defineVars = {
    os_url : "http://" + host_ip + "/images/ruffos-ubootable.bin",
    os_md5 : "39e2d5500a1332306407ce92e3de365c",
    os_build_time : "Wed Feb 8 16:15:08 CST 2017"
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

function doFlashOs( cb ) {
    uv.spawn( 'mtd', ['write', '/tmp/os.bin', 'firmware'], '/', 0, 1, 2, function ( exitstatus, termSignal ) {
        if ( exitstatus === 0 ) {
            console.log( "flashing os done, rebooting in 5s." );
            setTimeout( function () {
               doReboot( function () {
               } );
            }, 5 * 1000 );
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
    console.log( "current os version[" + osVersion + "],\n expect[" + defineVars.os_build_time + "]." );

    if ( osVersion.match( osBuildRegexp ) ) {
        cb( null, true );
    } else {
        cb( null, false );
    }
}

var osStatusTimer;
var osOk = false;

$.ready( function ( error ) {
    checkOsVersion( function ( err, latest ) {
        if ( latest ) {
            console.log( "flash os skip." );
            osOk = true;
        } else {
            console.log( "flash os need." );
            osStatusTimer = getBlinkTimer( [$( '#led-b' )], 100 * 1 );
            flashOs( function ( err ) {
                clearInterval( osStatusTimer );
                $( '#led-b' ).turnOn();
                if ( err ) {
                    console.log( err );
                    return false;
                }
                osOk = true;
            } );
        }
    } );

    var checkTimer = setInterval( function () {
        if ( osOk ) {
            clearInterval( checkTimer );
            getBlinkTimer( [$( '#led-g' )], 100 );
        }
    }, 1000 );

} );

$.end( function () {
    $( '#led-b' ).turnOff();
    $( '#led-g' ).turnOff();
    $( '#led-r' ).turnOff();
} );
