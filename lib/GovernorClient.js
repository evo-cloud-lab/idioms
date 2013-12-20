var Class = require('js-class'),
    _     = require('underscore'),
    uuid  = require('uuid'),
    neuron = require('evo-neuron');

var GovernorClient = Class(process.EventEmitter, {
    constructor: function (neuron) {
        (this.neuron = neuron)
            .subscribe('reserve.state', 'governor', this.onReserveState.bind(this))
        ;
    },

    reportUsages: function (usages) {
        return this.neuron.send('governor', neuron.Message.make('collect.usages', { usages: usages }));
    },

    reserveRequest: function (reservation) {
        if (!reservation.id) {
            reservation.id = uuid.v4();
        }
        return this.neuron.send('governor', neuron.Message.make('reserve.request', _.pick(reservation, 'id', 'resources')));
    },

    reserveCancel: function (id) {
        return this.neuron.send('governor', neuron.Message.make('reserve.cancel', { id: id }));
    },

    reserveCommit: function (id) {
        return this.neuron.send('governor', neuron.Message.make('reserve.commit', { id: id }));
    },

    onReserveState: function (msg) {
        this.emit('reserve.state', msg.data.id, msg.data.state, msg.data.node);
    },
});

module.exports = GovernorClient;
