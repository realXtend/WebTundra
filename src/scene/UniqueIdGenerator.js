// For conditions of distribution and use, see copyright notice in LICENSE

if (Tundra === undefined)
    var Tundra = {};

Tundra.cLastReplicatedId = 0x3fffffff;
Tundra.cFirstUnackedId = 0x40000000;
Tundra.cFirstLocalId = 0x80000000;

Tundra.UniqueIdGenerator = function() {
    this.id = 0;
    this.localId = Tundra.cFirstLocalId;
    this.unackedId = Tundra.cFirstUnackedId;
};

Tundra.UniqueIdGenerator.prototype = {
    allocateReplicated: function() {
        this.id++;
        if (this.id > Tundra.cLastReplicatedId)
            this.id = 1;
        return this.id;
    },

    allocateUnacked: function() {
        this.unackedId++;
        if (this.unackedId >= Tundra.cFirstLocalId)
            this.unackedId = Tundra.cFirstUnackedId + 1;
        return this.unackedId;
    },
    
    allocateLocal: function() {
        this.localId++;
        if (this.localId > 0xffffffff)
            this.localId = Tundra.cFirstLocalId + 1;
        return this.localId;
    }
};
