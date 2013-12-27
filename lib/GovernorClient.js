var Class = require('js-class'),
    _     = require('underscore'),
    uuid  = require('uuid'),

    NeuronClient = require('./NeuronClient');

var GovernorClient = Class(NeuronClient, {
    constructor: function (neuron) {
        NeuronClient.prototype.constructor.call(this, 'governor', neuron);
        this.subscribe('reserve.state');
    },

    reportUsages: function (usages) {
        return this.send('collect.usages', { usages: usages });
    },

    reserveRequest: function (reservation) {
        if (!reservation.id) {
            reservation.id = uuid.v4();
        }
        return this.send('reserve.request', _.pick(reservation, 'id', 'resources'));
    },

    reserveCancel: function (id) {
        return this.send('reserve.cancel', { id: id });
    },

    reserveCommit: function (id) {
        return this.send('reserve.commit', { id: id });
    },

    'neuron-msg:reserve.state': function (data) {
        this.emit('reserve.state', data.id, data.state, data.node);
    },
});

module.exports = GovernorClient;
