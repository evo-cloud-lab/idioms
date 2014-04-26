var Class   = require('js-class'),
    Message = require('evo-neuron').Message,
    NeuronClient = require('./NeuronClient');

var StatesClient = Class(NeuronClient, {
    constructor: function (neuron) {
        NeuronClient.prototype.constructor.call(this, 'states', neuron);
        this
            .subscribe('centralized')
            .subscribe('updated')
            .subscribe('changes')
        ;
        this._watches = {};
    },

    get localId () {
        return this._localId;
    },

    watch: function (keys) {
        var updated;
        if (typeof(keys) == 'string') {
            keys = [keys];
        }
        if (Array.isArray(keys)) {
            keys.forEach(function (key) {
                this._addWatch(key, true) && (updated = true);
            }, this);
        } else if (typeof(keys) == 'object') {
            for (var key in keys) {
                this._addWatch(key, keys[key]) && (updated = true);
            }
        }
        updated && this._updateWatches();
        return this;
    },

    commit: function (scope, data, callback) {
        if (typeof(scope) == 'object') {
            callback = data;
            data = scope;
            scope = 'local';
        } else if (scope != 'local' && scope != 'global') {
            throw new Error('Invalid scope');
        }
        this.request(scope + '.set', data, callback);
        return this;
    },

    query: function (filter, callback) {
        if (typeof(filter) == 'function') {
            callback = filter;
            filter = {};
        }
        this.request('query', { key: filter.key, node: filter.node }, callback);
        return this;
    },

    'neuron-msg:centralized': function (data) {
        this.emit('centralized', data.revision);
    },

    'neuron-msg:updated': function (data) {
        this.emit('updated', data.revision);
    },

    'neuron-msg:changes': function (data) {
        this.emit('changes', data.keys);
    },

    onConnected: function () {
        this._updateWatches();
    },

    _addWatch: function (key, watched) {
        if (watched) {
            if (!this._watches[key]) {
                this._watches[key] = true;
                return true;
            }
        } else if (this._watches[key]) {
            delete this._watches[key];
            return true;
        }
        return false;
    },

    _updateWatches: function () {
        this.request('watch', { none: true, watches: this._watches }, function (err, results) {
            if (!err && results) {
                this._localId = results.localId;
            }
        }.bind(this));
    }
}, {
    statics: {
        GLOBAL: ''
    }
});

module.exports = StatesClient;
