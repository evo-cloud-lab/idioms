var Class = require('js-class'),
    flow  = require('js-flow'),
    _     = require('underscore');

var Entity = Class({
    constructor: function (store, entity) {
        this._store = store;
        this._entity = entity;
    },

    get store () {
        return this._store;
    },

    get type () {
        return this._entity.type;
    },

    get id () {
        return this._entity.id;
    },

    get part () {
        return this._entity.part;
    },

    get rev () {
        return this._entity.rev;
    },

    get ctime () {
        return this._entity.ctime;
    },

    get mtime () {
        return this._entity.mtime;
    },

    get data () {
        return this._entity.data;
    },

    set data (val) {
        return (this._entity.data = val);
    },

    update: function (opts, callback) {
        if (typeof(opts) == 'function') {
            callback = opts;
            opts = {};
        }
        var options = _.clone(opts || {}), resolver;
        resolver = options.resolve;
        delete options.resolve;

        if (!resolver && this.resolve) {
            resolver = function (current, remoteRev) {
                return this.resolve(remoteRev);
            }.bind(this);
        }
        if (typeof(resolver) == 'function') {
            options.refresh = true;
        } else {
            resolver = null;
        }

        var self = this, result;
        flow.while(function (next) {
            next(null, result != null);
        })
        .do(function (next) {
            self._store.update(self.type, self.id, self.rev, self.data, options, function (err, info) {
                if (!err) {
                    self._postUpdate(info);
                    result = true;
                } else if (err.code == 'CONFLICT' && resolver && err.entity) {
                    var solution, entity = err.entity;
                    try {
                        solution = resolver(self._entity, entity);
                        err = null;
                    } catch (e) {
                        err = e;
                    }
                    if (!err) {
                        self._postUpdate(entity);
                        result = !!solution;
                    }
                }
                next(err);
            });
        })
        .with(this)
        .run(callback);
    },

    remove: function (callback) {
        this._store.remove(this.type, [this.id], callback);
    },

    _postUpdate: function (info) {
        self._entity.rev = info.rev;
        self._entity.mtime = info.mtime;
    }
}, {
    statics: {
        typeInfo: function (type) {
            var info = { };
            if (typeof(type) == 'function') {
                info.name = type.name;
                info.type = type;
            } else {
                info.name = type.toString();
                info.type = Entity;
            }
            return info;
        },

        define: function (base, name, body, extra) {
            return Class(base, body || {}, _.extend({ statics: { name: name } }, extra || {}));
        },

        create: function (store, type, id, data, callback) {
            var typeInfo = Entity.typeInfo(type);
            store.create(typeInfo.name, id, data, function (err, result) {
                callback(err, err ? null : new typeInfo.type(store, result));
            });
        },

        select: function (store, type, ids, options, callback) {
            if (typeof(options) == 'function') {
                callback = options;
                options = {};
            }
            var typeInfo = Entity.typeInfo(type);
            store.selectByIds(typeInfo.name, ids, options, function (err, results) {
                callback(err, err || !Array.isArray(results) ? null : results.map(function (results) {
                    return new typeInfo.type(store, result);
                }));
            });
        },

        scan: function (store, type, part, count, options, callback) {
            if (typeof(options) == 'function') {
                callback = options;
                options = {};
            }
            var typeInfo = Entity.typeInfo(type);
            store.partitionScan(typeInfo.name, part, count, options, function (err, results) {
                callback(err, err || !Array.isArray(results) ? null : results.map(function (results) {
                    return new typeInfo.type(store, result);
                }));
            });
        }
    }
});

module.exports = Entity;
