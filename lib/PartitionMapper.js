var Class = require('js-class'),
    _     = require('underscore'),
    async = require('async'),
    elements = require('evo-elements'),
    Catalog = elements.Catalog,

    Partitioner  = require('./Partitioner'),
    PartitionMap = require('./PartitionMap');

var ObjectState = Class({
    constructor: function (key, object) {
        this.key = key;
        this.part = Partitioner.part(key);
        this.object = object;
    }
});

var PartitionMapper = Class({
    constructor: function (stateKey, use) {
        this._stateKey = stateKey;
        this._use = use;
        this._map = new PartitionMap(stateKey);
        this._objects = {};
        this._mapped = new Catalog([]);     // part maps to mapped objects
        this._unmapped = new Catalog([]);   // part maps to unmapped objects
    },

    get map () {
        return this._map;
    },

    add: function (key, object) {
        var state = this._objects[key];
        if (state) {            // key already added
            this._mapped.remove(state.part, key);
            state.object = object;
        } else {
            state = new ObjectState(key, object);
        }
        this._unmapped.add(state.part, key, state);
        return this;
    },

    remove: function (key) {
        var state = this._objects[key];
        if (state) {
            delete this._objects[key];
            this._mapped.remove(state.part, key);
            this._unmapped.remove(state.part, key);
            return state.object;
        }
        return null;
    },

    get: function (key) {
        var state = this._objects[key];
        return state && state.object;
    },

    markMapped: function (keys, mapped) {
        Array.isArray(keys) || (keys = [keys]);
        var catalogs = [this._mapped, this._unmapped], at = mapped ? 0 : 1;
        keys.forEach(function (key) {
            var state = this._objects[key];
            if (state) {
                catalogs[1 - at].remove(state.part, key);
                catalogs[at].add(state.part, key, state);
            }
        }, this);
        return this;
    },

    clusterUpdate: function (clusterInfo) {
        var newMap = new PartitionMap(this._stateKey, clusterInfo.nodes, this._use);
        var changes = newMap.diff(this._map);
        this._map = newMap;
        var mapped = this._mapped.names, mi = 0, ci = 0;
        while (mi < mapped.length && ci < changes.length) {
            if (mapped[mi] >= changes[ci].end) {
                ci ++;
            } else {
                if (mapped[mi] >= changes[ci].begin) {
                    var part = this._mapped.all(mapped[mi]);
                    this._mapped.removeAll(mapped[mi]);
                    _.extend(this._unmapped.all(mapped[mi], true), part);
                }
                mi ++;
            }
        }
        return this;
    },

    /** @function
     * @description Get all unmapped objects by nodes
     */
    unmappedByNodes: function () {
        var nodes = {}, uncovered = {};
        this._unmapped.names.forEach(function (part) {
            var node = this._map.find(part);
            var objs = this._unmapped.all(part);
            var dest;
            if (node) {
                var maps = nodes[node.id];
                maps || (maps = nodes[node.id] = {});
                dest = maps;
            } else {
                dest = uncovered;
            }
            for (var key in objs) {
                dest[key] = objs[key].object;
            }
        }, this);
        return { nodes: nodes, unmapped: uncovered };
    },

    /** @function
     * @description Map all unmapped objects
     *
     * @param {Function} mapFn   mapping function, defined as function (nodeId, map<key, object>, done),
     *                           done is defined as function (err, mapped), if err is present, the
     *                           whole process is terminated immediately, otherwise mapped indicates
     *                           whether this object should be marked as mapped
     * @param {Function} callback   final callback defined as function (err, allMapped),
     *                              err indicates any error happens, allMapped indicates whether all
     *                              objects are mapped successfully, if false, there must be some
     *                              objects leaving unmapped.
     */
    remap: function (mapFn, callback) {
        var maps = this.unmappedByNodes();
        var allMapped = Object.keys(maps.unmapped).length == 0;
        var self = this;
        async.each(Object.keys(maps.nodes), function (nodeId, next) {
            mapFn(nodeId, maps.nodes[nodeId], function (err, mapped) {
                if (!err && mapped) {
                    self.markMapped(Object.keys(maps.nodes[nodeId]), true);
                } else {
                    allMapped = false;
                }
                next(err);
            });
        }, function (err) {
            callback && callback(err, allMapped);
        });
        return this;
    }
});

module.exports = PartitionMapper;
