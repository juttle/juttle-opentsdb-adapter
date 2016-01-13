var juttle_test_utils = require('juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var Juttle = require('juttle/lib/runtime').Juttle;
var OpenTSDB = require('../');

var TestUtils = {
    init: function (config) {
        var adapter = OpenTSDB(config);
        Juttle.adapters.register(adapter.name, adapter);
    },
    check_juttle: function(params) {
        return check_juttle(params);
    }
};

module.exports = TestUtils;
