'use strict';

/* global JuttleAdapterAPI */
let logger = JuttleAdapterAPI.getLogger('opentsdb-init');

let _ = require('underscore');
let opentsdb = require( 'opentsdb');
let OpentsdbSocket = require('opentsdb-socket');
let Promise = require('bluebird');
let socket = Promise.promisifyAll(OpentsdbSocket());

let confArr;

class DB {
    static init(config) {
        confArr = _.isArray(config) ? config : [config];
    }

    static getConnectionDetails(client) {
        return _.pick(client, '_host', '_port');
    }

    static getClient(id) {

        let conf = _.findWhere(confArr, {id: id}) || confArr[0];

        let client = Promise.promisifyAll(opentsdb.client());

        if (conf.host) {
            client.host(conf.host);
        }
        if (conf.port) {
            client.port(conf.port);
        }

        return client;
    }

    static getNewQuery() {
        return opentsdb.mquery();
    }

    static getNewDatum() {
        return opentsdb.datum();
    }

    static getSocketConnection(id) {
        return new Promise((resolve, reject) => {
            var client = this.getClient(id);

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
}

module.exports = DB;
