var juttle_test_utils = require('juttle/test/runtime/specs/juttle-test-utils');
var OpentsdbSocket = require('opentsdb-socket');
var retry = require('bluebird-retry');
var check_juttle = juttle_test_utils.check_juttle;
var Juttle = require('juttle/lib/runtime').Juttle;
var OpenTSDB = require('../');
var db = require('../lib/db');
var Promise = require('bluebird');
var expect = require('chai').expect;

function randomInt() {
    return Math.floor((Math.random() * 100000) + 1);
}

var TestUtils = {
    init: function (config) {
        var adapter = OpenTSDB(config);
        Juttle.adapters.register(adapter.name, adapter);
    },
    check_juttle: function(params) {
        return check_juttle(params);
    },
    getTestMetricName: function() {
        return this.metric_name;
    },
    loadSampleData: function (config) {
        var self = this;
        return this.getSocketConnection(config)
        .then(function() {
            return self.writeMetricData();
        })
        .delay(2000)//allow time for metric to be ready for query
        .then(function() {
            return retry(function() {
                return self.expectMetricExists();
            }, {
                interval: 3000,
                timeout: 20000
            });
        })
        .then(function() {
            return self.socket.end();
        });
    },
    getSocketConnection: function(config) {
        var self = this;
        return new Promise(function(resolve, reject) {
            var socket = OpentsdbSocket();
            socket = Promise.promisifyAll(socket);
            socket.host(config.host);
            socket.port(config.port);
            socket.addListener('connect', function() {
                self.socket = socket;
                resolve();
            });
            socket.addListener('error', reject);
            socket.connect();
        });
    },
    writeMetricData: function() {
        var datum = db.getNewDatum();
        var data_writes = [];

        // Cannot delete metrics in OpenTSDB so best to test with random string name.
        this.metric_name = 'test.unit.' + Math.random().toString(36).slice(2,7);
        datum.metric(this.metric_name);
        datum.timestamp(Date.now() - 300000);
        datum.tags('general', 'here');

        data_writes.push(this.writeSingleMetric(datum, {}));
        datum.tags('host', "123");
        data_writes.push(this.writeSingleMetric(datum, {}));
        data_writes.push(this.writeSingleMetric(datum, {}));
        datum.tags('host', "456");
        datum.tags('special', "234");//only one metric has this tag
        data_writes.push(this.writeSingleMetric(datum, {}));

        return Promise.all(data_writes);
    },
    writeSingleMetric: function(datum, info) {
        if (info.timestamp) {
            datum.timestamp(info.timestamp);
        } else {
            datum.timestamp(datum.timestamp() + 5000); //5sec more recent
        }
        if (info.value) {
            datum.value(info.value);
        } else {
            datum.value(randomInt());
        }
        return this.socket.writeAsync( 'put ' + datum.toString() + '\n');
    },
    expectMetricExists: function() {
        return this.check_juttle({
            program: 'read opentsdb -from :30 minutes ago: -name "' + this.metric_name + '"'
        }).then(function(result) {
            expect(result.sinks.table).to.have.length.gt(0);
        });
    }
};

module.exports = TestUtils;
