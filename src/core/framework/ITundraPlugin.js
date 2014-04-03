
define([
        "lib/classy",
        "core/framework/TundraLogging"
    ], function(Class, TundraLogging) {

/**
    Tundra plugin interface.

    @class ITundraPlugin
    @constructor
    @param {String} name Name of the plugin.
*/
var ITundraPlugin = Class.$extend(
{
    __init__ : function(name)
    {
        if (typeof name !== "string")
            console.error("ITundraPlugin constructor must be called with the plugin name as a string!");

        /**
            TundraSDK Framework object.
            @property framework
            @type TundraSDK.framework
        */
        this.framework = null;
        /**
            Name of the plugin.
            @property framework
            @type String
        */
        this.name = name;
        /**
            Logger for this plugin.
            @property log
            @type TundraLogger
        */
        this.log = TundraLogging.getLogger(this.name);

        this.initialized = false;
    },

    _setFramework : function(fw)
    {
        this.framework = fw;
    },

    /// Internal
    _initialize : function()
    {
        if (this.initialized === true)
        {
            this.log("Already initialized!");
            return;
        }

        this.initialize();
        this.initialized = true;
    },

    /**
        Called when plugin is loaded to TundraClient. Implementation can override this.
            <b>Note:</b> this.framework is set at this stage.

        @method initialize
    */
    initialize : function()
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

        @method postInitialize
    */
    postInitialize : function()
    {
    },

    /// Internal
    _uninitialize : function()
    {
        this.uninitialize();
        this.framework = null;
        this.initialized = false;
    },

    /**
        Called when plugin is unloaded from TundraClient. Implementation can override this.
            <b>Note:</b> this.framework is still valid at this stage.

        @method uninitialize
    */
    uninitialize : function()
    {
    }
});

return ITundraPlugin;

}); // require js
