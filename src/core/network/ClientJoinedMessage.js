
define([
        "core/network/INetworkMessage",
    ], function(INetworkMessage) {

var ClientJoinedMessage = INetworkMessage.$extend(
/** @lends ClientJoinedMessage.prototype */
{
    /**
        Clien joined message.

        @constructs
        @extends INetworkMessage
    */
    __init__ : function()
    {
        this.$super(ClientJoinedMessage.id, "ClientJoinedMessage");

        /**
            Client connection id.
            @var {Number}
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
