
/**
 * WebTundra browser client.
 *
 * Copyright Adminotech Ltd. 2013
 * www.adminotech.com / www.meshmoon.com
 */

define([
        // Core dependencies
        "jquery",
        "lib/jquery-ui",
        "lib/classy",
        // Framework
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        // Include utils into build
        "core/math/MathUtils",
        "core/math/PlaceableUtils",
        // Interfaces
        "core/renderer/IRenderSystem",
        "core/scene/IDomIntegration",
        "core/script/ICameraApplication",
        // Core APIs
        "core/network/Network",
        "core/event/EventAPI",
        "core/audio/AudioAPI",
        "core/config/ConfigAPI",
        "core/console/ConsoleAPI",
        "core/scene/Scene",
        "core/scene/AttributeChange",
        "core/asset/AssetAPI",
        "core/input/InputAPI",
        "core/ui/UiAPI",
        "core/frame/FrameAPI",
        // Network related
        "core/network/LoginMessage",
        // Core Components
        "entity-components/EC_Name",
        "entity-components/EC_Script",
        "entity-components/EC_Avatar",
        "entity-components/EC_DynamicComponent",
        "entity-components/EC_HtmlBillboard"
    ], function(
        // Core dependencies
        $,                          jqueryUI,
        Class,
        // Framework
        Tundra,                     TundraLogging,
        CoreStringUtils,            MathUtils,                  PlaceableUtils,
        // Pluggable interfaces
        IRenderSystem,              IDomIntegration,            ICameraApplication,
        // Core APIs
        Network,                    EventAPI,                   AudioAPI,
        ConfigAPI,                  ConsoleAPI,                 Scene,
        AttributeChange,            AssetAPI,                   InputAPI,
        UiAPI,                      FrameAPI,
        // Network
        LoginMessage,
        // Core Components
        EC_Name,                    EC_Script,
        EC_Avatar,                  EC_DynamicComponent,
        EC_HtmlBillboard) {

var TundraClient = Class.$extend(
/** @lends TundraClient.prototype */
{
    /**
        Tundra client is the entry point for you application. All Tundra functionality will be initialized with the client.

        @constructs
        @param {Object} [options] Invoke {@link Tundra.getDefaultOptions} to see available options.
    */
    __init__ : function(_options)
    {
        Tundra.client = this;

        // Merge input options. 'options' will override any default options.
        // Below deprecated options will be manually set over any default options.
        this.options = TundraClient.mergeOptions(_options);

        // Apply Tundra options
        Tundra.options = this.options.Tundra;

        // Load APIs and modules
        this.log = TundraLogging.getLogger("WebTundra");
        this.log.info(this.getVersion());

        if (typeof this.options.TundraClient.loglevel === "number")
            this.options.TundraClient.loglevel = TundraLogging.levelString(this.options.TundraClient.loglevel);
        TundraLogging.setLevel(this.options.TundraClient.loglevel);

        this.log.debug("Created Tundra", Tundra.options);
        this.log.debug("Created TundraClient", this.options.TundraClient);

        // Check that self registered components have been registered!
        var selfRegistering = [ EC_Name, EC_Script, EC_DynamicComponent, EC_Avatar ];
        for (var i = 0; i < selfRegistering.length; i++)
        {
            if (!Scene.registered(selfRegistering[i]))
                Scene.registerComponent(selfRegistering[i]);
        }

        /**
            DOM container for Tundra.
            @var {jQuery.Element}
        */
        this.container = Tundra.container = this.loadContainer();

        /**
            @var {Array.<ITundraAPI>}
        */
        this.APIs = [];

        /**
            @property audio
            @var {AudioAPI}
        */
        this.audio = Tundra.audio = this.loadAPI("AudioAPI", AudioAPI);
        /**
            @property config
            @var {ConfigAPI}
        */
        this.config = Tundra.config = this.loadAPI("ConfigAPI", ConfigAPI);
        /**
            @property events
            @var {EventAPI}
        */
        this.events = Tundra.events = this.loadAPI("EventAPI", EventAPI);
        /**
            @property network
            @var {Network}
        */
        this.network = Tundra.network = this.loadAPI("Network", Network);
        /**
            @property frame
            @var {FrameAPI}
        */
        this.frame = Tundra.frame = this.loadAPI("FrameAPI", FrameAPI);
        /**
            @property console
            @var {ConsoleAPI}
        */
        this.console = Tundra.console = this.loadAPI("ConsoleAPI", ConsoleAPI);
        /**
            @property asset
            @var {AssetAPI}
        */
        this.asset = Tundra.asset = this.loadAPI("AssetAPI", AssetAPI);
        /**
            @property input
            @var {InputAPI}
        */
        this.input = Tundra.input = this.loadAPI("InputAPI", InputAPI);
        /**
            @property ui
            @var {UiAPI}
        */
        this.ui = Tundra.ui = this.loadAPI("UiAPI", UiAPI);
        /**
            @property scene
            @var {Scene}
        */
        this.scene = Tundra.scene = this.loadAPI("Scene", Scene);
        /**
            @property renderer
            @var {IRenderSystem}
        */
        this.renderer = Tundra.renderer = this.loadRenderer();

        // @todo Remove this, dont document.
        this.domIntegration = null;
        /**
            Used login properties for the current server connection.
            @var {Object}
        */
        this.loginProperties = {};
        /**
            Client connection id.
            @var {Number}
        */
        this.connectionId = 0;

        /**
            If verbose network message debug info should be printed to browsers console.
            Can be passed in the TundraClient contructor parameters or toggled during runtime.
            @property networkDebugLogging
            @type Boolean
        */
        this.networkDebugLogging = this.options.networkDebugLogging;
        /**
            Network protocol version supported by the server
            @property protocolVersion
            @type Number
        */
        this.protocolVersion = Network.protocolVersion.Original;
        /**
            Id for entity that reflects the client's observer position for interest management.
            Set to nonzero to enable sending the observer position & orientation regularly
            @property observerEntityId
            @type Number
        */
        this.observerEntityId = 0;

        // Reset state
        this.reset();

        this.initializeAPIs();

        // Load SDK plugins
        Tundra.loadPlugins(this.options.plugins);

        if (typeof this.renderer === "object" && typeof this.renderer.postInitialize === "function")
            this.renderer.postInitialize();

        this.postInitializeAPIs();

        // Start frame updates
        this.onUpdateInternal();

        // Run startup applications
        if (Object.keys(this.options.TundraClient.applications).length > 0)
        {
            for (var appName in this.options.TundraClient.applications)
                this.runApplication(appName, this.options.TundraClient.applications[appName]);
        }
    },

    /**
        Returns a version string for Tundra client, essential libs and the browser.
        @return {String}
    */
    getVersion : function()
    {
        try
        {
            var versions = [];
            if (typeof window.WebTundraVersion === "object" && typeof window.WebTundraVersion.version === "string")
            {
                if (window.WebTundraVersion.version !== "undefined")
                    versions.push("v" + window.WebTundraVersion.version + " (" + window.WebTundraVersion.commit + ")");
                else
                    versions.push("nightly (" + window.WebTundraVersion.commit + ")");
            }
            else
                versions.push("Developer Mode");
            if (typeof THREE === "object" && THREE.REVISION !== undefined)
                versions.push("THREE " + THREE.REVISION);
            versions.push(Tundra.browser.name() + " " + Tundra.browser.version() + (Tundra.browser.isMobile() ? " [Mobile]" : ""));
            this.version = versions.join(" | ");
        }
        catch(e)
        {
            this.version = "Version detection failed: " + e;
        }
        return this.version;
    },

    loadAPI : function(name, Proto)
    {
        // Copies of the properties are sent over.
        // Nothing should be able to modify then during startup.
        var options = $.extend({}, this.options[name]);
        var api = new Proto(name, options, $.extend({}, this.options));
        this.APIs.push(api);
        this.log.debug("Created", api.name, (Object.keys(api.options).length > 0 ? api.options : ""));
        return api;
    },

    initializeAPIs : function()
    {
        for (var i = 0; i < this.APIs.length; i++)
            this.APIs[i]._initialize();
    },

    postInitializeAPIs : function()
    {
        for (var i = 0; i < this.APIs.length; i++)
            this.APIs[i]._postInitialize();
    },

    loadContainer : function()
    {
        var container = null;
        if (this.options.TundraClient.container === undefined || this.options.TundraClient.container === null)
        {
            container = $("<div/>");
            container.attr("id", "webtundra-container-custom");
            container.css({
                "background-color" : "black",
                "position" : "absolute",
                "z-index"  : 0,
                "top"      : 0,
                "left"     : 0,
                "padding"  : 0,
                "margin"   : 0,
                "width"    : "100%",
                "height"   : "100%",
                "overflow" : "hidden"
            });
            $("body").append(container);
        }
        else
            container = $(this.options.TundraClient.container);
        return container;
    },

    loadRenderer : function()
    {
        var renderer = null;
        if (typeof this.options.TundraClient.renderer === "function")
            renderer = this.options.TundraClient.renderer.register(TundraClient);
        else if (typeof renderer === "string")
            renderer = TundraClient.getRenderSystemByName(renderer);
        if (renderer == null && TundraClient.renderSystems.length > 0)
            renderer = TundraClient.renderSystems[0];

        if (renderer !== null)
        {
            this.log.debug("Loading Renderer", this.options.Renderer);
            renderer._load($.extend({}, this.options.Renderer));
        }
        else
            this.log.error("Failed to load a render system. Registered:", TundraClient.renderSystems);
        return renderer;
    },

    /**
        Resets the client state. Invoked automatically when disconnected from a server.
    */
    reset : function()
    {
        // Reset data
        this.websocket = null;
        this.websocketFaked = false;
        this.loginProperties = {};
        this.connectionId = 0;
        this.authTokens = {};

        if (this.renderer && typeof this.renderer === "object" && typeof this.renderer.reset === "function")
            this.renderer.reset();

        // Reset APIs
        for (var i = 0; i < this.APIs.length; i++)
            this.APIs[i].reset();

        // Reset frametime
        this.lastTime = performance.now();
        // Reset observer
        this.observerEntityId = 0;
        this.network.lastObserverSendTime = 0;

        this.cameraApplications = [];
        this.cameraApplicationIndex = 0;
        this.cameraSwitcherButton = null;
        this.cameraSwitcherMenu = null;
    },

    __classvars__ :
    {
        domIntegrations : [],

        registerDomIntegration : function(domIntegration)
        {
            if (domIntegration instanceof IDomIntegration)
                TundraClient.domIntegrations.push(domIntegration);
            else if (console.error != null)
                console.error("[WebTundra]: registerDomIntegration called with object that is not an instance of IDomIntegration!");
            return (domIntegration instanceof IDomIntegration);
        },

        renderSystems : [],

        /**
            Registers a render system which should be a subclass of {{#crossLink "IRenderSystem"}}{{/crossLink}}
            @memberof TundraClient
            @static
            @param {IRenderSystem} renderSystem
        */
        registerRenderSystem : function(renderSystem)
        {
            if (renderSystem instanceof IRenderSystem)
                TundraClient.renderSystems.push(renderSystem);
            else if (console.error != null)
                console.error("[WebTundra]: registerRenderSystem called with object that is not an instance of IRenderSystem!");
            return (renderSystem instanceof IRenderSystem);
        },

        getRenderSystemByName : function(name)
        {
            for (var i = 0; i < TundraClient.renderSystems.length; i++)
            {
                if (TundraClient.renderSystems[i].name === name)
                    return TundraClient.renderSystems[i];
            }
            TundraClient.log.error("getRenderSystemByName: Failed to find:", name);
            return null;
        },

        /**
            Merge options with default options. The passed in options
            will always override the defaults. Also moves deprecated options
            into the new form and prints a warning if encountered.

            @memberof TundraClient
            @static
            @param {Object} options Input options to merge
            @return {Object} options
        */
        mergeOptions : function(options)
        {
            options = options || {};
            var merged = $.extend({}, options);
            if (!merged.plugins)  merged.plugins = {};
            if (!options.plugins) options.plugins = {};

            var defaults = TundraClient.getDefaultOptions();

            for (var i = 0, apiNames = Tundra.APINames(); i < apiNames.length; i++)
                merged[apiNames[i]] = $.extend(true, {}, defaults[apiNames[i]], options[apiNames[i]]);
            for (var i = 0, pluginNames = Tundra.pluginNames(); i < pluginNames.length; i++)
                merged.plugins[pluginNames[i]] = $.extend(true, {}, defaults.plugins[pluginNames[i]], options.plugins[pluginNames[i]]);

            // If a renderer class is provided, ask it its default options while keeping them overridable
            if (typeof options.TundraClient === "object" && typeof options.TundraClient.renderer === "function" &&
                typeof options.TundraClient.renderer.getDefaultOptions === "function")
            {
                merged.Renderer = $.extend({}, defaults.Renderer, options.TundraClient.renderer.getDefaultOptions(), options.Renderer);
            }
            else
                merged.Renderer = $.extend({}, defaults.Renderer, options.Renderer);

            /* Backwards compatibility. Move old properties into new properties.
               @todo Remove once all clients have been update to new options. */
            var optionDefinedAs = function(obj, key, expectedTypeOf)
            {
                if (Array.isArray(expectedTypeOf))
                {
                    for (var i = 0; i < expectedTypeOf.length; i++)
                    {
                        if (typeof obj[key] === expectedTypeOf[i])
                            return true;
                    }
                    return false;
                }
                else if (typeof expectedTypeOf === "string")
                    return (typeof obj[key] === expectedTypeOf);
                else
                {
                    console.error("Invalid options type check", obj, key, expectedTypeOf);
                    return false;
                }
            };
            var moveOption = function(from, fromKey, to, toKey, warning)
            {
                toKey = toKey || fromKey;
                to[toKey] = from[fromKey];
                delete from[fromKey];

                if (typeof warning === "string" && warning !== "")
                    console.warn("DEPRECATED: TundraClient constructor option:", warning);
            };

            // .polymer > .Tundra.polymer
            if (optionDefinedAs(merged, "polymer", "boolean"))
                moveOption(merged, "polymer", merged.Tundra, "polymer", "options.polymer > options.Tundra.polymer");
            // .requirejs > .Tundra.requirejs
            if (optionDefinedAs(merged, "requirejs", "boolean"))
                moveOption(merged, "requirejs", merged.Tundra, "requirejs", "options.requirejs > options.Tundra.requirejs");

            // .container > .TundraClient.container
            if (optionDefinedAs(merged, "container", [ "string", "object" ]))
                moveOption(merged, "container", merged.TundraClient, "container", "options.container > options.TundraClient.container");
            // .renderSystem > .TundraClient.renderer
            if (optionDefinedAs(merged, "renderSystem", [ "string", "object", "function" ]))
                moveOption(merged, "renderSystem", merged.TundraClient, "renderer", "options.renderSystem > options.TundraClient.renderer");
            // .applications > .TundraClient.applications
            if (optionDefinedAs(merged, "applications", "object"))
                moveOption(merged, "applications", merged.TundraClient, "applications", "options.applications > options.TundraClient.applications");
            // .container > .TundraClient.container
            if (optionDefinedAs(merged, "loglevel", [ "string", "number" ]))
                moveOption(merged, "loglevel", merged.TundraClient, "loglevel", "options.loglevel > options.TundraClient.loglevel");

            // .asset.localStoragePath > .AssetAPI.storages["webtundra://"]
            if (typeof merged.asset === "object" && optionDefinedAs(merged.asset, "localStoragePath", "string"))
            {
                moveOption(merged.asset, "localStoragePath", merged.AssetAPI.storages, "webtundra://", 'options.asset.localStoragePath > options.AssetAPI.storages["webtundra://"]');
                if (Object.keys(merged.asset).length === 0) delete merged.asset;
            }

            // .taskbar > .UiAPI.taskbar
            if (optionDefinedAs(merged, "taskbar", "boolean"))
                moveOption(merged, "taskbar", merged.UiAPI, "taskbar", "options.taskbar > options.UiAPI.taskbar");
            // .console > .UiAPI.console
            if (optionDefinedAs(merged, "console", "boolean"))
                moveOption(merged, "console", merged.UiAPI, "console", "options.console > options.UiAPI.console");
            // .allowFullscreen > .UiAPI.allowFullscreen
            if (optionDefinedAs(merged, "allowFullscreen", "boolean"))
                moveOption(merged, "allowFullscreen", merged.UiAPI, "allowFullscreen", "options.allowFullscreen > options.UiAPI.allowFullscreen");
            // .showfps > .UiAPI.fps
            if (optionDefinedAs(merged, "showfps", "boolean"))
                moveOption(merged, "showfps", merged.UiAPI, "fps", "options.showfps > options.UiAPI.fps");

            // .networkDebugLogging > .Network.debug
            if (optionDefinedAs(merged, "networkDebugLogging", "boolean"))
                moveOption(merged, "networkDebugLogging", merged.Network, "debug", "options.networkDebugLogging > options.Network.debug");

            return merged;
        },

        /**
            Returns default options object. The object documents what options
            are available for the application to override. Only modules that are
            registered at the time of invocation are included in options.plugins.

            @memberof TundraClient
            @static
            @return {Object} options
        */
        getDefaultOptions : function()
        {
            var options = { plugins : {} };

            for (var i = 0, apiNames = Tundra.APINames(); i < apiNames.length; i++)
                options[apiNames[i]] = {};
            for (var i = 0, pluginNames = Tundra.pluginNames(); i < pluginNames.length; i++)
                options.plugins[pluginNames[i]] = {};

            $.extend(options.TundraClient, {
                loglevel  : "info",
                container : null,
                renderer  : null,
                applications : {}
            });

            $.extend(options.Tundra, Tundra.getDefaultOptions());
            $.extend(options.Network, Network.getDefaultOptions());
            $.extend(options.AudioAPI, AudioAPI.getDefaultOptions());
            $.extend(options.UiAPI, UiAPI.getDefaultOptions());
            $.extend(options.AssetAPI, AssetAPI.getDefaultOptions());

            options.Renderer = IRenderSystem.getDefaultOptions();

            return options;
        },
    },

    getDefaultOptions : function()
    {
        return TundraClient.getDefaultOptions();
    },

    setDomIntegration : function(domIntegration)
    {
        if (this.domIntegration !== undefined && this.domIntegration !== null)
            this.domIntegration._unload();

        this.domIntegration = domIntegration;
        this.domIntegration._load();
    },

    registerCameraApplication : function(name, application)
    {
        if (!(application instanceof ICameraApplication))
        {
            console.error("[WebTundra]: registerCameraApplication called with object that is not an instance of ICameraApplication!");
            return;
        }

        for (var i = 0; i < this.cameraApplications.length; i++)
        {
            if (this.cameraApplications[i].name === name)
            {
                console.error("[WebTundra]: Camera application '" + name + "' already registered!");
                return;
            }
        }

        this.cameraApplications.push({
            "name"        : name,
            "application" : application
        });

        // We wont be needing a selection button if only one camera app is running
        if (this.cameraApplications.length <= 1)
            return;

        var that = this;
        if (this.cameraSwitcherButton != null)
        {
            // Menu exists, add new item
            this.ui.addContextMenuItems(this.cameraSwitcherMenu, {
                name     : name,
                callback : function() {
                    that.activateCameraApplication($(this).data("itemName"));
                }
            });
            return;
        }

        // Create taskbar action and attache context menu to it
        this.cameraSwitcherButton = this.ui.addAction("Change Camera (shift+tab)", "http://meshmoon.data.s3.amazonaws.com/icons/pictos1/24/209.png", 40, false);
        this.cameraSwitcherMenu = this.ui.addContextMenu(this.cameraSwitcherButton, true, true);

        // Add context menu items
        for (var i = 0; i < this.cameraApplications.length; i++)
        {
            this.ui.addContextMenuItems(this.cameraSwitcherMenu, {
                name     : this.cameraApplications[i].name,
                callback : function() {
                    that.activateCameraApplication($(this).data("itemName"));
                }
            });
        }

        this.input.onKeyPress(this, function(keyEvent) {
            if (keyEvent.originalEvent.shiftKey && (keyEvent.keyCode === 9 || keyEvent.key === "tab"))
            {
                if (keyEvent.targetNodeName === "body" || keyEvent.targetNodeName === "canvas")
                {
                    this.cameraApplicationIndex++;
                    if (this.cameraApplicationIndex >= this.cameraApplications.length)
                        this.cameraApplicationIndex = 0;
                    this.activateCameraApplication(this.cameraApplications[this.cameraApplicationIndex].name);

                    keyEvent.originalEvent.preventDefault();
                }
            }
        });
    },

    activateCameraApplication : function(name)
    {
        for (var i = 0; i < this.cameraApplications.length; i++)
        {
            if (this.cameraApplications[i].name === name)
            {
                this.cameraApplicationIndex = i;
                this.cameraApplications[i].application._activateCameraApplication();
                return;
            }
        }
    },

    setAuthToken : function(name, value)
    {
        this.authTokens[name] = value;
    },

    getAuthToken : function(name)
    {
        return this.authTokens[name];
    },

    /**
        Runs a client side application by creating a local entity.
        Useful for startup apps after the client has been instantiated on a page.

        This function is called automatically with {{#crossLink "TundraClient"}}{{/crossLink}} 'applications' constructor parameters.

        @param {String} applicationName Application name. This will be used as the local entitys name that will hold the script component.
        @param {String} scriptRef Application script URL or relative path.
        @return {Entity} The local entity that holds the script component.
    */
    runApplication : function(applicationName, scriptRef)
    {
        if (Scene.registeredComponent("Script") == null)
        {
            this.log.error("runApplication: Cannot run script '" + scriptRef + "', Script component not registered.");
            return null;
        }
        var appEnt = this.scene.createLocalEntity(["Name", "Script"]);
        appEnt.name = applicationName || "Startup Application";

        appEnt.script.startupApplication = true;
        appEnt.script.attributes.runMode.set(EC_Script.RunMode.Client, AttributeChange.LocalOnly);
        appEnt.script.attributes.runOnLoad.set(true, AttributeChange.LocalOnly);
        appEnt.script.attributes.scriptRef.set([scriptRef], AttributeChange.LocalOnly);
        return appEnt;
    },

    /**
        Finds a Entity with a Script component.

        @param {String} entityName - Name of the parent entity
        @param {String} [componentName] - Optional script component name
        @return {Entity|undefined}
    */
    findApplicationEntity : function(entityName, componentName)
    {
        var scripts = this.scene.entitiesWithComponent("Script");
        for (var i = 0; i < scripts.length; i++)
        {
            if (scripts[i].name === entityName)
                return scripts[i];
        }
        return undefined;
    },

    /**
        Finds the first application instance from Entity with a Script component.

        @param {String} entityName - Name of the parent entity
        @param {String} [componentName] - Optional script component name
        @return {Object|undefined}
    */
    findApplication : function(entityName, componentName, allInstances)
    {
        var entity = this.findApplicationEntity(entityName);
        if (entity && entity.script && entity.script.scriptAsset && Array.isArray(entity.script.scriptAsset.instances))
        {
            if (allInstances === true)
                return entity.script.scriptAsset.instances;

            // @note This wont work if the entity has multiple EC_Scripts.
            // In this case we have no way of knowing which components we want, so return the first
            var instance = entity.script.scriptAsset._getInstance(entity, entity.script)
            if (instance)
                return (instance && instance.application ? instance.application : undefined);

            for (var i = 0; i < instances.length; i++)
            {
                if (instances[i] && typeof instances[i] === "object" && instances[i].application)
                    return instances[i].application;
            }
        }
        return undefined;
    },

    /**
        Registers a callback for when client connects to the server.

            Tundra.client.onConnected(null, function() {
                console.log("The eagle has landed!");
            });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onConnected : function(context, callback)
    {
        return Tundra.events.subscribe("TundraClient.Connected", context, callback);
    },

    /**
        Registers a callback for client connection errors.

            Tundra.client.onConnectionError(null, function(event) {
                console.error("RED ALERT: " + event);
            });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onConnectionError : function(context, callback)
    {
        return Tundra.events.subscribe("TundraClient.ConnectionError", context, callback);
    },

    /**
        Registers a callback for when client disconnects from the server.

            Tundra.client.onDisconnected(null, function() {
                console.log("Elvis has left the building!");
            });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onDisconnected : function(context, callback)
    {
        return Tundra.events.subscribe("TundraClient.Disconnected", context, callback);
    },

    /**
        Registers a callback for log info prints. Note: Important messages is ones are already
        logged to `console.log()` and the UI console if one has been created.

            Tundra.client.onLogInfo(null, function(message) {
                console.log("LogInfo:", message);
            });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onLogInfo : function(context, callback)
    {
        return Tundra.events.subscribe("TundraClient.LogInfo", context, callback);
    },

    /**
        Registers a callback for log warning prints. Note: Important messages is ones are already
        logged to `console.warn()` and the UI console if one has been created.

            Tundra.client.onLogWarning(null, function(message) {
                console.warn("LogWarning:", message);
            });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onLogWarning : function(context, callback)
    {
        return Tundra.events.subscribe("TundraClient.LogWarning", context, callback);
    },

    /**
        Registers a callback for log error prints. Note: Important messages is ones are already
        logged to `console.error()` and the UI console if one has been created.

            Tundra.client.onLogError(null, function(message) {
                console.log("LogError:", message);
            });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onLogError : function(context, callback)
    {
        return Tundra.events.subscribe("TundraClient.LogError", context, callback);
    },

    onUpdateInternal : function()
    {
        var that = Tundra.client;
        requestAnimationFrame(that.onUpdateInternal);

        var timeNow = performance.now()
        var frametime = (timeNow - that.lastTime);
        frametimeMsec = frametime;
        frametime = frametime / 1000.0;
        that.lastTime = timeNow;

        if (that.frame.limiter !== undefined)
        {
            if (!that.frame._limit(frametime))
                return;
            frametime += that.frame.limiter.step;
        }

        that.frame._update(frametime);

        // Update APIs
        that.asset.update(frametime);
        that.scene.update(frametime);

        that.frame._preRender(frametime);

        // Render scene
        that.renderer.update(frametime, frametimeMsec);

        // Update interest management
        if (that.observerEntityId > 0)
            that.network.updateObserver(timeNow);

        that.frame._postUpdate(frametime);
    },

    /**
        Logs a info message. Always sends the event to {{#crossLink "TundraClient/onLogInfo:method"}}{{/crossLink}}
        callbacks and optionally logs to the browsers console.

        @param {String} message Log message.
        @param {Boolean} toBrowserConsole If the message should be logged to the browsers console.log function.
    */
    logInfo : function(message, toBrowserConsole)
    {
        if (toBrowserConsole === undefined || toBrowserConsole == null)
            toBrowserConsole = false;
        if (toBrowserConsole && console.log != null)
            console.log(message);

        Tundra.events.send("TundraClient.LogInfo", message);
    },

    /**
        Logs a warning message. Always sends the event to {{#crossLink "TundraClient/onLogWarning:method"}}{{/crossLink}}
        callbacks and optionally logs to the browsers console.

        @param {String} message Log message.
        @param {Boolean} toBrowserConsole If the message should be logged to the browsers console.warn function.
    */
    logWarning : function(message, toBrowserConsole)
    {
        if (toBrowserConsole === undefined || toBrowserConsole == null)
            toBrowserConsole = false;
        if (toBrowserConsole && console.warn != null)
            console.warn(message);

        Tundra.events.send("TundraClient.LogWarning", message);
    },

    /**
        Logs a error message. Always sends the event to {{#crossLink "TundraClient/onLogWarning:method"}}{{/crossLink}}
        callbacks and optionally logs to the browsers console.

        @param {String} message Log message.
        @param {Boolean} toBrowserConsole If the message should be logged to the browsers console.error function.
    */
    logError : function(message, toBrowserConsole)
    {
        if (toBrowserConsole === undefined || toBrowserConsole == null)
            toBrowserConsole = false;
        if (toBrowserConsole && console.error != null)
            console.error(message);

        Tundra.events.send("TundraClient.LogError", message);
    },

    /**
        Returns if there is a active connection to a WebSocket host.

        @return {Boolean}
    */
    isConnected : function()
    {
        // @todo This is a hack, do local scene sessions available
        if (this.websocketFaked === true)
            return true;
        return this._isWebSocketConnected();
    },

    // Internal for detecting
    _isWebSocketConnected : function()
    {
        if (this.websocket == null)
            return false;
        else if (this.websocket.readyState !== 3) // CLOSED
            return true;
        return false;
    },

    /**
        Connects to a WebSocket host with login properties and returns if successful.

        @param {String} host Host with port
        @param {Object} loginProperties This object will get serialized into JSON and sent to the server.
        @example
            client.connect("ws://localhost:2345", { username  : "WebTundra user" });
        @return {Object} Result object
        <pre>{
            success   : Boolean,
            reason    : String      // Only defined if success == false
        }</pre>
    */
    connect : function(host, loginProperties)
    {
        if (typeof host !== "string")
        {
            this.log.error("connect() called with non-string 'host'");
            return { success : false, reason : "Host not a string" };
        }

        host = host.trim();
        if (CoreStringUtils.startsWith(host, "http://", true))
            host = host.substring(7);
        else if (CoreStringUtils.startsWith(host, "https://", true))
            host = host.substring(8);
        if (!CoreStringUtils.startsWith(host, "ws://") && !CoreStringUtils.startsWith(host, "wss://"))
            host = "ws://" + host;

        try
        {
            this.websocket = new WebSocket(host);
        }
        catch(e)
        {
            return { success : false, reason : "This browser does not support WebSocket connections" };
        }

        // Configure and connect websocket connection
        this.websocket.binaryType = "arraybuffer";
        this.websocket.onopen = this.onWebSocketConnectionOpened;
        this.websocket.onerror = this.onWebSocketConnectionError;
        this.websocket.onclose = this.onWebSocketConnectionClosed;
        this.websocket.onmessage = this.onWebSocketMessage;

        // Store the login properties
        this.loginProperties = (loginProperties !== undefined && loginProperties !== null ? loginProperties : {});
        return { success : true };
    },

    fakeConnectionState : function()
    {
        if (this.isConnected())
            return;

        this.websocketFaked = true;

        // Fire fake event
        this.events.send("TundraClient.Connected");
    },

    /**
        Disconnects if there is a active websocket connection.
    */
    disconnect : function()
    {
        if (this.websocket != null)
            this.websocket.close();
        else if (this.websocketFaked)
            this.events.send("TundraClient.Disconnected", {});

        /* @note This does a double reset. Second one happens in onWebSocketConnectionClosed.
           Investigate what happens if this is only done here when there is no active connection. */
        this.reset();
    },

    onWebSocketConnectionOpened : function(event)
    {
        var that = Tundra.client;
        that.log.infoC("Server connection established");

        // Send login message
        var message = new LoginMessage();
        message.serialize(JSON.stringify(that.loginProperties));
        Tundra.network.send(message, event);

        // Fire event
        that.events.send("TundraClient.Connected");
    },

    onWebSocketConnectionError : function(event)
    {
        var that = Tundra.client;
        that.log.errorC("Failed to connect to", event.target.url);
        that.events.send("TundraClient.ConnectionError", event);
    },

    onWebSocketConnectionClosed : function(event)
    {
        var that = Tundra.client;
        that.log.infoC("Server connection disconnected");
        that.events.send("TundraClient.Disconnected", event);

        // Reset client and all APIs
        that.reset();
    },

    onWebSocketMessage : function(event)
    {
        var that = Tundra.client;

        // Binary frame
        if (typeof event.data !== "string")
        {
            Tundra.client.network.receive(event.data);
            event.data = null;
        }
        // String frame, just log it..
        else
            that.log.info("Server sent a unexpected string message '" + event.data + "'");
    }
});

return TundraClient;

}); // require js
