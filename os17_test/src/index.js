'use strict';


$.ready(function (error) {
    if (error) {
        console.log(error);
        return;
    }

    var on = false;
    setInterval(function() {
        $('#led-g')[on ? 'turnOff' : 'turnOn']();
        console.log('led toggle');
        on = ! on;
    }, 500);
});

$.end(function () {
    $('#led-g').turnOff();
});
