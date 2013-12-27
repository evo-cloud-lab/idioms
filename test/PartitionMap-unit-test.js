var assert = require('assert'),
    _      = require('underscore'),

    PartitionMap = require('../index').PartitionMap;

describe('PartitionMap', function () {
    var clusterNodes = [
        {
            id: 'n0',
            states: {
                actual: { test: [0, 6] },
                expect: { test: [0, 4] }
            }
        },
        {
            id: 'n1',
            states: {
                actual: { test: [6, 6] },
                expect: { test: [4, 4] }
            }
        },
        {
            id: 'n2',
            states: {
                actual: {},
                expect: { test: [8, 4] }
            }
        }
    ];

    it('#key', function () {
        assert.equal(new PartitionMap('test').key, 'test');
    });

    it('#update', function () {
        var map = new PartitionMap('test').update(clusterNodes, 'expect');
        assert.deepEqual(Object.keys(map.parts), [0, 4, 8]);
        assert.deepEqual(_.pick(map.parts[0], 'id', 'begin', 'end'),
                         { id: 'n0', begin: 0, end: 4 });
        var nodes = map.nodes.map(function (node) { return _.pick(node, 'id', 'begin', 'end'); });
        assert.deepEqual(nodes, [
            { id: 'n0', begin: 0, end: 4 },
            { id: 'n1', begin: 4, end: 8 },
            { id: 'n2', begin: 8, end: 12 }
        ]);
        map = new PartitionMap('test', clusterNodes, 'actual');
        assert.deepEqual(Object.keys(map.parts), [0, 6]);
        assert.deepEqual(_.pick(map.parts[0], 'id', 'begin', 'end'),
                         { id: 'n0', begin: 0, end: 6 });
        nodes = map.nodes.map(function (node) { return _.pick(node, 'id', 'begin', 'end'); });
        assert.deepEqual(nodes, [
            { id: 'n0', begin: 0, end: 6 },
            { id: 'n1', begin: 6, end: 12 }
        ]);
    });

    it('#diff', function () {
        var map0 = new PartitionMap('test', clusterNodes, 'actual');
        var map1 = new PartitionMap('test', clusterNodes, 'expect');
        assert.deepEqual(map1.diff(map0), [
            { id: 'n1', begin: 4, end: 6 },
            { id: 'n2', begin: 8, end: 12 }
        ]);
        assert.deepEqual(map0.diff(map1), [
            { id: 'n0', begin: 4, end: 6 },
            { id: 'n1', begin: 8, end: 12 }
        ]);
        var map2 = new PartitionMap('test', [
            { id: 'n0', states: { actual: { test: [0, 4] } } }
        ], 'actual');
        assert.deepEqual(map2.diff(map1), [
            { id: null, begin: 4, end: 12 }
        ]);
    });
});
