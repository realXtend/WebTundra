
define([
        "lib/classy",
        "core/framework/Tundra"
    ], function(Class, Tundra) {

// Not documented, silly interface that will be removed from webtundra

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
        Tundra.client.log.info("Loading " + this.name + " DOM integration system");
        this.load();
    },

    load : function()
    {
    },

    _unload : function()
    {
        Tundra.client.log.info("Unloading " + this.name + " DOM integration system");
        this.unload();
    },

    unload : function()
    {
    }
});

return IDomIntegration;

}); // require js
