var assert = require('assert'),
    Class  = require('js-class'),

    PartitionMonitor = require('../index').PartitionMonitor;

describe('PartitionMonitor', function () {
    var MockConnector = Class(process.EventEmitter, {
        states: function (states, callback) {
            callback && callback(states);
        }
    });

    it('#state', function () {
        assert.equal(new PartitionMonitor(new MockConnector(), 'test').state, 'test');
    });

    it('#commit and #partitions', function () {
        var monitor = new PartitionMonitor(new MockConnector(), 'test');
        monitor.commit({ begin: 8, end: 12 }, function (states) {
            assert.deepEqual(states, { test: [8, 4] });
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
        new PartitionMonitor(new MockConnector(), 'test')
            .on('partition', assertChanges({
                range: [1, 5],
                expand: [[1, 5]]
            }))
            .connector.emit('update', {
                nodes: [
                    {
                        id: 'local',
                        states: {
                            expect: {
                                test: [1, 5]
                            }
                        }
                    }
                ],
                localId: 'local'
            });
    });

    it('update with initial range', function () {
        var monitor = new PartitionMonitor(new MockConnector(), 'test');
        monitor.commit({ begin: 8, end: 12 });
        assert.deepEqual(monitor.partitions.toObject(), { begin: 8, end: 12 });
        monitor.once('partition', assertChanges({
            range: [0, 4],
            shrink: [[8, 4]],
            expand: [[0, 4]]
        })).connector.emit('update', { localId: 'local', nodes: [ {
            id: 'local',
            states: {
                expect: {
                    test: [0, 4],
                }
            }
        } ] });
        monitor.once('partition', assertChanges({
            range: [0, 8],
            shrink: [[8, 4]],
            expand: [[0, 8]]
        })).connector.emit('update', { localId: 'local', nodes: [ {
            id: 'local',
            states: {
                expect: {
                    test: [0, 8],
                }
            }
        } ] });
        monitor.once('partition', assertChanges({
            range: [0, 10],
            shrink: [[10, 2]],
            expand: [[0, 8]]
        })).connector.emit('update', { localId: 'local', nodes: [ {
            id: 'local',
            states: {
                expect: {
                    test: [0, 10],
                }
            }
        } ] });
        monitor.once('partition', assertChanges({
            range: [9, 2],
            shrink: [[8, 1], [11, 1]]
        })).connector.emit('update', { localId: 'local', nodes: [ {
            id: 'local',
            states: {
                expect: {
                    test: [9, 2],
                }
            }
        } ] });
        monitor.once('partition', assertChanges({
            range: [6, 8],
            expand: [[6, 2], [12, 2]]
        })).connector.emit('update', { localId: 'local', nodes: [ {
            id: 'local',
            states: {
                expect: {
                    test: [6, 8],
                }
            }
        } ] });
    });
});
