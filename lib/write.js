var _ = require('underscore');
var Promise = require('bluebird');
var retry = require('bluebird-retry');
var db = require('./db');
var Juttle = require('juttle/lib/runtime').Juttle;
var JuttleMoment = require('juttle/lib/moment').JuttleMoment;
var logger = require('juttle/lib/logger').getLogger('opentsdb-db-write');

var Write = Juttle.proc.sink.extend({
    procName: 'write-opentsdb',

    allowed_options: ['nameField', 'timeField', 'valueField'],

    initialize: function(options, params) {
        var self = this;
        this.handleOptions(options);
        this.inserts_in_progress = 0;
        this.eof_received = false;

        this.connectPromise = db.getSocketConnection()
        .then(function(socket) {
            self.socket = socket;
        });
    },

    handleOptions: function(options) {
        logger.debug('init options:', options);
        var unknown = _.difference(_.keys(options), this.allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: this.procName,
                option: unknown[0]
            });
        }
        this.nameField = options.nameField || 'name';
        this.timeField = options.timeField || 'time';
        this.valueField = options.valueField || 'value';
    },

    process: function(points) {
        var self = this;

        if (points.length === 0) {
            return;
        }
        this.inserts_in_progress++;

        return self.connectPromise
        .then(function() {
            return Promise.map(points, self.formatAndInsertPoint.bind(self));
        })
        .then(function() {
            self.inserts_in_progress--;
            return self.tryFinish();
        });
    },

    formatAndInsertPoint: function(pt) {
        var datum = db.getNewDatum();

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
            if (value) {
                datum.tags(key, value);
            }
        });

        logger.debug('writing', datum);
        return this.socket.writeAsync( 'put ' + datum.toString() + '\n');
    },

    eof: function() {
        logger.debug('eof fired');
        this.eof_received = true;
        this.tryFinish();
    },

    //ensure no query is in progess when "done" is called.
    tryFinish: function() {
        if (this.eof_received && this.inserts_in_progress <= 0) {
            logger.debug('proc is done');
            this.done();
        }
    }
});

module.exports = Write;
