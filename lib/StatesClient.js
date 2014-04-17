var Class   = require('js-class'),
    Message = require('evo-neuron').Message,
    NeuronClient = require('./NeuronClient');
/*
var RepoClient = Class(process.EventEmitter, {
    constructor: function (name, client) {
        this._name = name;
        this._client = client;
    },

    get name () {
        return this._name;
    },

    get client () {
        return this._client;
    },

    destroy: function (callback) {
        this._client.remove(this.name, callback);
        return this;
    },

    query: function (options, callback) {
        if (typeof(options) == 'function') {
            callback = options;
            options = {};
        }
        typeof(options) == 'object' || (options = {});
        this._client.request('query', { repo: this.name, options: options }, callback);
    },

    update: function (data, options, callback) {
        if (typeof(options) == 'function') {
            callback = options;
            options = {};
        }
        var event = options == 'global' || (options && options.global) ? 'global.set' : 'local.set';
        this._client.request(event, { repo: this.name, data: data }, callback);
    },

    onSynchronized: function (data) {
        this.emit('synchronized', data.revision);
    }
});
*/

var StatesClient = Class(NeuronClient, {
    constructor: function (neuron) {
        NeuronClient.prototype.constructor.call(this, 'states', neuron);
        this
            .subscribe('centralized')
            .subscribe('updated')
            .subscribe('changes')
        ;
    },

    watch: function (keys, callback) {
        if (typeof(keys) == 'function') {
            callback = keys;
            keys = {};
        } else if (keys == null || keys == 'none') {
            keys = { none: true };
        }
        this.request('watch', keys, callback);
        return this;
    },

    commit: function (scope, data, callback) {
        if (typeof(scope) == 'object') {
            data = scope;
            scope = 'local';
            callback = data;
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
    }
});

module.exports = StatesClient;
