var assert = require('assert'),
    Class  = require('js-class'),
    Range  = require('evo-elements').Range,

    Partitioner   = require('../index').Partitioner;
    PartitionDict = require('../index').PartitionDict;

describe('PartitionDict', function () {
    var MockPartitionMonitor = Class(process.EventEmitter, {
        commit: function (range) {
            this.range = range;
        }
    });

    var objs = {
        'key1': { n: 1 },
        'key2': { n: 2 },
        'key3': { n: 3 }
    }, dict, parts, minPart, maxPart;

    beforeEach(function () {
        parts = Object.keys(objs).map(function (key) { return Partitioner.part(key); });
        minPart = Math.min.apply(Math, parts);
        maxPart = Math.max.apply(Math, parts);
        dict = new PartitionDict();
        dict.assign(minPart, maxPart - minPart + 1);
        for (var key in objs) {
            dict.add(key, objs[key]);
        }
    });

    it('#assign and #parts', function () {
        var dict = new PartitionDict();
        dict.assign(5, 5);
        assert.deepEqual(dict.parts.toObject(), { begin: 5, end: 10 });
    });

    it('#add key covered and #find, #remove', function () {
        var key = 'test-key';
        var part = Partitioner.part(key);
        var dict = new PartitionDict();
        dict.assign(part, 1);
        assert.equal(dict.add(key, { key: 'val' }), true);
        assert.deepEqual(dict.find(key), { key: 'val' });
        assert.deepEqual(dict.remove(key), { key: 'val' });
        assert.equal(dict.find(key), null);
        assert.equal(dict.remove(key), null);
    });

    it('#add key uncovered and #find', function () {
        var key = 'test-key';
        var part = Partitioner.part(key);
        var dict = new PartitionDict();
        dict.assign(part > 0 ? part - 1 : (Partitioner.PARTITIONS - 1), 1);
        assert.equal(dict.add(key, { key: 'val' }), false);
        assert.equal(dict.find(key), null);
        assert.equal(dict.remove(key), null);
    });

    describe('#select', function () {
        it('all partitions', function () {
            assert.deepEqual(dict.select(), objs);
        });

        it('specified partitions', function () {
            assert.equal(Object.keys(dict.select(minPart, 2)).length, 2);
        });

        it('default count', function () {
            assert.equal(Object.keys(dict.select(minPart)).length, 1);
        });
    });

    it('#applyPartitionChanges', function () {
        dict.assign(0, minPart + 1);
        var changes = {
            range: Range.parse(minPart + 1, maxPart - minPart),
            shrink: [Range.parse(0, minPart + 1)],
            expand: [Range.parse(minPart + 1, maxPart - minPart)]
        };
        dict.once('update', function (removals) {
            assert.equal(Object.keys(removals).length, 1);
            assert.equal(Object.keys(dict.select()).length, 2);
        });
        var removals = dict.applyPartitionChanges(changes);
        assert.equal(Object.keys(removals).length, 1);
    });

    it('#watch once', function () {
        var monitor = new MockPartitionMonitor();
        dict.assign(0, minPart + 1);
        var changes = {
            range: Range.parse(minPart + 1, maxPart - minPart),
            shrink: [Range.parse(0, minPart + 1)],
            expand: [Range.parse(minPart + 1, maxPart - minPart)]
        };
        var invokes = 0;
        dict.on('update', function () { invokes ++; });
        dict.watch(monitor);
        dict.watch(monitor);
        monitor.emit('partition', changes);
        assert.equal(invokes, 1);
    });

    it('#commitToMonitor', function () {
        var monitor = new MockPartitionMonitor();
        dict.watch(monitor);
        assert.equal(monitor.range, null);
        dict.commitToMonitor();
        assert.ok(monitor.range);
    });
});
