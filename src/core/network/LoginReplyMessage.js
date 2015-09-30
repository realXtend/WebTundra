
define([
        "core/network/INetworkMessage",
        "core/network/Network"
    ], function(INetworkMessage, Network) {

var LoginReplyMessage = INetworkMessage.$extend(
/** @lends LoginReplyMessage.prototype */
{
    /**
        Login reply message.

        @constructs
        @extends INetworkMessage
    */
    __init__ : function()
    {
        this.$super(LoginReplyMessage.id, "LoginReplyMessage");

        /**
            If login was successful.
            @var {Boolean}
        */
        this.success = false;
        /**
            Client connection id.
            @var {Number}
        */
        this.connectionId = -1;
        /**
            Login reply data as JSON.
            @var {String}
        */
        this.replyData = "";
        /**
            Protocol version supported by the server
            @property protocolVersion
            @type Number
        */
        this.protocolVersion = 1;
    },

    __classvars__ :
    {
        id   : 101,
        name : "LoginReplyMessage"
    },

    deserialize : function(ds)
    {
        this.success = ds.readBoolean();
        this.connectionId = ds.readVLE();
        this.replyData = ds.readStringU16();
        // Read optional protocol version if present
        if (ds.bytesLeft() >= 1)
            this.protocolVersion = ds.readVLE();
        delete ds;
    }
});

return LoginReplyMessage;

}); // require js
