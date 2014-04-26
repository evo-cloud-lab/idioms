var Class = require('js-class');

function transformQueryResult(results) {
    var transformed = {};
    for (var nodeId in results.d) {
        transformed[nodeId] = results.d[nodeId].d;
    }
    return transformed;
}

var SyncedState = Class(process.EventEmitter, {
    constructor: function (statesClient, name, scope) {
        this._name = name;
        this._scope = scope == 'global' ? scope : 'local';
        this.value = {};
        this._client = statesClient;

        this._client
            .watch(name)
            .on('changes', this.onChanges.bind(this))
        ;
    },

    get name () {
        return this._name;
    },

    get client () {
        return this._client;
    },

    query: function (callback) {
        this._client.query({ key: this.name }, function (err, results) {
            callback(err, err ? null : transformQueryResult(results));
        });
        return this;
    },

    commit: function (callback) {
        this._client.commit(this._scope, { key: this.name, val: this.value }, callback);
        return this;
    },

    onChanges: function (keys) {
        if (keys.indexOf(this.name) >= 0) {
            this.query(function (err, results) {
                err || (this.emit('changed', results));
            }.bind(this));
        }
    }
});

module.exports = SyncedState;
