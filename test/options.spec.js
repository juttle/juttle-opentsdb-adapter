require('./shared');

var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle_success = TestUtils.check_juttle_success;

describe('test options', function () {
    it('-debug', function() {
        return check_juttle_success({
            program: 'read opentsdb -debug true -from :30 minutes ago: name = "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(1);
            expect(result.sinks.table[0].url).to.contain(TestUtils.metric_name);
        });
    });
    it('-from indicated', function() {
        return check_juttle_success({
            program: 'read opentsdb -from :30 minutes ago: name = "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length.gt(2);
            result.sinks.table.forEach(function(metric) {
                expect(metric.name).to.equal(TestUtils.metric_name);
            });
        });
    });
});
