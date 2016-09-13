
define([
        "core/network/INetworkMessage",
        "core/network/Network",
        "core/data/DataSerializer"
    ], function(INetworkMessage, Network, DataSerializer) {

var LoginMessage = INetworkMessage.$extend(
/** @lends LoginMessage.prototype */
{
    /**
        Login message.

        @constructs
        @private
        @extends INetworkMessage
    */
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

        @param {String} loginData Login properties as JSON.
    */
    serialize : function(loginData)
    {
        this.$super(2 + 2 + DataSerializer.utf8StringByteSize(loginData) + 1);
        this.ds.writeU16(this.id);
        this.ds.writeStringU16(loginData);
        // Request highest possible protocol version, see if server supports it
        this.ds.writeVLE(Network.protocolVersion.WebClientRigidBodyMessage);
    }
});

return LoginMessage;

}); // require js
