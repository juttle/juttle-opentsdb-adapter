var juttle_test_utils = require('juttle/test').utils;
var retry = require('bluebird-retry');
var check_juttle = juttle_test_utils.check_juttle;
var Promise = require('bluebird');
var expect = require('chai').expect;
var logger = require('juttle/lib/logger').getLogger('sql-test-util');

function randomInt() {
    return Math.floor((Math.random() * 100000) + 1);
}

var TestUtils = {
    init: function (config) {
        juttle_test_utils.configureAdapter({ opentsdb: config });
    },
    check_juttle: function(params, deactivateAfter) {
        return check_juttle(params, deactivateAfter);
    },
    check_juttle_success: function(params, deactivateAfter) {
        return check_juttle(params, deactivateAfter)
        .then(function(res) {
            expect(res.errors[0]).to.equal(undefined);
            expect(res.warnings[0]).to.equal(undefined);
            return res;
        });
    },
    check_juttle_error: function(params, deactivateAfter) {
        return check_juttle(params, deactivateAfter)
        .then(function(res) {
            throw new Error('This error should never occur');
        });
    },
    getTestMetricName: function() {
        return this.metric_name;
    },
    loadSampleData: function (config) {
        var self = this;

        this.metric_name = 'test.unit.' + Math.random().toString(36).slice(2,10);
        logger.info('Metric name used for testing: ', this.metric_name);

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
    addFuturePoints: function() {
        var self = this;

        var futurePointJuttles = [
            `emit -limit 1 | put general = "here", name = "${this.metric_name}", value = ${randomInt()}, time = (:now: + :2s:) | write opentsdb`,
            `emit -limit 1 | put general = "here", name = "${this.metric_name}", value = ${randomInt()}, time = (:now: + :3s:) | write opentsdb`
        ];

        return Promise.map(futurePointJuttles, function(juttle) {
            return self.check_juttle({ program: juttle });
        })
        .then(() => futurePointJuttles.length);
    },
    expectMetricsWritten: function(writeResult, metric_name, numberOfMetricsExpected) {
        numberOfMetricsExpected = numberOfMetricsExpected || 1;

        expect(writeResult.errors[0]).equals(undefined);
        expect(writeResult.warnings[0]).equals(undefined);
        expect(writeResult.sinks).to.not.include.keys('table', 'logger');

        return retry(function() {
            return check_juttle({
                program: `read opentsdb -from :30 minutes ago: name = "${metric_name}"`
            }).then(function(result) {
                expect(result.errors[0]).equals(undefined);
                expect(result.warnings[0]).equals(undefined);
                expect(result.sinks.table).to.have.length.gte(numberOfMetricsExpected);

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
