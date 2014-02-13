var Class = require('js-class'),
    _     = require('underscore'),
    Range = require('evo-elements').Range;

/** @class
 * @description Emit events when assigned partitions change for local node
 */
var PartitionMonitor = Class(process.EventEmitter, {
    /** @constructor
     * @param {ConnectorClient} connector
     * @param {String} state   Key of state to watch
     */
    constructor: function (connector, state, handler) {
        this.connector = connector;
        this._state = state;

        this.connector.on('update', this.onConnectorUpdate.bind(this));
        handler && this.on('partition', handler);
    },

    /** @property
     * @description monitored state
     */
    get state () {
        return this._state;
    },

    /** @property
     * @description actually assigned partitions
     * @returns Range
     */
    get partitions() {
        return this._actualParts;
    },

    /** @function
     * @description commit actual partitions
     */
    commit: function (range, callback) {
        this._actualParts = Range.parse(range);
        var states = {};
        states[this._state] = [this._actualParts.begin, this._actualParts.count];
        return this.connector.states(states, callback);
    },

    onConnectorUpdate: function (clusterInfo) {
        var localNode = _.find(clusterInfo.nodes, function (node) { return node.id == clusterInfo.localId; });
        var parts = localNode && ((localNode.states || {}).expect || {})[this._state];
        var expect = Range.parse(parts);
        if (!expect || this._actualParts && this._actualParts.equal(expect)) {
            return;
        }

        var changes = { range: expect };
        if (!this._actualParts) {
            changes.expand = [expect];
        } else {
            var shrink = this._actualParts.sub(expect);
            shrink.length > 0 && (changes.shrink = shrink);
            var expand = expect.sub(this._actualParts);
            expand.length > 0 && (changes.expand = expand);
        }
        this.emit('partition', changes, this);
    }
});

module.exports = PartitionMonitor;
