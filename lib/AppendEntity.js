var Class = require('js-class'),

    Entity = require('./Entity');

var AppendEntity = Class(Entity, {
    constructor: function () {
        Entity.prototype.constructor.apply(this, arguments);
        this._pendingStart = this.items.length;
    },

    get pendingCount () {
        return this.items.length - this._pendingStart;
    },

    append: function (items) {
        if (Array.isArray(items)) {
            var args = items.slice();
            args.unshift(0);
            args.unshift(this.items.length);
            this.items.splice.apply(this.items, args);
        } else {
            this.items.push(items);
        }
        return this;
    },

    commit: function (callback) {
        this.update(callback);
    },

    resolve: function (entity) {
        var items = this._items(entity);
        var args = items.slice();
        args.unshift(this._pendingStart);
        args.unshift(0);
        this.items.splice.apply(this.items, merges);
        this._pendingStart = items.length;
    },

    get items () {
        return this._items(this);
    },

    _items: function (entity) {
        Array.isArray(entity.data) || (entity.data = []);
        return entity.data;
    }
});

module.exports = AppendEntity;
