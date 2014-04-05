
define([
        "core/network/INetworkMessage",
        "core/data/DataSerializer"
    ], function(INetworkMessage, DataSerializer) {

/**
    Login message.

    @class LoginMessage
    @extends INetworkMessage
    @constructor
*/
var LoginMessage = INetworkMessage.$extend(
{
    __init__ : function()
    {
        this.$super(LoginMessage.id, "LoginMessage");
    },

    __classvars__ :
    {
        id   : 100,
        name : "LoginMessage"
    },

    /**
        Serializes login data to this message.

        @method serialize
        @param {String} loginData Login properties as JSON.
    */
    serialize : function(loginData)
    {
        this.$super(2 + 2 + DataSerializer.utf8StringByteSize(loginData));
        this.ds.writeU16(this.id);
        this.ds.writeStringU16(loginData);
    }
});

return LoginMessage;

}); // require js
