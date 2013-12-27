var Class  = require('js-class'),

    NeuronClient = require('./NeuronClient');

var ConnectorClient = Class(NeuronClient, {
    constructor: function (neuron) {
        NeuronClient.prototype.constructor.call(this, 'connector', neuron);
        this
            .subscribe('state')
            .subscribe('update')
            .subscribe('message')
        ;
    },

    get nodeState () {
        return this._nodeState;
    },

    get clusterInfo () {
        return this._clusterInfo;
    },

    sync: function (callback) {
        return this.request('sync', callback);
    },

    send: function (msg, dest, callback) {
        return this.request('send', { msg: msg, dst: dest }, callback);
    },

    states: function (states, isGlobal, callback) {
        if (typeof(isGlobal) == 'function') {
            callback = isGlobal;
            isGlobal = false;
        }
        return this.request('states', { states: states, global: isGlobal }, callback);
    },

    expects: function (states, callback) {
        return this.request('expects', { states: states }, callback);
    },

    // node state changed
    'neuron-msg:state': function (data) {
        if (data.state) {
            this._nodeState = data.state;
            this.emit('state', this._nodeState);
        }
    },

    // topology changed
    'neuron-msg:update': function (data) {
        this._clusterInfo = data;
        this.emit('update', this._clusterInfo);
    },

    // node message
    'neuron-msg:message': function (data) {
        if (data) {
            this.emit('message', data.msg, data.src);
        }
    }
});

module.exports = ConnectorClient;
