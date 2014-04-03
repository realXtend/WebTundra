
define([
        "core/network/INetworkMessage",
    ], function(INetworkMessage) {

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
        delete ds;
    }
});

return LoginReplyMessage;

}); // require js
