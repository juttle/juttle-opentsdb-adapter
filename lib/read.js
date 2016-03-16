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

    static requiredOptions() {
        return ['from'];
    }
    
    //initialization functions

    constructor(options, params) {
        super(options, params);

        this.logger.debug('init proc name:', this.procName);
        this.logger.debug('options:', options);

        this.setOptions(options);

        this.client = db.getClient(options.id);
        this.query = db.getNewQuery();

        this.addFilters(params.filter_ast);
        
        this.total_emitted_points = 0;
    }

    periodicLiveRead() {
        return true;
    }

    setOptions(options) {
        this.debugOption = options.debug;
    }

    addFilters(filter_ast) {
        if (filter_ast) {
            let compiler = new FilterCompiler(this.query);
            return compiler.compile(filter_ast);
        }
        
        if (!this.query.metric()) {
            throw new Error('filter expression must contain a metric name');
        }
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
            throw this.runtimeError('INTERNAL-ERROR', {
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
            let start = this.getAbsoluteTime(from.clone());
            this.client.start(start);
            this.logger.debug('start time', start);
        }
        
        let end = to || new JuttleMoment({rawDate: new Date()});
        end = this.getAbsoluteTime(end.clone());
        this.client.end(end);
        this.logger.debug('end time', end);
    }
    
    getAbsoluteTime(juttleMoment) {
        return JuttleMoment.format(juttleMoment, 'YYYY/MM/DD-HH:mm:ss');
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
            eof: true
        };
    }
}

module.exports  = ReadOpenTSDB;
