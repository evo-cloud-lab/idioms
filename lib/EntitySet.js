var Class = require('js-class'),

    Entity = require('./Entity');

var EntitySet = Class({
    constructor: function (store, type) {
        this._store = store;
        this._type  = type;
        this._typeInfo = Entity.typeInfo(type);
    },

    get store () {
        return this._store;
    },

    get name () {
        return this._typeInfo.name;
    },

    get model () {
        return this._typeInfo.type;
    },

    create: function (id, data, callback) {
        Entity.create(this._store, this._type, id, data, callback);
        return this;
    },

    select: function (ids, options, callback) {
        Entity.select(this._store, this._type, ids, options, callback);
        return this;
    },

    scan: function (part, count, options, callback) {
        Entity.scan(this._store, this._type, part, count, options, callback);
        return this;
    }
});

module.exports = EntitySet;
