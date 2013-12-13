var Class    = require('js-class'),
    elements = require('evo-elements');

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
    }
});

var StateWrapper = Class(StateBase, {
    constructor: function (owner, handlers) {
        StateBase.prototype.constructor.call(this, owner);
        this.handlers = handlers;
        var context = handlers.context || owner;
        ['enter', 'leave'].forEach(function (event) {
            if (handlers[event]) {
                this[event] = function (transit) {
                    handlers[event].apply(context, [].slice.call(arguments, 1));
                };
            }
        }, this);
        if (handlers['update']) {
            this.nodeUpdate = function () {
                handlers['update'].apply(context, arguments);
            }
        }
        if (handlers['message']) {
            this.nodeMessage = function () {
                handlers['message'].apply(context, arguments);
            }
        }

        for (var name in handlers) {
            if (name.substr(0, 3) == 'fn:') {
                (function (name, fn, owner) {
                    owner[name] = function () {
                        fn.apply(context, arguments);
                    };
                })(name.substr(3), handlers[name], this);
            }
        }
    },

    nodeMessage: function (msg, src) {
        var handler = this.handlers['msg:' + msg.event];
        handler && handler.apply(this.handlers.context || this.owner, arguments);
    }
});

function defineTransits(state, names) {
    names.forEach(function (name) {
        state = state.when(name).to(name);
    });
    state.fallback('default');
}

var ConnectorStates = Class(elements.StateMachine, {
    constructor: function (client, states) {
        elements.StateMachine.prototype.constructor.call(this);
        this.client = client;
        if (states) {
            var names = ['offline', 'announcing', 'connecting', 'master', 'member'].filter(function (name) {
                return !!states[name];
            });

            defineTransits(
                this.state('default', new StateWrapper(this, states.default || {})),
                names
            );
            names.forEach(function (name) {
                defineTransits(
                    this.state(name, new StateWrapper(this, states[name])),
                    names
                );
            }, this);
        }
        client
            .on('state', this.onState.bind(this))
            .on('update', this.onUpdate.bind(this))
            .on('message', this.onMessage.bind(this))
        ;
    },

    onState: function (state) {
        this.process('nodeState', state);
    },

    onUpdate: function (clusterInfo) {
        this.process('nodeUpdate', clusterInfo);
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
