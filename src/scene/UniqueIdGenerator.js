// For conditions of distribution and use, see copyright notice in LICENSE

var cLastReplicatedId = 0x3fffffff;
var cFirstUnackedId = 0x40000000;
var cFirstLocalId = 0x80000000;

function UniqueIdGenerator() {
    this.id = 0;
    this.localId = cFirstLocalId;
    this.unackedId = cFirstUnackedId;
}

UniqueIdGenerator.prototype = {
    allocateReplicated: function() {
        this.id++;
        if (this.id > cLastReplicatedId)
            this.id = 1;
        return this.id;
    },

    allocateUnacked: function() {
        this.unackedId++;
        if (this.unackedId >= cFirstLocalId)
            this.unackedId = cFirstUnackedId + 1;
        return this.unackedId;
    },
    
    allocateLocal: function() {
        this.localId++;
        if (this.localId > 0xffffffff)
            this.localId = cFirstLocalId + 1;
        return this.localId;
    }
}
