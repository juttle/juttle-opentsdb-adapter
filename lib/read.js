'use strict';

/* global JuttleAdapterAPI */
let AdapterRead = JuttleAdapterAPI.AdapterRead;
let JuttleMoment = JuttleAdapterAPI.types.JuttleMoment;

let _ = require('underscore');
let db = require('./db');
let FilterCompiler = require('./filter');
let Promise = require('bluebird');

class ReadOpenTSDB extends AdapterRead {

    static get FETCH_SIZE_LIMIT() { return 10000; }

    static allowedOptions() {
        return AdapterRead.commonOptions().concat(['name', 'debug', 'id']);
    }

    //initialization functions

    constructor(options, params) {
        super(options, params);

        this.logger.debug('init proc name:', this.procName);
        this.logger.debug('options:', options);

        this.validateOptions(options);
        this.setOptions(options);

        this.client = db.getClient(options.id);
        this.query = db.getNewQuery();

        if (params.filter_ast) {
            this.addFilters(params.filter_ast);
        }

        this.total_emitted_points = 0;

        this.query.metric(options.name);
    }

    periodicLiveRead() {
        return true;
    }

    validateOptions(options) {
        if (!_.has(options, 'name')) {
            throw this.compileError('MISSING-OPTION', { option: "name" });
        }
        if (!_.has(options, 'from')) {
            throw this.compileError('MISSING-OPTION', { option: "from" });
        }
    }

    setOptions(options) {
        this.debugOption = options.debug;
    }

    addFilters(filter_ast) {
        let compiler = new FilterCompiler(this.query);
        return compiler.compile(filter_ast);
    }

    //Query execution

    read(from, to, limit, state) {
        return Promise.try(() => {
            this.addTimeLimitsToClient(from, to);

            if (this.debugOption) {
                return this.handleDebug();
            }

            this.client.queries(this.query);

            return this.client.getAsync()
            .timeout(10000)
            .then((result) => {
                return {
                    points: _.flatten(_.map(result, this.formatPoints.bind(this))),
                    readEnd: to
                };
            });
        })
        .catch(Promise.TimeoutError, (e) => {
            throw this.runtime_error('INTERNAL-ERROR', {
                error: 'timed out trying to connect to database: '
                    + JSON.stringify(db.getConnectionDetails(this.client))
            });
        })
        .catch((err) => {
            if (err && err.status === 502) {
                let connectionInfo = db.getConnectionDetails(this.client);
                throw this.runtimeError('INTERNAL-ERROR', {
                    error: 'could not connect to database: ' + JSON.stringify(connectionInfo)
                });
            } else {
                throw err;
            }
        });
    }

    addTimeLimitsToClient(from, to) {
        if (from) {
            this.client.start(from.milliseconds());
            this.logger.debug('start time', JSON.stringify(from));
        }

        let end = to || new Date();
        this.client.end(end.milliseconds());
        this.logger.debug('end time', JSON.stringify(end));
    }

    formatPoints(metric_info) {
        let name = metric_info.metric;
        let tags = metric_info.tags;

        return _.map(metric_info.dps, function(metric) {
            let point = {
                name: name,
                value: metric[1],
                time: new JuttleMoment({ rawDate: new Date(metric[0]) })
            };
            _.extend(point, tags);
            return point;
        });
    }

    handleDebug() {
        this.logger.debug('returning query string as point');
        this.client.queries(this.query);
        return {
            points: [{
                url: this.client.url()
            }],
            readEnd: new JuttleMoment(Infinity)
        };
    }
}

module.exports  = ReadOpenTSDB;
