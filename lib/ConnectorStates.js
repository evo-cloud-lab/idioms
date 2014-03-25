var Class    = require('js-class'),
    StateMachine = require('evo-elements').StateMachine;

var StateBase = Class({
    constructor: function (owner) {
        this.owner = owner;
    },

    process: function (transit, event) {
        this._transit = transit;
        var method = this[event];
        method && method.apply(this, [].slice.call(arguments, 2));
    },

    transit: function () {
        this._transit.apply(undefined, arguments);
    },

    nodeState: function (state) {
        this.transit(state);
    },

    nodeMessage: function (msg, src) {
        var handler = this['msg:' + msg.event];
        if (handler) {
            handler.apply(this, arguments);
        }
    },

    nodeRequest: function (req) {
        var handler = this['req:' + req.event];
        if (handler) {
            handler.apply(this, arguments);
        }
    }
});

var StateWrapper = Class(StateBase, {
    constructor: function (owner, handlers, context) {
        StateBase.prototype.constructor.call(this, owner);
        this.handlers = handlers;
        this.context = context || owner;
        ['enter', 'leave'].forEach(function (event) {
            if (handlers[event]) {
                this[event] = function (transit) {
                    handlers[event].apply(this, [].slice.call(arguments, 1));
                }.bind(this.context);
            }
        }, this);
        if (handlers['update']) {
            this.nodeUpdate = function () {
                handlers['update'].apply(this, arguments);
            }.bind(this.context);
        }
        if (handlers['message']) {
            this.nodeMessage = function () {
                handlers['message'].apply(this, arguments);
            }.bind(this.context);
        }

        for (var name in handlers) {
            if (name.substr(0, 3) == 'fn:') {
                (function (name, fn, self) {
                    self[name] = function () {
                        fn.apply(this, arguments);
                    }.bind(self.context);
                })(name.substr(3), handlers[name], this);
            }
        }
    },

    nodeMessage: function (msg, src) {
        var handler = this.handlers['msg:' + msg.event];
        handler && handler.apply(this.context || this.owner, arguments);
    },

    nodeRequest: function (req) {
        var handler = this.handlers['req:' + req.event];
        handler && handler.apply(this.context || this.owner, arguments);
    }
});

function defineTransits(state, names) {
    names.forEach(function (name) {
        state = state.when(name).to(name);
    });
    state.fallback('default');
}

var ConnectorStates = Class(StateMachine, {
    constructor: function (client, states) {
        StateMachine.prototype.constructor.call(this);
        this.client = client;
        if (states) {
            var names = ['offline', 'announcing', 'connecting', 'master', 'member'].filter(function (name) {
                return !!states[name];
            });

            defineTransits(
                this.state('default', new StateWrapper(this, states.default || {}, states.context)),
                names
            );
            names.forEach(function (name) {
                defineTransits(
                    this.state(name, new StateWrapper(this, states[name], states.context)),
                    names
                );
            }, this);
        }
        client
            .on('state', this.onState.bind(this))
            .on('update', this.onUpdate.bind(this))
            .on('request', this.onRequest.bind(this))
            .on('message', this.onMessage.bind(this))
        ;
    },

    onState: function (state) {
        this.process('nodeState', state);
    },

    onUpdate: function (clusterInfo) {
        this.process('nodeUpdate', clusterInfo);
    },

    onRequest: function (req) {
        this.process('nodeRequest', req);
    },

    onMessage: function (msg, src) {
        this.process('nodeMessage', msg, src);
    }
}, {
    statics: {
        State: StateBase
    }
});

module.exports = ConnectorStates;
