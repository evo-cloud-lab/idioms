var Class = require('js-class'),

    NeuronClient = require('./NeuronClient');

var EntityStore = Class(NeuronClient, {
    constructor: function (neuron) {
        NeuronClient.prototype.constructor.call(this, 'cubes', neuron);
    },

    create: function (type, id, data, callback) {
        return this.request('entity.create', { type: type, id: id, data: data }, callback);
    },

    update: function (type, id, data, callback) {
        return this.request('entity.update', { type: type, id: id, data: data }, callback);
    },

    selectByIds: function (type, ids, options, callback) {
        if (typeof(options) == 'function') {
            callback = options;
            options = {};
        }
        return this.request('entity.select', {
            type: type,
            method: 'id',
            keys: ids,
            options: options
        }, callback);
    },

    partitionScan: function (type, part, count, options, callback) {
        if (typeof(options) == 'function') {
            callback = options;
            options = {};
        }
        return this.request('entity.select', {
            type: type,
            method: 'part',
            keys: [part, count],
            options: options
        }, callback);
    },

    remove: function (type, ids, callback) {
        return this.request('entity.remove', { type: type, ids: ids }, callback);
    }
});

module.exports = EntityStore;
