
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/input/InputAPI"
    ], function(Class, TundraSDK, InputAPI) {

/**
    Input plugin interface.

    @class IInputPlugin
    @constructor
    @param {String} name Name of the plugin.
*/
var IInputPlugin = Class.$extend(
{
    __init__ : function(name)
    {
        if (name === undefined)
        {
            console.error("[IInputPlugin]: Constructor called without a plugin name!");
            name = "Unknown";
        }
        this.name = name;
        this.running = false;
    },

    __classvars__ :
    {
        /**
            Registers a new instance of the plugin to InputAPI.
            @method register
            @static
        */
        register : function()
        {
            var plugin = new this();
            InputAPI.registerPlugin(plugin);
        }
    },

    _start : function()
    {
        this.start();
        this.running = true;
    },

    /**
        Starts the plugin. Must be overridden this function in your implementation.
        @method start
    */
    start : function()
    {
        TundraSDK.framework.client.logError("[IInputPlugin]: Plugin '" + name + "' has not implemented start()");
    },

    _stop : function()
    {
        this.stop();
        this.running = false;
    },

    /**
        Stops the plugin. Must be overridden this function in your implementation.
        @method stop
    */
    stop : function()
    {
        TundraSDK.framework.client.logError("[IInputPlugin]: Plugin '" + name + "' has not implemented stop()");
    },

    /**
        Resets the plugin. Can be overridden in your implementation.
        @method reset
    */
    reset : function()
    {
    },

    /**
        Register new event type to InputAPI. Use internally in your implementation to create new
        easily accessible events to InputAPI.

        @method registerEvent
        @param {String} eventName Name of the event eg. "TouchStart".
        @param {String} eventStringSignature Name of the EventAPI event that will fire for this event.
        @example
            this.registerEvent("TouchStart", "MyTouchPlugin.TouchStart");
            // Creates the following registration slot to InputAPI.
            TundraSDK.input.onTouchStart(null, function(param1, param2) {
                console.log(param1, param2) // "hello world 1234"
            });
            // You are responsible of firing the event via EventAPI.
            TundraSDK.framework.events.send("MyTouchPlugin.TouchStart", "hello world", 1234);
    */
    registerEvent : function(eventName, eventStringSignature)
    {
        return TundraSDK.framework.input.registerPluginEvent(eventName, eventStringSignature);
    }
});

return IInputPlugin;

}); // require js