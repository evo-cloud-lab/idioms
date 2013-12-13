var Class = require('js-class'),
    _     = require('underscore');

var PARTITIONS = 4096;

function partition(key) {
    var sum = 0;
    for (var i = 0; i < key.length; i ++) {
        sum += key.charCodeAt(i);
    }
    return sum & (PARTITIONS - 1);
}

function assignPartitions(nodeCount) {
    if (nodeCount > 0) {
        var count = Math.floor(PARTITIONS / nodeCount);
        var remain = PARTITIONS % nodeCount;
        return { each: count, remain: remain };
    } else {
        return { each: PARTITIONS, remain: 0 };
    }
}

module.exports = {
    PARTITIONS: PARTITIONS,
    part: partition,
    assign: assignPartitions
};
