
define([
        "core/network/INetworkMessage",
        "core/network/Network"
    ], function(INetworkMessage, Network) {

/**
    Login reply message.

    @class LoginReplyMessage
    @extends INetworkMessage
    @constructor
*/
var LoginReplyMessage = INetworkMessage.$extend(
{
    __init__ : function()
    {
        this.$super(LoginReplyMessage.id, "LoginReplyMessage");

        /**
            If login was successful.
            @property success
            @type Boolean
        */
        this.success = false;
        /**
            Client connection id.
            @property connectionId
            @type Number
        */
        this.connectionId = -1;
        /**
            Login reply data as JSON.
            @property replyData
            @type String
        */
        this.replyData = "";
        /**
            Protocol version supported by the server
            @property protocolVersion
            @type Number
        */
        this.protocolVersion = Network.protocolVersion.Original;
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
