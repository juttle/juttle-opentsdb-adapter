require('./shared');

var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle_success = TestUtils.check_juttle_success;
var check_juttle_error = TestUtils.check_juttle_error;

describe('test options', function () {

    it('-debug and -name', function() {
        return check_juttle_success({
            program: 'read opentsdb -debug true -from :30 minutes ago: -name "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(1);
            expect(result.sinks.table[0].url).to.contain(TestUtils.metric_name);
        });
    });
    it('-name and -from indicated', function() {
        return check_juttle_success({
            program: 'read opentsdb -from :30 minutes ago: -name "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length.gt(2);
            result.sinks.table.forEach(function(metric) {
                expect(metric.name).to.equal(TestUtils.metric_name);
            });
        });
    });
    it('no -name indicated', function() {
        return check_juttle_error({
            program: 'read opentsdb -from :30 minutes ago:'
        })
        .catch(function(err) {
            expect(err.message).to.contain('required option name');
        });
    });
});
