var expect = require('chai').expect;
var TestUtils = require("./utils");
var retry = require('bluebird-retry');
var check_juttle = TestUtils.check_juttle;

describe('write proc', function () {
    it('write points', function() {
        var metric_name = 'test.unit.' + Math.random().toString(36).slice(2,7);

        return check_juttle({
            program: `emit -limit 1 | put t = "temp", value = 123, name = "${metric_name}" | write opentsdb`
        })
        .then(function(result) {
            expect(result.errors[0]).equals(undefined);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks).to.not.include.keys('table', 'logger');
        })
        .then(function() {
            retry(function() {
                return check_juttle({
                    program: `read opentsdb -from :30 minutes ago: -name "${metric_name}"`
                }).then(function(result) {
                    expect(result.errors).to.have.length(0);
                    expect(result.warnings).to.have.length(0);
                    expect(result.sinks.table).to.have.length.gt(0);

                    var pt = result.sinks.table[0];

                    expect(pt.t).equals('temp');

                    var pt_time = Date.parse(pt.time);
                    expect(isNaN(pt_time)).to.be.false;

                    //test if date makes sense.
                    var today = new Date();
                    var yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    expect(pt_time).gt(Date.parse(yesterday));
                });
            }, {
                interval: 500,
                timeout: 10000
            });
        });
    });
    it('write proc valueless point', function() {
        var metric_name = 'test.unit.' + Math.random().toString(36).slice(2,7);

        return check_juttle({
            program: `emit -limit 1 | put t = "temp", name = "${metric_name}"  | write opentsdb`
        })
        .then(function(result) {
            expect(result.errors[0]).equals(undefined);
            expect(result.warnings[0]).to.contain("without metric value");
        });
    });
});
