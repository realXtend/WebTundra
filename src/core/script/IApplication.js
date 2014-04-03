
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(Class, TundraSDK, TundraLogging) {

/**
    Inteface for creating Tundra JavaScript applications.

    @class IApplication
    @constructor
    @param {String} name Name of the application.

    @example
        // This application would be in a separate file that gets loaded at runtime via EC_Script.
        // The EC_Script component should be setup as run only on client and the scriptRef should point to a .webtundrajs
        // file, which will have the effect of the native Tundra desktop clients not loading it.

        // Example application on how to extend the IApplication interface.
        var MyApplication = IApplication.$extend(
        {
            __init__ : function()
            {
                // Call the base implementation constructor to setup your app correctly.
                this.$super("My Cool Application");

                // Access IApplication properties.
                console.log("This is my app name      :", this.name);
                console.log("This is my script ref    :", this.assetRef)
                console.log("This is my parent entity :", this.entity.toString());

                // Start implementing your application.
                TundraSDK.framework.scene.onEntityCreated(this, this.onEntityCreated);
            },

            // Override onScriptDestroyed from IApplication to handle shutdown.
            // This is a good place to remove your UI elements from the DOM etc.
            onScriptDestroyed : function()
            {
                console.log(this.name, "application is being closed!");
            },

            onEntityCreated : function(entity)
            {
                console.log("Hey a entity was created:", entity.toString());
            }
        })(); // Immediately start the app when this application script file is executed.
*/
var IApplication = Class.$extend(
{
    __init__ : function(name)
    {
        if (name == null)
        {
            TundraSDK.framework.client.log.warn("[IApplication]: Constructor called without a valid application name!", true);
            name = "Unknown Application";
        }
        TundraSDK.framework.client.log.info("Starting " + name + " application");

        /**
            Logger for this application.
            @property log
            @type TundraLogger
        */
        this.log = TundraLogging.getLogger(name);
        /**
            Framework.
            @property framework
            @type TundraSDK.framework
        */
        this.framework = TundraSDK.framework;
        /**
            Name of the application
            @property name
            @type String
        */
        this.name = name;
        /**
            Script reference of this application.
            @property assetRef
            @type String
        */
        this.assetRef = IApplication.assetRef;
        /**
            Parent entity of the application. This is the entity the {{#crossLink "EC_Script"}}{{/crossLink}} running this application is attached to.
            @property entity
            @type Entity
        */
        this.entity = IApplication.entity;
        /**
            Parent component of the application. This is the {{#crossLink "EC_Script"}}{{/crossLink}} component running this script.
            @property component
            @type EC_Script
        */
        this.component = IApplication.component;

        this.eventSubscriptions = [];

        /**
            If this is a startup application or one that was sent from a server.
            @property startupApplication
            @type Boolean
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
        }
    },

    _onScriptDestroyed : function()
    {
        this.onScriptDestroyed();

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

        @method onScriptDestroyed
    */
    onScriptDestroyed : function()
    {
    },

    /**
        Call this function with any event subscriptions you call.
        Once added to the IApplication state it will automatically
        unsubscribe the events when the application is shut down.

        @method subscribeEvent
        @param {EventSubscription} Event subscription returned by EventAPI registration functions.
    */
    subscribeEvent : function(eventSubscription)
    {
        this.eventSubscriptions.push(eventSubscription);
    },

    /**
        Unsubscribes all currently known application event subscriptions.
        @method unsubscribeEvents
    */
    unsubscribeEvents : function()
    {
        for (var i = 0; i < this.eventSubscriptions.length; i++)
            TundraSDK.framework.events.unsubscribe(this.eventSubscriptions[i]);
        this.eventSubscriptions = [];
    }
});

// Global scope exposure of applications that do not use requirejs
window.IApplication = IApplication;

return IApplication;

}); // require js
