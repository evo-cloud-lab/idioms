var assert = require('assert'),
    Class  = require('js-class'),

    PartitionMonitor = require('../index').PartitionMonitor;

describe('PartitionMonitor', function () {
    var MockStatesClient = Class(process.EventEmitter, {
        get localId () {
            return 'local';
        },

        watch: function () { return this; },

        query: function (filter, callback) {
            callback(null, this._fakedData);
            return this;
        },

        commit: function (scope, data, callback) {
            callback && callback();
        },

        fake: function (expect, actual) {
            this._fakedData = {
                d: { '': { d: { local: expect } }, local: { d: actual || [] } }
            };
            return this;
        },

        emitChanges: function () {
            this.emit('changes', ['test']);
        }
    });

    var statesClient;

    beforeEach(function () {
        statesClient = new MockStatesClient();
    });

    it('#state', function () {
        assert.equal(new PartitionMonitor(statesClient, 'test').state, 'test');
    });

    it('#commit and #partitions', function () {
        var monitor = new PartitionMonitor(statesClient, 'test');
        monitor.commit({ begin: 8, end: 12 }, function () {
            assert.deepEqual(monitor.partitions.toObject(), { begin: 8, end: 12 });
        });
    });

    function assertChanges(expects) {
        return function (changes) {
            changes = ['range', 'expand', 'shrink'].reduce(function (result, key) {
                var change = changes[key];
                if (change) {
                    Array.isArray(change) ?
                        (result[key] = change.map(function (range) { return range.toArray(); })) :
                        (result[key] = change.toArray());
                }
                return result;
            }, {});
            assert.deepEqual(changes, expects);
        };
    }

    it('update without initial range', function () {
        new PartitionMonitor(statesClient, 'test')
            .on('partition', assertChanges({
                range: [1, 5],
                expand: [[1, 5]]
            }));
        statesClient.fake([1, 5]).emitChanges();
    });

    it('update with initial range', function () {
        var monitor = new PartitionMonitor(statesClient, 'test');
        monitor.commit({ begin: 8, end: 12 });
        assert.deepEqual(monitor.partitions.toObject(), { begin: 8, end: 12 });
        monitor.once('partition', assertChanges({
            range: [0, 4],
            shrink: [[8, 4]],
            expand: [[0, 4]]
        }));
        statesClient.fake([0, 4], [8, 4]).emitChanges();
        monitor.once('partition', assertChanges({
            range: [0, 8],
            shrink: [[8, 4]],
            expand: [[0, 8]]
        }));
        statesClient.fake([0, 8], [8, 4]).emitChanges();
        monitor.once('partition', assertChanges({
            range: [0, 10],
            shrink: [[10, 2]],
            expand: [[0, 8]]
        }));
        statesClient.fake([0, 10], [8, 4]).emitChanges();
        monitor.once('partition', assertChanges({
            range: [9, 2],
            shrink: [[8, 1], [11, 1]]
        }));
        statesClient.fake([9, 2], [8, 4]).emitChanges();
        monitor.once('partition', assertChanges({
            range: [6, 8],
            expand: [[6, 2], [12, 2]]
        }));
        statesClient.fake([6, 8], [8, 6]).emitChanges();
    });
});
