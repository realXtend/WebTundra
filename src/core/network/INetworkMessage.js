
define([
        "lib/classy",
        "core/data/DataSerializer"
    ], function(Class, DataSerializer) {

/**
    Interface for a network message.

    @class INetworkMessage
    @constructor
*/
var INetworkMessage = Class.$extend(
{
    __init__ : function(id, name)
    {
        this.id = id;
        this.name = (name !== undefined ? name : INetworkMessage.Ids[id]);
    },

    __classvars__ :
    {
        /**
            Message id.
            @static
            @property id
            @type Number
        */
        id   : 0,
        /**
            Message name.
            @static
            @property name
            @type String
        */
        name : "",

        /**
            Map for Tundra protocol message ids to message names.
            @property Ids
            @type Object
            @static
            @example
                {
                    // Login
                    100 : "LoginMessage",
                    101 : "LoginReplyMessage",
                    102 : "ClientJoinedMessage",
                    103 : "ClientLeftMessage",
                    // Scene
                    110 : "CreateEntityMessage",
                    111 : "CreateComponentsMessage",
                    112 : "CreateAttributesMessage",
                    113 : "EditAttributesMessage",
                    114 : "RemoveAttributesMessage",
                    115 : "RemoveComponentsMessage",
                    116 : "RemoveEntityMessage",
                    117 : "CreateEntityReplyMessage",       // @note server to client only
                    118 : "CreateComponentsReplyMessage",   // @note server to client only
                    119 : "RigidBodyUpdateMessage",
                    // Enity action
                    120 : "EntityActionMessage",
                    // Assets
                    121 : "AssetDiscoveryMessage",
                    122 : "AssetDeletedMessage"
                }
        */
        Ids :
        {
            // Login
            100 : "LoginMessage",
            101 : "LoginReplyMessage",
            102 : "ClientJoinedMessage",
            103 : "ClientLeftMessage",
            // Scene
            110 : "CreateEntityMessage",
            111 : "CreateComponentsMessage",
            112 : "CreateAttributesMessage",
            113 : "EditAttributesMessage",
            114 : "RemoveAttributesMessage",
            115 : "RemoveComponentsMessage",
            116 : "RemoveEntityMessage",
            117 : "CreateEntityReplyMessage",       // @note server to client only
            118 : "CreateComponentsReplyMessage",   // @note server to client only
            119 : "RigidBodyUpdateMessage",
            // Enity action
            120 : "EntityActionMessage",
            // Assets
            121 : "AssetDiscoveryMessage",
            122 : "AssetDeletedMessage"
        }
    },

    /**
        Returns the data array buffer. This function return null for messages that are being used for
        deserialization or if serialize has not called yet.
        @return {ArrayBuffer|null} Array buffer or null if serialize has not been called.
    */
    getBuffer : function()
    {
        if (this.ds !== undefined && this.ds !== null && this.ds instanceof DataSerializer)
            return this.ds.getBuffer();
        return null;
    },

    /**
        Deserializes message from data.
        @method deserialize
        @param {DataDeserializer} ds Data deserializer.
    */
    deserialize : function(ds)
    {
        this.ds = ds;
    },

    /**
        Serializes message to data. Call getBuffer to get written data array buffer.
        @method serialize
        @param {Number} numBytes Number of bytes to reserve for writing the data.
    */
    serialize : function(numBytes)
    {
        this.ds = new DataSerializer(numBytes);
    }
});

return INetworkMessage;

}); // require js
