var Class   = require('js-class'),
    Message = require('evo-neuron').Message,
    NeuronClient = require('./NeuronClient');

var ConnectorClient = Class(NeuronClient, {
    constructor: function (neuron) {
        NeuronClient.prototype.constructor.call(this, 'connector', neuron);
        this
            .subscribe('state')
            .subscribe('update')
            .subscribe('request')
            .subscribe('message')
        ;
    },

    get nodeState () {
        return this._nodeState;
    },

    get clusterInfo () {
        return this._clusterInfo;
    },

    get localId () {
        return this._clusterInfo ? this._clusterInfo.localId : null;
    },

    sync: function (callback) {
        return this.request('sync', callback);
    },

    send: function (msg, dest, callback) {
        if (typeof(dest) == 'function') {
            callback = dest;
            dest = undefined;
        }
        return this.request('send', { msg: msg, dst: dest }, callback);
    },

    remoteRequest: function (msg, dest, callback) {
        return this.request('request', { msg: msg, dst: dest }, callback);
    },

    remoteRespond: function (msg, origin, callback) {
        return this.request('respond', { msg: msg, origin: origin }, callback);
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

    // remote request
    'neuron-msg:request': function (data) {
        if (data && data.origin && data.msg && data.msg.event) {
            var client = this;
            var wrappedMsg = Object.create({
                origin: data.origin,
                event: data.msg.event,
                data: data.msg.data,
                raw: data.msg,

                respond: function (msg) {
                    return msg instanceof Error ? this.fail(msg)
                                                : client.remoteRespond(msg, this.origin);
                },

                ok: function (data) {
                    return data instanceof Error ? this.fail(data)
                                                 : client.remoteRespond(Message.ok(data), this.origin);
                },

                fail: function (err) {
                    return client.remoteRespond(Message.error(err), this.origin);
                },

                accept: function (schema, opts, callback) {
                    if (typeof(opts) == 'function') {
                        callback = opts;
                        opts = {};
                    }
                    var acceptedData = Schema.accept(schema, this.data, opts);
                    if (acceptedData instanceof Error) {
                        client.remoteRespond(Message.error(acceptedData));
                    } else {
                        return callback(acceptedData);
                    }
                    return undefined;
                }
            });
            wrappedMsg.done = function (err, data) {
                this.ok(err || data);
            }.bind(wrappedMsg);
            this.emit('request', wrappedMsg);
        }
    },

    // node message
    'neuron-msg:message': function (data) {
        if (data) {
            this.emit('message', data.msg, data.src);
        }
    }
});

module.exports = ConnectorClient;
