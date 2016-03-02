require('./shared');

var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle_success = TestUtils.check_juttle_success;
var logger = require('juttle/lib/logger').getLogger('opentsdb-options');

describe('test options', function () {
    it('-from :0: is an acceptable query ', function() {
        return check_juttle_success({
            program: 'read opentsdb -from :0: -to :now: name = "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length.gt(2);
            result.sinks.table.forEach(function(metric) {
                expect(metric.name).to.equal(TestUtils.metric_name);
            });
        });
    });
    it('live', function() {
        this.timeout(15000);
        var numFuturePoints;

        return TestUtils.addFuturePoints()
        .then(function(num_future_points) {
            numFuturePoints = num_future_points;

            var wait = numFuturePoints * 1000 + 2000;
            logger.info('Performing live query, waiting ms:', wait);

            return check_juttle_success({
                program: `read opentsdb -from :now: -to :end: name = "${TestUtils.metric_name}"`,
                realtime: true
            }, wait);
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(numFuturePoints);
        });
    });
    it('live super query', function() {
        this.timeout(10000);
        var numFuturePoints;

        return TestUtils.addFuturePoints()
        .then(function(num_future_points) {
            numFuturePoints = num_future_points;

            var wait = numFuturePoints * 1000 + 2000;
            logger.info('Performing super live query, waiting ms:', wait);

            return check_juttle_success({
                program: `read opentsdb -from :-1m: -to :end: name = "${TestUtils.metric_name}"`,
                realtime: true
            }, wait);
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length.gt(numFuturePoints);
        });
    });
});
