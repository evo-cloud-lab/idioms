var Class  = require('js-class'),
    neuron = require('evo-neuron');

function requestCallback(callback) {
    return callback && function (err, resp) {
            err || (err = neuron.Message.parseError(resp));
            callback(err, resp && resp.data);
        };
}

var ConnectorClient = Class(process.EventEmitter, {
    constructor: function (neuron) {
        (this.neuron = neuron)
            .subscribe('state',   'connector', this.onConnectorState.bind(this))
            .subscribe('update',  'connector', this.onConnectorUpdate.bind(this))
            .subscribe('message', 'connector', this.onConnectorMessage.bind(this))
        ;
    },

    get nodeState () {
        return this._nodeState;
    },

    get clusterInfo () {
        return this._clusterInfo;
    },

    sync: function (callback) {
        return this.neuron.request('connector', { event: 'sync', data: {} }, requestCallback(callback));
    },

    send: function (msg, dest, callback) {
        return this.neuron.request('connector', neuron.Message.make('send', { msg: msg, dst: dest }), requestCallback(callback));
    },

    states: function (states, isGlobal, callback) {
        return this.neuron.request('connector', neuron.Message.make('states', { states: states, global: isGlobal }), requestCallback(callback));
    },

    expects: function (states, callback) {
        return this.neuron.request('connector', neuron.Message.make('expects', { states: states }), requestCallback(callback));
    },

    // node state changed
    onConnectorState: function (msg) {
        if (msg.data.state) {
            this._nodeState = msg.data.state;
            this.emit('state', this._nodeState);
        }
    },

    // topology changed
    onConnectorUpdate: function (msg) {
        this._clusterInfo = msg.data;
        this.emit('update', this._clusterInfo);
    },

    // node message
    onConnectorMessage: function (wrappedMsg) {
        if (wrappedMsg && wrappedMsg.data) {
            this.emit('message', wrappedMsg.data.msg, wrappedMsg.data.src);
        }
    }
});

module.exports = ConnectorClient;
