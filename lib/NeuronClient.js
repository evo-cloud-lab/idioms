var Class = require('js-class'),
    Message = require('evo-neuron').Message;

var NeuronClient = Class(process.EventEmitter, {
    constructor: function (branchName, neuron) {
        this.neuron = neuron;
        this.branch = branchName;
        this.eventPrefix = 'neuron-msg:';

        this.neuron
            .on('state', this.onNeuronState.bind(this))
        ;
    },

    get state () {
        return this.neuron.axon[this.branch].state;
    },

    subscribe: function (event) {
        this.neuron.subscribe(event, this.branch, function (msg) {
            var method = this[this.eventPrefix + event];
            typeof(method) == 'function' && method.call(this, msg.data);
        }.bind(this));
        return this;
    },

    request: function (event, data, callback) {
        if (typeof(data) == 'function') {
            callback = data;
            data = {};
        }
        data || (data = {});
        return this.neuron.request(this.branch, Message.make(event, data), NeuronClient.callback(callback));
    },

    send: function (event, data) {
        data || (data = {});
        return this.neuron.send(this.branch, Message.make(event, data));
    },

    disconnect: function () {
        this.neuron.disconnect(this.branch);
        return this;
    },

    onNeuronState: function (state, branchName) {
        if (branchName == this.branch) {
            switch (state)
            {
                case 'connecting': this.onConnecting(); break;
                case 'connected':  this.onConnected(); break;
                case 'disconnected': this.onDisconnected(); break;
            }
        }
    },

    onConnecting: function () {
        this.emit('connecting');
    },

    onConnected: function () {
        this.emit('connected');
    },

    onDisconnected: function () {
        this.emit('disconnected');
    }
}, {
    statics: {
        callback: function (callback) {
            return callback && function (err, resp) {
                err || (err = Message.parseError(resp));
                callback(err, resp && resp.data);
            };
        }
    }
});

module.exports = NeuronClient;
