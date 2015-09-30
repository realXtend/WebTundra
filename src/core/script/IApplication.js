
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/asset/AssetAPI"
    ], function(Class, Tundra, TundraLogging, AssetAPI) {

var IApplication = Class.$extend(
/** @lends IApplication.prototype */
{
    /**
        Interface for creating Tundra JavaScript applications.

        @constructs
        @param {String} name Name of the application.

        * @example
        * // This application would be in a separate file that gets loaded at runtime via EC_Script.
        * // The EC_Script component should be setup as run only on client and the scriptRef should point to a .webtundrajs
        * // file, which will have the effect of the native Tundra desktop clients not loading it.
        * // For example "http://myasset.com/scripts/MyCoolApp.webtundrajs".
        *
        * // Example application on how to extend the IApplication interface.
        * var MyApplication = IApplication.$extend(
        * {
        *     __init__ : function()
        *     {
        *         // Call the base implementation constructor to setup your app correctly.
        *         this.$super("My Cool Application");
        *
        *         // Access IApplication properties.
        *         console.log("This is my app name      :", this.name);
        *         console.log("This is my script ref    :", this.assetRef)
        *         console.log("This is my parent entity :", this.entity.toString());
        *
        *         // Start implementing your application.
        *         Tundra.scene.onEntityCreated(this, this.onEntityCreated);
        *     },
        *
        *     // Override onScriptDestroyed from IApplication to handle shutdown.
        *     // This is a good place to remove your UI elements from the DOM etc.
        *     onScriptDestroyed : function()
        *     {
        *         console.log(this.name, "application is being closed!");
        *     },
        *
        *     onEntityCreated : function(entity)
        *     {
        *         console.log("Hey a entity was created:", entity.toString());
        *     }
        * })(); // Immediately start the app when this application script file is executed.
    */
    __init__ : function(name)
    {
        if (name == null)
        {
            Tundra.client.log.warn("[IApplication]: Constructor called without a valid application name!", true);
            name = "Unknown Application";
        }
        Tundra.client.log.info("Starting " + name + " application");

        /**
            Logger for this application.
            @var {TundraLogger}
        */
        this.log = TundraLogging.getLogger(name);
        /**
            Framework.
            @var {Tundra}
        */
        this.framework = Tundra.framework;
        /**
            Name of the application
            @var {String}
        */
        this.name = name;
        /**
            Script reference of this application.
            @var {String}
        */
        this.assetRef = IApplication.assetRef;
        /**
            Parent entity of the application. This is the entity the {{#crossLink "EC_Script"}}{{/crossLink}} running this application is attached to.
            @var {Entity}
        */
        this.entity = IApplication.entity;
        /**
            Parent component of the application. This is the {{#crossLink "EC_Script"}}{{/crossLink}} component running this script.
            @var {EC_Script}
        */
        this.component = IApplication.component;

        this.eventSubscriptions = [];

        /**
            If this is a startup application or one that was sent from a server.
            @var {Boolean}
        */
        this.startupApplication = IApplication.startupApplication;

        // Register instance to the script asset.
        try
        {
            if (IApplication.parentScriptAsset !== undefined && IApplication.parentScriptAsset !== null)
                IApplication.parentScriptAsset._setApplication(this);
        }
        catch(e)
        {
            console.error("[IApplication]: Failed to register " + this.name + ": " + e);
            if (e.stack !== undefined)
                console.error(e);
        }
    },

    __classvars__ :
    {
        entity              : null,
        component           : null,
        assetRef            : null,
        startupApplication  : null,
        parentScriptAsset   : null,

        _setupStatic : function(entity, component, assetRef, startupApplication, parentScriptAsset)
        {
            IApplication.assetRef = assetRef;
            IApplication.entity = entity;
            IApplication.component = component;
            IApplication.startupApplication = startupApplication;
            IApplication.parentScriptAsset = parentScriptAsset;
        },

        _resetStatic : function()
        {
            IApplication.entity = null;
            IApplication.component = null;
            IApplication.assetRef = null;
            IApplication.startupApplication = null;
            IApplication.parentScriptAsset = null;
        },

        /**
            Loads arbitrary number of JavaScript files.

            @static
            @param {IApplication} application The application instance that is requesting these references.
            This instance will be used as the context for resolving relative ref dependencies.
            @param {String} dependencyRef After context you can pass in any number of asset references.
            @return {jQuery.Promise}
        */
        loadDependencies : function(application)
        {
            if (!(application instanceof IApplication))
            {
                console.error("[IApplication]: loadDependencies: First parameter must be a IApplication instance given:", application);
                return $.Deferred(function(defer) {
                    defer.reject();
                }).promise();
            }
            arguments[0] = application.assetRef;
            return AssetAPI.loadDependencies.apply(AssetAPI, arguments);
        }
    },

    _onScriptDestroyed : function()
    {
        try
        {
            this.onScriptDestroyed();
        }
        catch(e)
        {
            console.error("IApplication.onScriptDestroyed:", this.name, this.entity);
            console.error(e);
        }

        this.name = null;
        this.assetRef = null;
        this.entity = null;
        this.component = null;
        this.startupApplication = null;
        this.framework = null;

        this.unsubscribeEvents();
    },

    /**
        Called when the script is being unloaded.
        IApplication implementations should override this if it wants to handle this event.
    */
    onScriptDestroyed : function()
    {
    },

    /**
        Resolve an asset reference as the script asset ref as a context.
        This fuction correctly handles
        1) absolute URLs
        2) webtundra:// etc. custom scheme refs, they are resolved according to registered storages
        3) relative refs are resolved with the base URL of the script asset ref.

        @param {String} ref
        @return {String}

        * @example
        * Tundra.asset.requestAsset(this.resolveRef(someData.mightBeAbsoluteOrRelativeRef));
        * Tundra.asset.requestAsset(this.resolveRef("assets/data.json"));
        * Tundra.asset.requestAsset(this.resolveRef("webtundra://media/textures/skybox.dds"));
    */
    resolveRef : function(ref)
    {
         var context = Tundra.asset.resolveAssetRef("", this.assetRef);
         return Tundra.asset.resolveAssetRef(context, ref);
    },

    /**
        Call this function with any event subscriptions you call.
        Once added to the IApplication state it will automatically
        unsubscribe the events when the application is shut down.

        @param {EventSubscription} Event subscription returned by EventAPI registration functions.
    */
    subscribeEvent : function(eventSubscription)
    {
        if (eventSubscription !== undefined)
            this.eventSubscriptions.push(eventSubscription);
    },

    /**
        Unsubscribes all currently known application event subscriptions.
    */
    unsubscribeEvents : function()
    {
        for (var i = 0; i < this.eventSubscriptions.length; i++)
            Tundra.events.unsubscribe(this.eventSubscriptions[i]);
        this.eventSubscriptions = [];
    }
});

// Global scope exposure of applications that do not use requirejs
window.IApplication = IApplication;

return IApplication;

}); // require js
