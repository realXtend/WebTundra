
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/input/InputAPI"
    ], function(Class, Tundra, InputAPI) {

var IInputPlugin = Class.$extend(
/** @lends IInputPlugin.prototype */
{
    /**
        Input plugin interface.

        @constructs
        @param {String} name Name of the plugin.
    */
    __init__ : function(name)
    {
        if (name === undefined)
        {
            console.error("[IInputPlugin]: Constructor called without a plugin name!");
            name = "Unknown";
        }
        this.name = name;
        this.running = false;
        this._registeredInputEvents = [];
    },

    __classvars__ :
    {
        /**
            Registers a new instance of the plugin to InputAPI.
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
    */
    start : function()
    {
        Tundra.client.logError("[IInputPlugin]: Plugin '" + name + "' has not implemented start()");
    },

    _stop : function()
    {
        this.stop();
        this.unregisterEvents(true);
        this.running = false;
    },

    /**
        Stops the plugin. Must be overridden this function in your implementation.
    */
    stop : function()
    {
        Tundra.client.logError("[IInputPlugin]: Plugin '" + name + "' has not implemented stop()");
    },

    _reset : function()
    {
        this.reset();
        this.unregisterEvents(false);
    },

    /**
        Resets the plugin. Can be overridden in your implementation.
    */
    reset : function()
    {
    },

    /**
        Register new event type to InputAPI. Use internally in your implementation to create new
        easily accessible events to InputAPI.

        @param {String} eventName Name of the event e.g. "TouchStart".
        @param {String} eventStringSignature Name of the EventAPI event that will fire for this event.
        @return {Boolean}

        * @example
        * this.registerEvent("TouchStart", "MyTouchPlugin.TouchStart");
        * // Creates the following registration slot to InputAPI.
        * Tundra.input.onTouchStart(null, function(param1, param2) {
        *     console.log(param1, param2) // "hello world 1234"
        * });
        * // You are responsible of firing the event via EventAPI.
        * Tundra.events.send("MyTouchPlugin.TouchStart", "hello world", 1234);
    */
    registerEvent : function(eventName, eventStringSignature)
    {
        var success = Tundra.input.registerPluginEvent(eventName, eventStringSignature);
        if (success === true)
            this._registeredInputEvents.push(eventStringSignature);
        return success;
    },

    /**
        Unregisters all events that have been registered via registerEvent.
        Automatically invoked when plugin implementation is stopped.
        @param {Boolean} [forget=false] Forget all registered events.
    */
    unregisterEvents : function(forget)
    {
        for (var i = 0; i < this._registeredInputEvents.length; i++)
        {
            var eventSignature = this._registeredInputEvents[i];
            if (typeof eventSignature === "string")
                Tundra.events.remove(eventSignature);
        }
        if (forget === true)
            this._registeredInputEvents = [];
    }
});

return IInputPlugin;

}); // require js
