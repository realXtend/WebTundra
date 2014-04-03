
define([
        "lib/classy",
        "core/framework/TundraSDK"
    ], function(Class, TundraSDK) {

/**
    DOM integration interface.

    Implementation can be set active with {{#crossLink "TundraClient/setDomIntegration:method"}}TundraClient.setDomIntegration{{/crossLink}}.

    @class IDomIntegration
    @constructor
    @param {String} name Render system name.
*/
var IDomIntegration = Class.$extend(
{
    __init__ : function(name)
    {
        this.name = name;
    },

    __classvars__ :
    {
        register : function(clientPrototype)
        {
            var integration = new this();
            if (clientPrototype.registerDomIntegration(integration))
                return integration;
            return null;
        }
    },

    _load : function()
    {
        TundraSDK.framework.client.log.info("Loading " + this.name + " DOM integration system");
        this.load();
    },

    /**
        Loads the DOM integration system.
        @method load
    */
    load : function()
    {
    },

    _unload : function()
    {
        TundraSDK.framework.client.log.info("Unloading " + this.name + " DOM integration system");
        this.unload();
    },

    /**
        Unloads the DOM integration system.
        @method unload
    */
    unload : function()
    {
    }
});

return IDomIntegration;

}); // require js
