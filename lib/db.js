var logger = require('juttle/lib/logger').getLogger('opentsdb-init');
var _ = require('underscore');
var opentsdb = require( 'opentsdb');
var Promise = require('bluebird');
var client = Promise.promisifyAll(opentsdb.client());

var DB = {
    init: function(config) {
        if (config.host) {
            client.host(config.host);
        }
        if (config.port) {
            client.port(config.port);
        }
        logger.info('connection details:', this.getConnectionDetails());
    },
    getConnectionDetails: function() {
        return _.pick(client, '_host', '_port');
    },
    getClient: function () {
        return client;
    },
    getNewQuery: function() {
        return opentsdb.mquery();
    },
    getNewDatum: function() {
        return opentsdb.datum();
    }
};

module.exports = DB;
