
define([
        "core/framework/TundraSDK",
        "core/network/INetworkMessageHandler",
        "core/network/INetworkMessage",
        "core/network/LoginReplyMessage",
        "core/network/ClientJoinedMessage",
        "core/network/ClientLeftMessage",
        "core/network/EntityActionMessage"
    ], function(TundraSDK, INetworkMessageHandler, INetworkMessage, 
                LoginReplyMessage,
                ClientJoinedMessage,
                ClientLeftMessage,
                EntityActionMessage) {

/**
    Network handler for the Tundra protocol messages.

    @class TundraMessageHandler
    @extends INetworkMessageHandler
    @constructor
*/
var TundraMessageHandler = INetworkMessageHandler.$extend(
{
    __init__ : function()
    {
        this.$super("TundraMessageHandler");
    },

    canHandle : function(id)
    {
        // Login related
        if (id >= 101 && id <= 103)
            return true;
        // Entity action
        else if (id === 120)
            return true;
        // Scene/Entity/Component/Attribute related.
        // Expand this when new messages handling is implemented.
        else if (id >= 110 && id <= 116)
            return true;
        return false;
    },

    handle : function(id, ds)
    {
        /// @todo Implement 109 EditEntityPropertiesMessage
        /// @todo Implement 117 CreateEntityReplyMessage
        /// @todo Implement 118 CreateComponentsReplyMessage
        /// @todo Implement 119 RigidBodyUpdateMessage

        var client = TundraSDK.framework.client;

        if (id >= 110 && id <= 116)
        {
            // Immediate mode message parsing, no predefined objects.
            var msg = new INetworkMessage(id);
            msg.deserialize(ds);

            client.scene.onTundraMessage(msg);   
        }
        else if (id === EntityActionMessage.id)
        {
            var msg = new EntityActionMessage();
            msg.deserialize(ds);

            client.scene.handleEntityActionMessage(msg);
        }
        else if (id === LoginReplyMessage.id)
        {
            var msg = new LoginReplyMessage();
            msg.deserialize(ds);

            if (msg.success)
            {
                // Set the clients connection id.
                client.connectionId = msg.connectionId;

                // Pass storage information to AssetAPI.
                if (msg.loginReplyData !== "")
                    client.asset.handleDefaultStorage(msg.replyData);
            }
            else
            {
                client.log.error("Authentication to server failed: ", msg);
                client.disconnect();
            }
        }
        else if (id === ClientJoinedMessage.id)
        {
            /// @note This is currently a no-op both in native and web client
            var msg = new ClientJoinedMessage();
            msg.deserialize(ds);
        }
        else if (id === ClientLeftMessage.id)
        {
            /// @note This is currently a no-op both in native and web client
            var msg = new ClientLeftMessage();
            msg.deserialize(ds);
        }
    }
});

return TundraMessageHandler;

}); // require js
