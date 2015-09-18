
define([
        "core/framework/Tundra",
        "core/data/DataSerializer",
        "core/network/INetworkMessage",
        "core/scene/EntityAction"
    ], function(Tundra, DataSerializer, INetworkMessage, EntityAction) {

var EntityActionMessage = INetworkMessage.$extend(
/** @lends EntityActionMessage.prototype */
{
    /**
        Entity action message.

        @constructs
        @extends INetworkMessage
    */
    __init__ : function()
    {
        this.$super(EntityActionMessage.id, "EntityActionMessage");

        /**
            Entity action.
            @var {EntityAction}
        */
        this.entityAction = new EntityAction();
    },

    __classvars__ :
    {
        id   : 120,
        name : "EntityActionMessage",
        staticNumBytes : (2 + 4 + 1 + 1 + 1)
    },

    deserialize : function(ds)
    {
        // When all strings are transferred as UTF-8, we must deduce this bool from the protocol version,
        // or simply assume that all the servers are running the new code and using the new all-UTF-8 protocol.
        var utf8 = false;

        this.entityAction.entityId = ds.readU32();
        this.entityAction.name = ds.readStringU8(utf8);
        this.entityAction.executionType = ds.readU8();
        var paramLen = ds.readU8();
        for (var i=0; i<paramLen; ++i)
        {
            var strLen = ds.readVLE();
            this.entityAction.parameters[i] = ds.readString(strLen, utf8);
        }
        delete ds;
    },

    /**
        Serializes EntityAction object into this message.

        @param {EntityAction} entityAction
    */
    serialize : function(entityAction)
    {
        if (entityAction.entityId === undefined && entityAction.entity === undefined)
        {
            Tundra.client.logError("[EntityActionMessage]: serialize() called with entity action that does not have entityId or entity set!");
            return;
        }

        /* @note This code already supports sending UTF8 strings as the name and parameters.
            Tundra server wont parse these strings correctly so don't use UTF8.
            If you stick with ASCII this code will work correctly. */
        var utf8 = false;

        var dataNumBytes = DataSerializer.utf8StringByteSize(entityAction.name);
        dataNumBytes += (entityAction.parameters.length * 4);
        var i, len;
        for(i = 0, len = entityAction.parameters.length; i < len; ++i)
            dataNumBytes += DataSerializer.utf8StringByteSize(entityAction.parameters[i]);

        this.$super(EntityActionMessage.staticNumBytes + dataNumBytes);

        this.ds.writeU16(this.id);
        this.ds.writeU32((entityAction.entityId !== undefined ? entityAction.entityId : entityAction.entity.id));
        this.ds.writeStringU8(entityAction.name);
        this.ds.writeU8(entityAction.executionType);
        this.ds.writeU8(entityAction.parameters.length);
        for(i = 0, len = entityAction.parameters.length; i < len; ++i)
            this.ds.writeStringVLE(entityAction.parameters[i], utf8);
    }
});

return EntityActionMessage;

}); // require js
