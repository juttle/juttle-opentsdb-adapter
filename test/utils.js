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

        return Promise.mapSeries(insertJuttles, function(juttle) {
            return self.check_juttle({ program: juttle });
        })
        .then(function(writeResults) {
            return self.expectMetricsWritten(writeResults[0], self.metric_name, insertJuttles.length);
        });
    },
    expectMetricsWritten: function(writeResult, metric_name, numberOfMetricsExpected) {
        numberOfMetricsExpected = numberOfMetricsExpected || 1;

        expect(writeResult.errors[0]).equals(undefined);
        expect(writeResult.warnings).to.have.length(0);
        expect(writeResult.sinks).to.not.include.keys('table', 'logger');

        return retry(function() {
            return check_juttle({
                program: `read opentsdb -from :30 minutes ago: -name "${metric_name}"`
            }).then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(0);
                expect(result.sinks.table).to.have.length.gt(0);

                var pt = result.sinks.table[0];
                var pt_time = Date.parse(pt.time);
                expect(isNaN(pt_time)).to.be.false;

                //test if date makes sense.
                var today = new Date();
                var yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                expect(pt_time).gt(Date.parse(yesterday));

                return result;
            });
        }, {
            interval: 300,
            timeout: 10000
        });
    }
};

module.exports = TestUtils;
