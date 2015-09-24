
define(
    ["lib/classy"],
    function(Class)
{

var UniqueIdGenerator = Class.$extend(
/** @lends UniqueIdGenerator.prototype */
{
    /**
        Generates unique ids for the Tundra spesific replicated and local ranges.
        Copy-adapted from {@link https://github.com/realXtend/WebTundra/blob/master/src/scene/UniqueIdGenerator.js|WebTundra/UniqueIdGenerator.js}
        @constructs
    */
    __init__ : function()
    {
        this.id = 0;
        this.localId = UniqueIdGenerator.FirstLocalId - 1; // -1 to actually to get the first valid local ID upon first call and not FirstLocalId+1
        this.unackedId = UniqueIdGenerator.FirstUnackedId - 1; // -1 to actually to get the first valid unacked ID upon first call and not FirstUnackedId+1
    },

    __classvars__ :
    {
        FirstReplicatedId : 1,
        LastReplicatedId : 0x3fffffff,
        FirstUnackedId : 0x40000000,
        FirstLocalId : 0x80000000,
        LastLocalId : 0xffffffff
    },

    /**
        Returns the next replicated id
        @return {Number}
    */
    allocateReplicated : function()
    {
        this.id++;
        if (this.id > UniqueIdGenerator.LastReplicatedId)
            this.id = UniqueIdGenerator.FirstReplicatedId;
        return this.id;
    },

    /**
        Returns the next unacked id
        @return {Number}
    */
    allocateUnacked : function()
    {
        this.unackedId++;
        if (this.unackedId >= UniqueIdGenerator.FirstLocalId)
            this.unackedId = UniqueIdGenerator.FirstUnackedId + 1;
        return this.unackedId;
    },

    /**
        Returns the next local id
        @return {Number}
    */
    allocateLocal : function()
    {
        this.localId++;
        if (this.localId > UniqueIdGenerator.LastLocalId)
            this.localId = UniqueIdGenerator.FirstLocalId + 1;
        return this.localId;
    }
});

return UniqueIdGenerator;

}); // require js
