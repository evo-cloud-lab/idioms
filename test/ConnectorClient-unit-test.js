var assert = require('assert'),
    Try    = require('js-flow').Try,

    Helpers = require('./Helpers'),
    ConnectorClient = require('../index').ConnectorClient;

describe('ConnectorClient', function () {
    it('emit state', function (done) {
        var neuron = new Helpers.MockedNeuron();
        var client = new ConnectorClient(neuron);
        client.on('state', function (state) {
            Try.final(function () {
                assert.equal(state, 'test');
                assert.equal(client.nodeState, 'test');
            }, done);
        });
        neuron.publish('connector', 'state', { state: 'test' });
    });

    it('emit update', function (done) {
        var neuron = new Helpers.MockedNeuron();
        var client = new ConnectorClient(neuron);
        client.on('update', function (clusterInfo) {
            Try.final(function () {
                assert.deepEqual(clusterInfo, { revision: 1, key: 'value' });
                assert.deepEqual(client.clusterInfo, { revision: 1, key: 'value' });
            }, done);
        });
        neuron.publish('connector', 'update', { revision: 1, key: 'value' });
    });

    it('emit message', function (done) {
        var neuron = new Helpers.MockedNeuron();
        var client = new ConnectorClient(neuron);
        client.on('message', function (msg, src) {
            Try.final(function () {
                assert.equal(msg, 'hello');
                assert.equal(src, 'me');
            }, done);
        });
        neuron.publish('connector', 'message', { msg: 'hello', src: 'me' });
    });

    it('#sync', function (done) {
        var neuron = new Helpers.MockedNeuron(function (branch, msg, callback) {
            Try.final(function () {
                assert.equal(branch, 'connector');
                assert.equal(msg.event, 'sync');
                assert.equal(typeof(msg.data), 'object');
            }, done);
        });
        new ConnectorClient(neuron).sync();
    });

    it('#send', function (done) {
        var neuron = new Helpers.MockedNeuron(function (branch, msg, callback) {
            Try.final(function () {
                assert.equal(branch, 'connector');
                assert.equal(msg.event, 'send');
                assert.equal(msg.data.msg, 'hello');
                assert.equal(msg.data.dst, 'ni');
            }, done);
        });
        new ConnectorClient(neuron).send('hello', 'ni');
    });

    it('#states', function (done) {
        var neuron = new Helpers.MockedNeuron(function (branch, msg, callback) {
            Try.final(function () {
                assert.equal(branch, 'connector');
                assert.equal(msg.event, 'states');
                assert.equal(msg.data.states, 'states');
                assert.strictEqual(msg.data.global, true);
            }, done);
        });
        new ConnectorClient(neuron).states('states', true);
    });

    it('#expects', function (done) {
        var neuron = new Helpers.MockedNeuron(function (branch, msg, callback) {
            Try.final(function () {
                assert.equal(branch, 'connector');
                assert.equal(msg.event, 'expects');
                assert.equal(msg.data.states, 'hello');
            }, done);
        });
        new ConnectorClient(neuron).expects('hello');
    });
});
