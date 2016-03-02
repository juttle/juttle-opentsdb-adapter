var config = require('./shared');

var _ = require('underscore');
var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle = TestUtils.check_juttle;

describe('test db connection error', function () {
    it('error on incorrect connection string or credentials', function() {
        return check_juttle({
            program: 'read opentsdb -id "fake" -from :30 minutes ago: name = "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.errors[0]).to.contain('connect to database');
        });
    });

    it('2 reads with different dbs confs', function() {
        return check_juttle({
            program: 'read opentsdb -from :-30m: -to :now: name = "' + TestUtils.metric_name + '" | view json;' +
                'read opentsdb -id "fake" -from :30 minutes ago: name = "' + TestUtils.metric_name + '";',
            realtime: true
        }, 3000)
        .then(function(result) {
            expect(result.errors).to.have.length(1);
            expect(result.errors[0]).to.contain('connect to database');

            var fakeConfig = _.findWhere(config, {id: 'fake'});
            expect(result.errors[0]).to.contain(fakeConfig.host);
        });
    });
});
