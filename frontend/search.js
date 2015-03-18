var hashtrack = require('hashtrack');
var service = require('./models/service');
var servicetype = require('./models/servicetype');
var search_control_template = require('./templates/_search_controls.hbs');
var Backbone = require('backbone');


var query = "";
hashtrack.onhashvarchange('q', function(_, value) {
    query = value;
    $('#page').trigger('search', value)
})
hashtrack.onhashvarchange('t', function(_, value) {
    query = value;
    $('#page').trigger('search', value)
})

var SearchControls = Backbone.View.extend({
    initialize: function(opts) {
        this.$el = opts.$el;
    },
    render: function() {
        var $el = this.$el;
        var html = search_control_template({
            query: hashtrack.getVar('q'),
        });
        $el.html(html);
        $el.i18n();

        search.populateServiceTypeDropdown();
    },

    events: {
        "click [name=map-toggle-list]": function() {
            hashtrack.setPath('/search');
        },
        "click [name=map-toggle-map]": function() {
            hashtrack.setPath('/search/map');
        },
    },
});

module.exports = {
    services: new service.PublicServices(),
    servicetypes: new servicetype.ServiceTypes(),
    SearchControls: SearchControls,

    populateServiceTypeDropdown: function() {
        var servicetypes = this.servicetypes;
        var $select = $('select.query-service-type');

        servicetypes.fetch().then(function() {
            $select.find('.loading').hide();
            $select.find('.type-header').show();
            $.each(servicetypes.models, function() {
                var d = this.data();
                $select.append('<option value="'+d.number +'">'+d.name+'</option>')
            })
            var t = hashtrack.getVar('t');
            if (t) {
                $select.val(t);
            }
        });
    },

    refetchServices: function() {
        var query = hashtrack.getVar('q');
        var type = hashtrack.getVar('t');
        var params = {
            search: query,
            type_numbers: type,
        };
        var services = this.services;

        return new Promise(function(onresolve, onerror) {
            var fetchp = services.fetch({data: params});
            fetchp.then(
                function() {
                    var days = [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                    ];
                    var today = days[new Date().getDay()];
                    var todaylc = today.toLowerCase();
                    services.models.forEach(function(service) {
                        var open = service.get(todaylc + '_open');
                        var close = service.get(todaylc + '_close');
                        if (open && close) {
                            service.set("today_open", open);
                            service.set("today_close", close);
                        }
                    });
                    onresolve(fetchp);
                },
                onerror
            );
        });
    },
};
