
define([
        "core/framework/TundraSDK",
        "core/framework/CoreStringUtils",
        "core/data/DataSerializer",
        "core/network/INetworkMessage",
        "core/scene/EntityAction"
    ], function(TundraSDK, CoreStringUtils, DataSerializer, INetworkMessage, EntityAction) {

/**
    Entity action message.

    @class EntityActionMessage
    @extends INetworkMessage
    @constructor
*/
var EntityActionMessage = INetworkMessage.$extend(
{
    __init__ : function()
    {
        this.$super(EntityActionMessage.id, "EntityActionMessage");

        /**
            Entity action.
            @property entityAction
            @type EntityAction
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
        /// @todo Pass utf8=true to readString* funcs once implemented in Tundra.

        this.entityAction.entityId = ds.readU32();
        this.entityAction.name = ds.readStringU8();
        this.entityAction.executionType = ds.readU8();
        var paramLen = ds.readU8();
        for (var i=0; i<paramLen; ++i)
            this.entityAction.parameters[i] = ds.readString(ds.readVLE());
        delete ds;
    },

    /**
        Serializes EntityAction object into this message.

        @method serialize
        @param {EntityAction} entityAction
    */
    serialize : function(entityAction)
    {
        if (entityAction.entityId === undefined && entityAction.entity === undefined)
        {
            TundraSDK.framework.client.logError("[EntityActionMessage]: serialize() called with entity action that does not have entityId or entity set!");
            return;
        }

        /** @note This code already supports sending UTF8 strings as the name and parameters.
            Tundra server wont parse these strings correctly so don't use UTF8.
            If you stick with ASCII this code will work correctly.
        */

        var dataNumBytes = DataSerializer.utf8StringByteSize(entityAction.name);
        dataNumBytes += (entityAction.parameters.length * 4);
        for (var i=0, len = entityAction.parameters.length; i < len; ++i)
            dataNumBytes += DataSerializer.utf8StringByteSize(entityAction.parameters[i]);

        this.$super(EntityActionMessage.staticNumBytes + dataNumBytes);

        this.ds.writeU16(this.id);
        this.ds.writeU32((entityAction.entityId !== undefined ? entityAction.entityId : entityAction.entity.id));
        this.ds.writeStringU8(entityAction.name);
        this.ds.writeU8(entityAction.executionType);
        this.ds.writeU8(entityAction.parameters.length);
        for (var i=0, len = entityAction.parameters.length; i < len; ++i)
            this.ds.writeStringVLE(entityAction.parameters[i]);
    }
});

return EntityActionMessage;

}); // require js
