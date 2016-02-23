require('./shared');

var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle = TestUtils.check_juttle;

describe('test db connection error', function () {
    it('error on incorrect connection string or credentials', function() {
        return check_juttle({
            program: 'read opentsdb -id "fake" -from :30 minutes ago: -name "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.errors[0]).to.contain('connect to database');
        });
    });
});
