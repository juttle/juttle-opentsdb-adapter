var TestUtils = require("./utils");

var config = [
    {
        id: "default",
        host: '127.0.0.1',
        port: 4242,
        path: "./"
    }, {
        id: "fake",
        host: '128.7.7.8', //fake
        port: 2345,
        path: './'
    }
];
config.path = './';

before(function() {

    TestUtils.init(config);
    return TestUtils.loadSampleData(config);
});

module.exports = config;
