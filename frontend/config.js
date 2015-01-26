var config = {
    api_location: "//localhost:8000",
};

module.exports = {
    get: function(k) { return config[k]; },
    set: function(k, v) {
        config[k] = v;
        if (k.indexOf('forever.') === 0) {
            console.log(k, v);
            localStorage[k] = v;
        }
    },
}

var $ = require('jquery');
$(function($){
    $.getJSON('/config.json', function(data) {
        $.extend(config, data);
        for (var k in localStorage) {
            if (localStorage.hasOwnProperty(k)) {
                config[k] = localStorage[k];
            }
        }
    });
});
