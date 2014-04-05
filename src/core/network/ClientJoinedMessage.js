
define([
        "core/network/INetworkMessage",
    ], function(INetworkMessage) {

/**
    Clien joined message.

    @class ClientJoinedMessage
    @extends INetworkMessage
    @constructor
*/
var ClientJoinedMessage = INetworkMessage.$extend(
{
    __init__ : function()
    {
        this.$super(ClientJoinedMessage.id, "ClientJoinedMessage");

        /**
            Client connection id.
            @property connectionId
            @type Number
        */
        this.connectionId = -1;
    },

    __classvars__ :
    {
        id   : 102,
        name : "ClientJoinedMessage"
    },

    deserialize : function(ds)
    {
        this.connectionId = ds.readVLE();
        delete ds;
    }
});

return ClientJoinedMessage;

}); // require js
