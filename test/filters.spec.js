var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle = TestUtils.check_juttle;
var _ = require('underscore');

describe('test tag filters', function () {
    it('by single tag', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "' + TestUtils.metric_name + '" host = "123"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length.gt(1);
        });
    });
    it('by two existing tags', function() {
        return check_juttle({
            program: 'read opentsdb -debug true -from :30 minutes ago: -name "'
                + TestUtils.metric_name + '" host = "123" AND special = "234"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);

            expect(result.sinks.table).to.have.length(1);
        });
    });
    it('by non-existant tag key', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "'
                + TestUtils.metric_name + '" host = "123" AND '
                + 'nonsense = "gibberish"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length(0);
        });
    });
    it('by non-existant tag value', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "'
                + TestUtils.metric_name + '" host = "888"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length(0);
        });
    });
    it('by all host tags', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "'
                + TestUtils.metric_name + '" host = "*"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length.gt(0);
            result.sinks.table.forEach(function(pt) {
                // host=* is a grouping so only points with host tag will show up.
                expect(!!pt.host).to.be.true;
            });
            TestUtils.expectIncreasingTime(result.sinks.table);
        });
    });
    it('by some host tags', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "'
                + TestUtils.metric_name + '" host = "123|456"'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
            expect(result.sinks.table).to.have.length.gt(0);
            var hosts = _.chain(result.sinks.table).pluck('host').unique().value();
            expect(hosts).eql(["123", "456"]);
        });
    });
    it('by tag operater error', function() {
        return check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "' + TestUtils.metric_name + '" host != "123"'
        })
        .then(function() {
            throw new Error('Should never see this error');
        })
        .catch(function(err) {
            expect(err.message).to.equal("Error: Only AND and '=' operators with string values are supported in the optimized filter expression.");
        });
    });
});
