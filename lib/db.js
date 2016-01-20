var logger = require('juttle/lib/logger').getLogger('opentsdb-init');
var _ = require('underscore');
var opentsdb = require( 'opentsdb');
var OpentsdbSocket = require('opentsdb-socket');
var Promise = require('bluebird');
var client = Promise.promisifyAll(opentsdb.client());
var socket = Promise.promisifyAll(OpentsdbSocket());

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
    },
    getSocketConnection: function() {
        return new Promise(function(resolve, reject) {
            if (socket._socket) {
                //already connected
                return resolve(socket);
            }
            socket.host(client._host);
            socket.port(client._port);
            socket.addListener('connect', function() {
                logger.info('write socket connected.');
                resolve(socket);
            });
            socket.addListener('error', reject);
            socket.connect();
        });
    }
};

module.exports = DB;
