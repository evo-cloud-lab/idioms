var Class = require('js-class'),
    _     = require('underscore'),

    Partitioner = require('./Partitioner');

/** @class
 * @description The map maintains nodes and assigned partitions
 *
 * The core data object inside this class is "_parts" which is
 * a sparse array with partition number as keys. The value is partition
 * assignment info. E.g.
 *    node-0 covers partitions 0 - 3
 *    node-1 covers partitions 4 - 7
 *    node-2 covers partitions 8 - 11
 *    the _parts contains:
 *       [0]: { id: 0, begin: 0, end: 4, node: node-0 }
 *       [4]: { id: 1, begin: 4, end: 8, node: node-1 }
 *       [8]: { id: 2, begin: 8, end: 12, node: node-2 }
 */
var PartitionMap = Class({
    /** @constructor
     * @param {String} key   interests of partitioning
     *                       see connector's actual/expect states
     * @param nodes    optional array of nodes from clusterInfo
     * @param use      optional either 'actual' or 'expect'
     */
    constructor: function (key, nodes, use) {
        this._parts = [];
        this._nodes = [];
        this._key = key;

        nodes && this.update(nodes, use);
    },

    /** @property
     * @description The sparse array of partitioning information
     */
    get parts () {
        return this._parts;
    },

    /** @property
     * @description The array of values of "parts"
     */
    get nodes () {
        return this._nodes;
    },

    /** @property
     * @description Partitioning interests
     */
    get key () {
        return this._key;
    },

    /** @function
     * @description Used when clusterInfo is updated
     */
    update: function (nodes, use) {
        var index = [];
        nodes.forEach(function (node) {
            var part = PartitionMap.partInfo(node, this._key, use);
            part && (index[part.begin] = part);
        }, this);
        this._parts = index;
        this._nodes = Object.keys(index).map(function (part) { return index[part]; });
        return this;
    },

    /** @function
     * @description Determine which node covers the specified partition
     */
    find: function (part) {
        var at = _.sortedIndex(this._nodes, { begin: part }, 'begin');
        if (at > 0 && at < this._nodes.length) {
            this._nodes[at].begin == part || (-- at);
            if (this._nodes[at].end > part) {
                return this._nodes[at];
            }
        }
        return null;
    },

    /** @function
     * @description Find out the partitions whose assignment changes
     * @return array of changed partition assignments, e.g.
     *    [ { id: 'n1', begin: 4, end: 8 },
     *      { id: null, begin: 8, end: 12} ]
     * means partitions 4 - 7 are assigned to node "n1"
     * and 8 - 11 is uncovered.
     */
    diff: function (oldMap) {
        var changes = [];
        var addChange = function (change) {
            var last = changes.length > 0 ? changes[changes.length - 1] : null;
            if (last && last.id == change.id && last.end == change.begin) {
                last.end = change.end;
            } else {
                changes.push(change);
            }
        };

        var maps = [
            { id: 0, map: oldMap._dupNodes(), i: 0, newId: false },
            { id: 1, map: this._dupNodes(), i: 0, newId: true }
        ];
        var m0 = maps[0], m1 = maps[1];
        while (m0.i < m0.map.length && m1.i < m1.map.length) {
            var n0 = m0.map[m0.i], n1 = m1.map[m1.i];
            if (n0.begin < n1.begin) {
                if (n0.end <= n1.begin) {
                    addChange({ id: m0.newId ? n0.id : null, begin: n0.begin, end: n0.end });
                    m0.i ++;
                    continue;
                } else {
                    addChange({ id: m0.newId ? n0.id : null, begin: n0.begin, end: n1.begin });
                    n0.begin = n1.begin;
                }
            }
            if (n0.begin == n1.begin) {
                if (n0.end > n1.end) {
                    m0 = maps[1 - m0.id];
                    m1 = maps[1 - m1.id];
                    n0 = m0.map[m0.i];
                    n1 = m1.map[m1.i];
                }
                if (n0.id != n1.id) {
                    addChange({ id: m0.newId ? n0.id : n1.id, begin: n0.begin, end: n0.end });
                }
                n1.begin = n0.end;
                m0.i ++;
                if (n1.begin >= n1.end) {
                    m1.i ++;
                }
            } else {
                m0 = maps[1 - m0.id];
                m1 = maps[1 - m1.id];
            }
        }
        var m = m0.i < m0.map.length ? m0 : m1;
        for (; m.i < m.map.length; m.i ++) {
            var n = m.map[m.i];
            addChange({ id: m.newId ? n.id : null, begin: n.begin, end: n.end });
        }
        return changes;
    },

    _dupNodes: function () {
        return this._nodes.map(function (node) { return { id: node.id, begin: node.begin, end: node.end }; });
    }
}, {
    statics: {
        /** @function
         * @static
         * @description Transform a node from clusterInfo into partInfo
         */
        partInfo: function (node, key, use) {
            var state = ((node.states || {})[use] || {})[key] || [];
            var part = parseInt(state[0]), count = parseInt(state[1]);
            if (!isNaN(part) && !isNaN(count) && count > 0) {
                return { id: node.id, begin: part, end: part + count, node: node };
            }
            return null;
        }
    }
});

module.exports = PartitionMap;
