
define([
        "core/network/INetworkMessage",
    ], function(INetworkMessage) {

/**
    Clien left message.

    @class ClientLeftMessage
    @extends INetworkMessage
    @constructor
*/
var ClientLeftMessage = INetworkMessage.$extend(
{
    __init__ : function()
    {
        this.$super(ClientLeftMessage.id, "ClientLeftMessage");

        /**
            Client connection id.
            @property connectionId
            @type Number
        */
        this.connectionId = -1;
    },

    __classvars__ :
    {
        id   : 103,
        name : "ClientLeftMessage"
    },

    deserialize : function(ds)
    {
        this.connectionId = ds.readVLE();
        delete ds;
    }
});

return ClientLeftMessage;

}); // require js
