
define([
        "core/network/INetworkMessage",
    ], function(INetworkMessage) {

var ClientLeftMessage = INetworkMessage.$extend(
/** @lends ClientLeftMessage.prototype */
{
    /**
        Clien left message.

        @constructs
        @extends INetworkMessage
    */
    __init__ : function()
    {
        this.$super(ClientLeftMessage.id, "ClientLeftMessage");

        /**
            Client connection id.
            @var {Number}
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
    }
});

return ClientLeftMessage;

}); // require js
