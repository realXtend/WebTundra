
define([
        "lib/classy",
        "core/framework/TundraLogging"
    ], function(Class, TundraLogging) {

var ITundraAPI = Class.$extend(
/** @lends ITundraAPI.prototype */
{
    /**
        Tundra API interface, used internally to create core APIs.

        @constructs
        @param {String} name Name of the API.
        @param {Object} [options] API config options.
    */
    __init__ : function(name, options)
    {
        if (typeof name !== "string" || name === "")
            console.error("ITundraAPI constructor must be called with 'name' that is a non-empty string!");

        /**
            Name of the API.
            @var {String}
        */
        this.name = name;
        /**
            API options.
            @var {Object}
        */
        this.options = options || {};
        /**
            Staging state.
            @var {Object}
        */
        this.staging =
        {
            initialized : false,
            postInitialized : false
        };
        var loggerName = this.name;
        if (typeof loggerName === "string" && loggerName.length > 3 && loggerName.substring(loggerName.length-3) === "API")
            loggerName = loggerName.substring(0, loggerName.length-3);
        /**
            API logger.
            @var {TundraLogger}
        */
        this.log = TundraLogging.getLogger(loggerName);
    },

    /**
        Called when API has to reset its state. This means any runtime state it has
        that is has created for a client connection into a 3D world. Reusable properties
        like widgets etc. can be kept, but their data/content should be reseted as well.

        @note This function is invoked also after instantiation via the constructor.
    */
    reset : function()
    {
    },

    // Internal
    _initialize : function()
    {
        if (!this.staging.initialized)
        {
            this.initialize();
            this.staging.initialized = true;
        }
    },

    /**
        Called after all core APIs have been instantiated to TundraClient.
    */
    initialize : function()
    {
    },

    // Internal
    _postInitialize : function()
    {
        if (!this.staging.postInitialized)
        {
            this.postInitialize();
            this.staging.postInitialized = true;
        }
    },

    /**
        Called after all plugins have been loaded to TundraClient.
    */
    postInitialize : function()
    {
    }
});

return ITundraAPI;

}); // require js
