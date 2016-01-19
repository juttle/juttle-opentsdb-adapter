var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle = TestUtils.check_juttle;

describe('test options', function () {

    it('-debug and -name', function() {
        return check_juttle({
            program: 'read opentsdb -debug true -from :30 minutes ago: -name "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);

            expect(result.sinks.table).to.have.length(1);
            expect(result.sinks.table[0].url).to.contain(TestUtils.metric_name);
        });
    });
    it('-name and -from indicated', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length.gt(2);
            result.sinks.table.forEach(function(metric) {
                expect(metric.name).to.equal(TestUtils.metric_name);
            });
        });
    });
});
