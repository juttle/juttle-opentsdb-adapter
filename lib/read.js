var _ = require('underscore');
var db = require('./db');
var Filter = require('./filter');
var Juttle = require('juttle/lib/runtime').Juttle;
var JuttleMoment = require('juttle/lib/moment').JuttleMoment;
var Promise = require('bluebird');

var logger = require('juttle/lib/logger').getLogger('opentsdb-db-read');

var Read = Juttle.proc.source.extend({
    sourceType: 'batch',
    procName: 'read-opentsdb',
    FETCH_SIZE_LIMIT: 10000,

    allowed_options: ['name', 'debug', 'from', 'to', 'optimize'],

    //initialization functions

    initialize: function(options, params, pname, location, program, juttle) {
        logger.debug('init proc name:', this.procName);
        logger.debug('options:', options);

        this.validateOptions(options);
        this.setOptions(options);

        this.client = db.getClient();
        this.query = db.getNewQuery();

        if (params.filter_ast) {
            this.addFilters(params.filter_ast);
        }

        this.total_emitted_points = 0;

        this.handleTimeOptions(options);

        this.query.metric(options.name);
    },

    validateOptions: function(options) {
        var unknown = _.difference(_.keys(options), this.allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'read-opentsdb',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'name')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', { option: "name" });
        }
        if (!_.has(options, 'from')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', { option: "from" });
        }
    },

    setOptions: function(options) {
        this.debugOption = options.debug;
    },

    addFilters: function(filter_ast) {
        var FilterCompiler = Juttle.FilterJSCompiler.extend(Filter);
        var compiler = new FilterCompiler({
            query: this.query,
            error: this.compile_error.bind(this)
        });
        return compiler.compile(filter_ast);
    },

    handleTimeOptions: function(options) {
        if (options.from) {
            this.from = options.from;
            this.client.start(options.from.milliseconds());
            logger.debug('start time', options.from.valueOf());
        }
        if (options.to) {
            this.to = options.to;
            this.client.end(options.to.milliseconds());
            logger.debug('end time', options.to.valueOf());
        } else {
            this.client.end(Date.now());
        }
    },
    //Query execution

    start: function() {
        var self = this;

        if (this.debugOption) {
            this.handleDebug();
            return;
        }

        function executeQuery() {
            self.client.queries(self.query);

            return self.client.getAsync()
            .timeout(10000)
            .then(function(result) {
                _.each(result, self.formatAndSend.bind(self));
            });
        }

        executeQuery()
        .catch(Promise.TimeoutError, function(e) {
            self.trigger('error', self.runtime_error('RT-INTERNAL-ERROR', {
                error: 'timed out trying to connect to database: '
                    + JSON.stringify(db.getConnectionDetails())
            }));
        })
        .catch(function(err) {
            if (err && err.status === 502) {
                return self.trigger('error', self.runtime_error('RT-INTERNAL-ERROR', {
                    error: 'could not connect to database: '
                        + JSON.stringify(db.getConnectionDetails())
                }));
            }
            self.trigger('error', self.runtime_error('RT-INTERNAL-ERROR', { error: err.message.toString() }));
        }).finally(function() {
            self.eof();
        });
    },

    formatAndSend: function(metric_info) {
        var formattedPoints = this.formatPoints(metric_info);
        this.total_emitted_points += formattedPoints.length;
        this.emit(formattedPoints);
    },

    formatPoints: function(metric_info) {
        var name = metric_info.metric;
        var tags = metric_info.tags;

        return _.map(metric_info.dps, function(metric) {
            var point = {
                name: name,
                value: metric[1],
                time: new JuttleMoment({ rawDate: new Date(metric[0]) })
            };
            _.extend(point, tags);
            return point;
        });
    },

    handleDebug: function() {
        logger.debug('returning query string as point');
        this.client.queries(this.query);
        this.emit([{
            url: this.client.url()
        }]);
        this.eof();
    }
});

module.exports  = Read;
