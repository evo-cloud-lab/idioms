var assert = require('assert'),
    Try    = require('js-flow').Try,

    Helpers = require('./Helpers'),
    ConnectorClient = require('../index').ConnectorClient,
    ConnectorStates = require('../index').ConnectorStates;

describe('ConnectorStates', function () {
    it('invokes callbacks of named states', function (done) {
        var neuron = new Helpers.MockedNeuron();
        var client = new ConnectorClient(neuron);
        var states = new ConnectorStates(client, {
            master: {
                enter: function () {
                    process.nextTick(function () {
                        neuron.publish('connector', 'update', { key: 'value' });
                    });
                },

                update: function (clusterInfo) {
                    Try.final(function () {
                        assert.deepEqual(clusterInfo, { key: 'value' });
                    }, done);
                }
            }
        });
        states.start();
        neuron.publish('connector', 'state', { state: 'master' });
    });

    it('transits to default states', function (done) {
        var neuron = new Helpers.MockedNeuron();
        var client = new ConnectorClient(neuron);
        var states = new ConnectorStates(client, {
            master: {
                update: function (clusterInfo) {
                    done(new Error('should not happend'));
                }
            },
            default: {
                update: function (clusterInfo) {
                    Try.final(function () {
                        assert.deepEqual(clusterInfo, { key: 'value' });
                    }, done);
                }
            }
        });
        states.start();
        neuron.publish('connector', 'update', { key: 'value' });
    });

    it('dispatch message', function (done) {
        var neuron = new Helpers.MockedNeuron();
        var client = new ConnectorClient(neuron);
        var context = { k: 'v' };
        var states = new ConnectorStates(client, {
            master: {
                enter: function () {
                    process.nextTick(function () {
                        neuron.publish('connector', 'message', { msg: { event: 'hello', data: 'world' }, src: 'me' });
                    });
                },

                'msg:hello': function (msg, src) {
                    var context = this;
                    Try.final(function () {
                        assert.equal(src, 'me');
                        assert.deepEqual(msg, { event: 'hello', data: 'world' });
                        assert.equal(context.k, 'v');
                    }, done);
                }
            },
            context: context
        });
        states.start();
        neuron.publish('connector', 'state', { state: 'master' });
    });

    it('process general requests', function (done) {
        var neuron = new Helpers.MockedNeuron();
        var client = new ConnectorClient(neuron);
        var context = { k: 'v' };
        var states = new ConnectorStates(client, {
            default: {
                'fn:abc': function (value) {
                    var context = this;
                    Try.final(function () {
                        assert.equal(value, 321);
                        assert.equal(context.k, 'v');
                    }, done);
                }
            },
            context: context
        });
        states.start();
        states.process('abc', 321);
    });
});
