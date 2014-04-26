var Class = require('js-class'),
    _     = require('underscore'),
    Range = require('evo-elements').Range,

    SyncedState = require('./SyncedState'),
    StatesClient = require('./StatesClient');

/** @class
 * @description Emit events when assigned partitions change for local node
 */
var PartitionMonitor = Class(process.EventEmitter, {
    /** @constructor
     * @param {StatesClient} States
     * @param {String} state Key of state to watch
     */
    constructor: function (states, state, handler) {
        this._state = new SyncedState(states, state, 'local');
        this._state.on('changed', this.onChanged.bind(this));

        handler && this.on('partition', handler);
    },

    /** @property
     * @description monitored state
     */
    get state () {
        return this._state.name;
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
        this._state.value = [this._actualParts.begin, this._actualParts.count];
        this._state.commit(callback);
        return this;
    },

    onChanged: function (values) {
        var localId = this._state.client.localId;
        if (localId == null) {
            return;
        }

        var expect = values[StatesClient.GLOBAL];
        expect = typeof(expect) == 'object' ? Range.parse(expect[localId]) : null;

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
