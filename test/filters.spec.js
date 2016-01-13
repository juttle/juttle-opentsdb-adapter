var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle = TestUtils.check_juttle;

describe('test tag filters', function () {
    var host_tag_val;
    var fstype_tag_val;
    var metric_name = "df.bytes.used";
    before(function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "' + metric_name + '"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length.gt(0);
            host_tag_val = result.sinks.table[0].host;
            fstype_tag_val = result.sinks.table[0].fstype;
        });
    });
    it('by tag', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "' + metric_name + '" host = "' + host_tag_val + '"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);

            expect(result.sinks.table).to.have.length.gt(2);
            result.sinks.table.forEach(function(metric) {
                expect(metric.host).to.equal(host_tag_val);
            });
        });
    });
    it('by two tags', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "'
                + metric_name + '" host = "' + host_tag_val + '" AND '
                + 'fstype = "' + fstype_tag_val + '"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);

            expect(result.sinks.table).to.have.length.gt(2);
            result.sinks.table.forEach(function(metric) {
                expect(metric.host).to.equal(host_tag_val);
                expect(metric.fstype).to.equal(fstype_tag_val);
            });
        });
    });
    it('by two tags false filter', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "'
                + metric_name + '" host = "' + host_tag_val + '" AND '
                + 'fstype = "gibberish"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length(0);
        });
    });
    it('by tag operater error', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "' + metric_name + '" host != "' + host_tag_val + '"'
        })
        .then(function() {
            throw new Error('Should never see this error');
        })
        .catch(function(err) {
            expect(err.message).to.equal("Error: Only AND and '=' operators with string values are supported in the optimized filter expression.");
        });
    });
});
