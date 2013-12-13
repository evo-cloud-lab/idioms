var assert = require('assert'),

    ClusterPartitioner = require('../index').ClusterPartitioner;

describe('ClusterPartitioner', function () {
    it('balance the partitions', function () {
        var clusterInfo = {
            localId: 'local',
            nodes: [
                { id: '1' },
                { id: '2' },
                { id: '3' }
            ]
        };
        var result = new ClusterPartitioner('key').partition(clusterInfo);
        assert.deepEqual(result, {
            key: {
                revision: 'local:1',
                nodes: {
                    '1': [0, 1366],
                    '2': [1366, 1365],
                    '3': [2731, 1365]
                }
            }
        });
    });

    it('checks revision', function () {
        var clusterInfo = {
            localId: 'local',
            nodes: [
                { id: '1' },
                { id: '2' },
                { id: '3' }
            ]
        };
        var partitioner = new ClusterPartitioner('key');
        var result = partitioner.partition(clusterInfo);
        assert.ok(result);
        assert.equal(partitioner.partition({ 'rev.expects': { key: result.key.revision } }), null);
    });

    it('#key', function () {
        assert.equal(new ClusterPartitioner('key').key, 'key');
    });
});