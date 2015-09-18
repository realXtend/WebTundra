
define([
        "lib/classy"
    ], function(Class) {

var INetworkMessageHandler = Class.$extend(
/** @lends INetworkMessageHandler.prototype */
{
    /**
        Interface for a network message handler. Implementations can be registered
        with {{#crossLink "Network/registerMessageHandler:method"}}Tundra.network.registerMessageHandler(){{/crossLink}}.

        @constructs
    */
    __init__ : function(name)
    {
        this.name = name;
    },

    /**
        Returns if this message handler can handle a message with the given id.

        @param {Number} id Message id.
        @return {Boolean}
    */
    canHandle : function(id)
    {
        return false;
    },

    /**
        Returns if this message handler can handle a message with the given id.

        @param {Number} id Message id.
        @param {DataDeserializer} ds Data deserializer that has the messages data.
        @return {INetworkMessage|null} Returns the message that was created during the handling or null if you don't want it to leak further.
    */
    handle : function(id, ds)
    {
        return false;
    }
});

return INetworkMessageHandler;

}); // require js
