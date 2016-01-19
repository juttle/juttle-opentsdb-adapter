var expect = require('chai').expect;
var TestUtils = require("./utils");
var check_juttle = TestUtils.check_juttle;
var AdapterClass = require('../');
var Juttle = require('juttle/lib/runtime').Juttle;

describe('test db connection error', function () {
    before(function() {
        var config = {
            host: '128.7.7.8', //fake
            port: 2345
        };

        return Juttle.adapters.register('opentsdbtest', AdapterClass(config));
    });
    it('error on incorrect connection string or credentials', function() {
        return check_juttle({
            program: 'read opentsdbtest -from :30 minutes ago: -name "' + TestUtils.metric_name + '"'
        })
        .then(function(result) {
            expect(result.errors[0]).to.contain('connect to database');
        });
    });
});
