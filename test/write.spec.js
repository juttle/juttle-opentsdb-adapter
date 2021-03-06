require('./shared');

var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle = TestUtils.check_juttle;

describe('write proc', function () {
    var metric_name = 'test.unit.' + Math.random().toString(36).slice(2,10);

    it('write point', function() {
        return check_juttle({
            program: `emit -limit 1 | put t = "temp", value = 123, name = "${metric_name}" | write opentsdb`
        })
        .then(function(writeResult) {
            return TestUtils.expectMetricsWritten(writeResult, metric_name);
        })
        .then(function(result) {
            var pt = result.sinks.table[0];

            expect(pt.t).equals('temp');
        });
    });
    it('write multiple points', function() {
        var multi_write_metric_name = 'test.unit.' + Math.random().toString(36).slice(2,10);

        return check_juttle({
            program: `emit -limit 3 | put temp = "multi", value = 123, name = "${multi_write_metric_name}" | write opentsdb`
        })
        .then(function(writeResult) {
            return TestUtils.expectMetricsWritten(writeResult, multi_write_metric_name, 3);
        });
    });
    it('error writing nameless point', function() {
        return check_juttle({
            program: `emit -limit 1 | put t = "temp", value = 123  | write opentsdb`
        })
        .then(function(result) {
            expect(result.errors[0]).equals(undefined);
            expect(result.warnings[0]).to.contain("without metric name");
        });
    });
    it('timeless point', function() {
        var timeless_metric_name = 'test.unit.' + Math.random().toString(36).slice(2,10);
        return check_juttle({
            program: `emit -limit 1 | put t = "temp", value = 123, name = "${timeless_metric_name}" | keep t,value,name | write opentsdb`
        })
        .then(function(writeResult) {
            return TestUtils.expectMetricsWritten(writeResult, timeless_metric_name);
        });
    });
    it('error writing point without any tags', function() {
        return check_juttle({
            program: `emit -limit 1 | put value = 123, name = "${metric_name}" | keep time,value,name | write opentsdb`
        })
        .then(function(result) {
            expect(result.errors[0]).to.contain('at least one tag is required to write a point');
            expect(result.warnings[0]).equals(undefined);
        });
    });
    describe('metric value field', function() {
        var val_zero_metric_name = 'test.unit.' + Math.random().toString(36).slice(2,10);

        it('error writing proc valueless point', function() {
            return check_juttle({
                program: `emit -limit 1 | put t = "temp", value = 123, name = "${val_zero_metric_name}" | write opentsdb`
            })
            .then(function(writeResult) {
                return TestUtils.expectMetricsWritten(writeResult, val_zero_metric_name);
            });
        });
        it('write proc value=0 point', function() {
            return check_juttle({
                program: `emit -limit 1 | put t = "temp", value = 0.00, name = "${val_zero_metric_name}" | write opentsdb`
            })
            .then(function(writeResult) {
                return TestUtils.expectMetricsWritten(writeResult, val_zero_metric_name, 1);
            });
        });
    });
});
