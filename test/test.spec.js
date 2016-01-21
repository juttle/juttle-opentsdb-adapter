var TestUtils = require("./utils");

describe('OpenTSDB adapter API tests', function () {
    describe('read proc', function () {
        before(function() {
            var config = {
                host: '127.0.0.1',
                port: 4242
            };
            TestUtils.init(config);
            return TestUtils.loadSampleData(config);
        });

        require('./options.spec');
        require('./filters.spec');
        require('./write.spec');
    });

    require('./db.spec');
});
