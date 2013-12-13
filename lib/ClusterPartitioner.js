var Class = require('js-class'),
    _     = require('underscore'),

    Partitioner = require('./Partitioner');

var ClusterPartitioner = Class({
    constructor: function (key) {
        this._key = key;
        this._ref = 0;
    },

    get key () {
        return this._key;
    },

    partition: function (clusterInfo) {
        var currRev = (clusterInfo['rev.expects'] || {})[this._key];
        if (!currRev || !this._revision || currRev != this._revision) {
            this._revision = clusterInfo.localId + ':' + (++ this._ref);

            var ids = clusterInfo.nodes.map(function (node) { return node.id; }).sort();
            var assigned = Partitioner.assign(ids.length);
            var start = 0, nodes = {};
            for (var i in ids) {
                var part = [start, assigned.each];
                i < assigned.remain && (++ part[1]);
                start += part[1];
                nodes[ids[i]] = part;
            }
            var states = {};
            states[this._key] = { revision: this._revision, nodes: nodes };
            return states;
        }
        return null;
    }
});

module.exports = ClusterPartitioner;
