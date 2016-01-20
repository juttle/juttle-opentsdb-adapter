var juttle_test_utils = require('juttle/test/runtime/specs/juttle-test-utils');
var retry = require('bluebird-retry');
var check_juttle = juttle_test_utils.check_juttle;
var Juttle = require('juttle/lib/runtime').Juttle;
var OpenTSDB = require('../');
var Promise = require('bluebird');
var expect = require('chai').expect;

function randomInt() {
    return Math.floor((Math.random() * 100000) + 1);
}

var TestUtils = {
    init: function (config) {
        var adapter = OpenTSDB(config);
        Juttle.adapters.register(adapter.name, adapter);
    },
    check_juttle: function(params) {
        return check_juttle(params);
    },
    getTestMetricName: function() {
        return this.metric_name;
    },
    loadSampleData: function (config) {
        var self = this;

        this.metric_name = 'test.unit.' + Math.random().toString(36).slice(2,10);

        var insertJuttles = [
            `emit -limit 1 | put general = "here", name = "${this.metric_name}", value = ${randomInt()} | write opentsdb`,
            `emit -limit 1 | put general = "here", host = "123", name = "${this.metric_name}", value = ${randomInt()} | write opentsdb`,
            `emit -limit 1 | put general = "here", host = "123", name = "${this.metric_name}", value = ${randomInt()} | write opentsdb`,
            `emit -limit 1 | put general = "here", host = "456", special = "234", name = "${this.metric_name}", value = ${randomInt()} | write opentsdb`
        ];

        return Promise.each(insertJuttles, function(juttle) {
            return self.check_juttle({ program: juttle });
        })
        .then(function() {
            return self.expectMetricsExist(insertJuttles.length);
        });
    },
    expectMetricsExist: function(numberOfMetrics) {
        var self = this;

        numberOfMetrics = numberOfMetrics || 1;

        return retry(function() {
            return self.check_juttle({
                program: 'read opentsdb -from :30 minutes ago: -name "' + self.metric_name + '"'
            }).then(function(result) {
                expect(result.sinks.table).to.have.length(numberOfMetrics);
            });
        }, {
            interval: 1000,
            timeout: 10000
        });
    }
};

module.exports = TestUtils;
