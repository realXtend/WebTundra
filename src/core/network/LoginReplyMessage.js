
define([
        "core/network/INetworkMessage",
    ], function(INetworkMessage) {

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
