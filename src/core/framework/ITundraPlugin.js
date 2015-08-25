
define([
        "lib/classy",
        "core/framework/TundraLogging"
    ], function(Class, TundraLogging) {

var ITundraPlugin = Class.$extend(
/** @lends ITundraPlugin.prototype */
{
    /**
        Tundra plugin interface that implementations need to extend.

        @constructs
        @param {String} name Name of the plugin.
        @param {String|Array.<String>} aliases Name aliases.
    */
    __init__ : function(name, aliases)
    {
        if (typeof name !== "string" || name === "")
            console.error("ITundraPlugin constructor must be called with name that is a non-empty string!");

        /**
            Tundra framework object.
            @var {Object}
        */
        this.framework = null;
        /**
            Name of the plugin.
            @var {String}
        */
        this.name = name;
        /**
            Name aliases of the plugin.
            @var {Array.<String>}
        */
        this.nameAliases = (typeof aliases === "string" ? [ aliases ] : (Array.isArray(aliases) ? [].concat(aliases) : []));
        /**
            If plugin is loaded.
            @var {Boolean}
        */
        this.loaded = false;
        /**
            Logger for this plugin.
            @var {TundraLogger}
        */
        this.log = TundraLogging.getLogger(this.name);
    },

    _setFramework : function(fw)
    {
        this.framework = fw;
    },

    /// Internal
    _initialize : function(options)
    {
        if (this.loaded === true)
        {
            this.log("Already loaded!");
            return;
        }

        this.initialize(options);
        this.loaded = true;
    },

    /**
        Called to resolve property name for Tundra.plugins.<name> registration.
        Implementations can override this, if not overridden will return plugin name.

        The returned name will be lowercased by Tundra, eg. MyPlugin > myPlugin, Voip > voip.

        @return {String} The name of the plugin property
    */
    pluginPropertyName : function()
    {
        return this.name;
    },

    /**
        Called when plugin is loaded to TundraClient. Implementation can override this.
            <b>Note:</b> this.framework is set at this stage.
    */
    initialize : function(options)
    {
    },

    /// Internal
    _postInitialize : function()
    {
        this.postInitialize();
    },

    /**
        Called after all plugins have been loaded to TundraClient.
        Useful if your plugin needs to fetch and use other plugins.
        Implementation can override this.
    */
    postInitialize : function()
    {
    },

    /// Internal
    _uninitialize : function()
    {
        this.uninitialize();
        this.framework = null;
        this.loaded = false;
    },

    /**
        Called when plugin is unloaded from TundraClient. Implementation can override this.
            <b>Note:</b> this.framework is still valid at this stage.
    */
    uninitialize : function()
    {
    }
});

return ITundraPlugin;

}); // require js
