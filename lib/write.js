'use strict';

/* global JuttleAdapterAPI */
let AdapterWrite = JuttleAdapterAPI.AdapterWrite;
let errors = JuttleAdapterAPI.errors;
let JuttleMoment = JuttleAdapterAPI.types.JuttleMoment;

let _ = require('underscore');
let Promise = require('bluebird');
let db = require('./db');

class WriteOpenTSDB extends AdapterWrite {

    static allowedOptions() {
        return ['nameField', 'timeField', 'valueField', 'id'];
    }

    constructor(options, params) {
        super(options, params);

        this.handleOptions(options);
        this.inserts_in_progress = 0;
        this.eof_received = false;

        this.connectPromise = db.getSocketConnection(options.id)
        .then((socket) => {
            this.socket = socket;
        });
        this.writePromise = Promise.resolve();
    }

    handleOptions(options) {
        this.logger.debug('init options:', options);
        let unknown = _.difference(_.keys(options), this.allowed_options);
        if (unknown.length > 0) {
            throw new errors.compileError('UNKNOWN-OPTION-ERROR', {
                proc: this.procName,
                option: unknown[0]
            });
        }
        this.nameField = options.nameField || 'name';
        this.timeField = options.timeField || 'time';
        this.valueField = options.valueField || 'value';
    }

    write(points) {
        if (points.length === 0) {
            return;
        }
        this.writePromise = this.writePromise.then(() => {
            return this.connectPromise
            .then(() => {
                return Promise.map(points, this.formatAndInsertPoint.bind(this));
            });
        }).catch((err) => {
            if (/Pool (is|was) destroyed/.test(err.message)) {
                let connectionInfo = this.knex.client.connectionSettings;
                err = errors.runtimeError('INTERNAL-ERROR', {
                    error: 'could not connect to database: ' + JSON.stringify(connectionInfo)
                });
            }
            this.trigger('error', err);
        });
    }

    formatAndInsertPoint(pt) {
        let datum = db.getNewDatum();

        if (pt[this.nameField]) {
            datum.metric(pt[this.nameField]);
            pt[this.nameField] = undefined;
        } else {
            this.trigger('warning', new Error('cannot write point without metric name'));
            return;
        }

        if (pt[this.timeField]) {
            if (pt[this.timeField] instanceof JuttleMoment) {
                datum.timestamp(pt[this.timeField].milliseconds());
            } else {
                datum.timestamp(new Date(pt[this.timeField]).getTime());
            }
            pt[this.timeField] = undefined;
        } else {
            datum.timestamp(Date.now());
        }

        if (pt[this.valueField]) {
            datum.value(pt[this.valueField]);
            pt[this.valueField] = undefined;
        } else {
            this.trigger('warning', new Error('cannot write point without metric value'));
            return;
        }
        _.each(pt, function(value, key) {
            if (value !== undefined) {
                datum.tags(key, value);
            }
        });

        this.logger.debug('writing', datum);
        return this.socket.writeAsync( 'put ' + datum.toString() + '\n');
    }

    eof() {
        return this.writePromise;
    }
}

module.exports = WriteOpenTSDB;
