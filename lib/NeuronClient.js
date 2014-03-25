var Class = require('js-class'),
    Message = require('evo-neuron').Message;

var NeuronClient = Class(process.EventEmitter, {
    constructor: function (branchName, neuron) {
        this.neuron = neuron;
        this.branch = branchName;
        this.eventPrefix = 'neuron-msg:';
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
