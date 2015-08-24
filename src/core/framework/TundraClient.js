
define([
        // Core dependencies
        "lib/jquery",
        "lib/jquery-ui",
        "lib/classy",
        // Framework
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        // Interfaces
        "core/renderer/IRenderSystem",
        "core/scene/IDomIntegration",
        "core/script/ICameraApplication",
        // Core APIs
        "core/network/Network",
        "core/event/EventAPI",
        "core/console/ConsoleAPI",
        "core/scene/Scene",
        "core/scene/AttributeChange",
        "core/asset/AssetAPI",
        "core/input/InputAPI",
        "core/ui/UiAPI",
        "core/frame/FrameAPI",
        // Network related
        "core/network/TundraMessageHandler",
        "core/network/LoginMessage",
        // Core Components
        "entity-components/EC_Name",
        "entity-components/EC_Script",
        "entity-components/EC_Avatar",
        "entity-components/EC_DynamicComponent"
    ], function(
        // Core dependencies
        $,                          jqueryUI,
        Class,
        // Framework
        TundraSDK,                  TundraLogging,              CoreStringUtils,
        // Pluggable interfaces
        IRenderSystem,              IDomIntegration,            ICameraApplication,
        // Core APIs
        Network,                    EventAPI,                   ConsoleAPI,
        Scene,                      AttributeChange,            AssetAPI,
        InputAPI,                   UiAPI,                      FrameAPI,
        // Network messages
        TundraMessageHandler,       LoginMessage,
        // Core Components
        EC_Name,                    EC_Script,
        EC_Avatar,                  EC_DynamicComponent) {
/**
    Tundra client that exposes the instantiates the TundraSDK and its APIs.
    Main entry point for app developers that want to leverage the realXtend WebTundra SDK.

    @class TundraClient
    @constructor
    @example
        var client = new TundraClient({
            // Container element id for Web Rocket. Default: If not passed a full screen container is created.
            container : "#webtundra-container-custom",

            // Render system selection. Default: Empty string, equals to picking the first registered renderer.
            // This can be the name of the render system if it has been registered via TundraClient.registerRenderSystem
            // or the prototype of the wanter renderer. In this case it will be registered, instantiated and set as the
            // current renderer.
            renderSystem   : "three.js",

            // Maps startup application names to scriptRefs. Default: Empty map.
            applications : {
                "Application name" : scriptRef
            },

            // If taskbar should be created. Default: true.
            taskbar   : true,

            // If console should be created. Default: true.
            console   : true,

            // If verbose network message debug info should be printed to browsers console. Default: false.
            networkDebugLogging : false,

            // Asset related information
            asset     : {
                // Storage path webtundra:// refs will be resovled to. Default: Same path as the hosted page.
                localStoragePath : ""
            }
        });
    @param {Object} [params={}] An configuration object that setups the client.
    @return {TundraClient}
*/
var TundraClient = Class.$extend(
{
    __init__ : function(params)
    {
        TundraSDK.framework.client = this;

        // Default params
        // @todo Nicer sytax here with 'params.something = params.something || <default-value>;'?
        // @todo Move these to be done by the code that is expecting the values, stupid to do here.
        if (params === undefined || params === null)
            params = {};
        if (params.renderSystem === undefined || params.renderSystem === null)
            params.renderSystem = "";
        if (params.applications === undefined || params.applications === null)
            params.applications = {};
        if (params.taskbar === undefined || params.taskbar === null)
            params.taskbar = true;
        if (params.console === undefined || params.console === null)
            params.console = true;
        if (params.networkDebugLogging === undefined || params.networkDebugLogging === null)
            params.networkDebugLogging = false;
        if (params.asset === undefined || params.asset === null)
            params.asset = {};
        if (params.asset.localStoragePath === undefined)
            params.asset.localStoragePath = "";
        if (params.container === undefined || params.container === null)
        {
            /**
                DOM container for this WebTundra client.
                @property container
                @type jQuery Element
            */
            this.container = $("<div/>");
            this.container.attr("id", "webtundra-container");
            this.container.css({
                "background-color" : "black",
                "position" : "absolute",
                "z-index"  : 0,
                "top"      : 0,
                "left"     : 0,
                "padding"  : 0,
                "margin"   : 0,
                "width"    : "100%",
                "height"   : "100%"
            });
            $("body").append(this.container);
        }
        else
            this.container = $(params.container);

        // DEBUG if in development requirejs environment, INFO for production.
        if (params.loglevel === undefined || params.loglevel === null)
            params.loglevel = (typeof require === "function" ? TundraLogging.Level.DEBUG : TundraLogging.Level.INFO);
        TundraLogging.setLevel(typeof params.loglevel === "string" ? params.loglevel.toUpperCase() : params.loglevel);

        this.log = TundraLogging.getLogger("WebTundra");

        /**
            @property frame
            @type FrameAPI
        */
        this.frame = new FrameAPI(params);
        TundraSDK.framework.frame = this.frame;

        /**
            @property network
            @type Network
        */
        this.network = new Network(params);
        this.network.registerMessageHandler(new TundraMessageHandler());
        TundraSDK.framework.network = this.network;

        /**
            @property events
            @type EventAPI
        */
        this.events = new EventAPI(params);
        TundraSDK.framework.events = this.events;

        /**
            @property console
            @type ConsoleAPI
        */
        this.console = new ConsoleAPI(params);
        TundraSDK.framework.console = this.console;

        /**
            @property scene
            @type Scene
        */
        this.scene = new Scene(params);
        TundraSDK.framework.scene = this.scene;

        /**
            @property asset
            @type AssetAPI
        */
        this.asset = new AssetAPI(params);
        TundraSDK.framework.asset = this.asset;

        /**
            @property input
            @type InputAPI
        */
        this.input = new InputAPI(params);
        TundraSDK.framework.input = this.input;

        /**
            @property ui
            @type UiAPI
        */
        this.ui = new UiAPI(params);
        TundraSDK.framework.ui = this.ui;
        
        /**
            @property renderer
            @type IRenderSystem
        */
        this.renderer = null;

        // Passed in 'renderSystem' is a prototype of the wanted renderer, register and use it.
        if (typeof params.renderSystem === "function")
            this.renderer = params.renderSystem.register(TundraClient);
        else if (typeof params.renderSystem === "string" && params.renderSystem !== "")
        {
            for (var i = 0; i < TundraClient.renderSystems.length; i++)
            {
                if (CoreStringUtils.trim(TundraClient.renderSystems[i].name).toLowerCase() === CoreStringUtils.trim(params.renderSystem).toLowerCase())
                {
                    this.renderer = TundraClient.renderSystems[i];
                    break;
                }
            }
            if (this.renderer == null)
            {
                this.log.warn("Could not find a requested render system with name '" + params.renderSystem + "'. Picking the first registered system instead!");
                if (TundraClient.renderSystems.length > 0)
                    this.renderer = TundraClient.renderSystems[0];
            }
        }
        else if (TundraClient.renderSystems.length > 0)
            this.renderer = TundraClient.renderSystems[0];

        if (this.renderer != null)
            this.renderer._load(params);
        else
            this.log.error("Failed to load a render system!");
        TundraSDK.framework.renderer = this.renderer;

        /**
            @property domIntegration
            @type IDomIntegration
        */
        this.domIntegration = null;

        /**
            Used login properties for the current server connection.
            @property loginProperties
            @type Object
        */
        this.loginProperties = {};
        /**
            Client connection id.
            @property connectionId
            @type Number
        */
        this.connectionId = 0;
        /**
            If verbose network message debug info should be printed to browsers console.
            Can be passed in the TundraClient contructor parameters or toggled during runtime.
            @property networkDebugLogging
            @type Boolean
        */
        this.networkDebugLogging = params.networkDebugLogging;

        // Reset state
        this.reset();

        // Post init APIs
        this.ui.postInitialize();
        this.asset.postInitialize();
        this.input.postInitialize();
        this.scene.postInitialize();

        // Load plugins
        this.loadPlugins();

        if (this.renderer != null)
            this.renderer.postInitialize();

        // Start frame updates
        this.onUpdateInternal();

        // Console commands
        this.console.registerCommand("disconnect", "Disconnects the active server connection", null, this, this.disconnect);

        // Run startup apps
        for (var appName in params.applications)
            this.runApplication(appName, params.applications[appName]);
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

        registerRenderSystem : function(renderSystem)
        {
            if (renderSystem instanceof IRenderSystem)
                TundraClient.renderSystems.push(renderSystem);
            else if (console.error != null)
                console.error("[WebTundra]: registerRenderSystem called with object that is not an instance of IRenderSystem!");
            return (renderSystem instanceof IRenderSystem);
        }
    },

    loadPlugins : function()
    {
        // Protect accidental/malicious double loading.
        if (this.pluginsLoaded === true)
            return;
        this.pluginsLoaded = true;

        /// @todo Figure out if there is a sensible point where
        /// the plugins should be uninitialized, currently not
        /// done but its part of the interface.
        
        // Load TundraSDK registerd plugins
        for (var i = 0; i < TundraSDK.plugins.length; i++)
        {
            try
            {
                this.log.debug("Loading", TundraSDK.plugins[i].name);
                TundraSDK.plugins[i]._initialize();
            } 
            catch(e)
            {
                this.log.error("Failed to initialize " + TundraSDK.plugins[i].name + ":", e);
            }
        }
        // Post init plugins now that all plugins have been loaded.
        for (var i = 0; i < TundraSDK.plugins.length; i++)
        {
            try
            {
                TundraSDK.plugins[i]._postInitialize();
            } 
            catch(e)
            {
                this.log.error("Failed to postInitialize " + TundraSDK.plugins[i].name + ":", e);
            }
        }
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
        this.cameraSwitcherButton = this.ui.addAction("Select Camera Mode (Tab)", 
            TundraSDK.framework.asset.getLocalAssetPath("img/icons/icon-camera.png"), 40, false);
        this.cameraSwitcherMenu = this.ui.addContextMenu(this.cameraSwitcherButton, true, true, function() {
            that.cameraSwitcherButton.tooltip("close");
        });

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
            if (keyEvent.keyCode === 9 || keyEvent.key === "tab")
            {
                this.cameraApplicationIndex++;
                if (this.cameraApplicationIndex >= this.cameraApplications.length)
                    this.cameraApplicationIndex = 0;
                this.activateCameraApplication(this.cameraApplications[this.cameraApplicationIndex].name);

                keyEvent.originalEvent.preventDefault();
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
        try
        {
            return this.authTokens[name];
        }
        catch (e)
        {
            return null;
        }
    },

    /**
        Runs a client side application by creating a local entity.
        Useful for startup apps after the client has been instantiated on a page.

        This function is called automatically with {{#crossLink "TundraClient"}}{{/crossLink}} 'applications' constructor parameters.
        @method runApplication
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
        appEnt.name = applicationName;

        appEnt.script.startupApplication = true;
        appEnt.script.attributes.runMode.set(EC_Script.RunMode.Client, AttributeChange.LocalOnly);
        appEnt.script.attributes.runOnLoad.set(true, AttributeChange.LocalOnly);
        appEnt.script.attributes.scriptRef.set([scriptRef], AttributeChange.LocalOnly);
        return appEnt;
    },

    /**
        Registers a callback for when client connects to the server.

            TundraSDK.framework.client.onConnected(null, function() {
                console.log("The eagle has landed!");
            });

        @method onConnected
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onConnected : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("TundraClient.Connected", context, callback);
    },

    /**
        Registers a callback for client connection errors.

            TundraSDK.framework.client.onConnectionError(null, function(event) {
                console.error("RED ALERT: " + event);
            });

        @method onConnectionError
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onConnectionError : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("TundraClient.ConnectionError", context, callback);
    },

    /**
        Registers a callback for when client disconnects from the server.

            TundraSDK.framework.client.onDisconnected(null, function() {
                console.log("Elvis has left the building!");
            });

        @method onDisconnected
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onDisconnected : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("TundraClient.Disconnected", context, callback);
    },

    /**
        Registers a callback for log info prints. Note: Important messages is ones are already
        logged to console.log() and the UI console if one has been created.

            TundraSDK.framework.client.onLogInfo(null, function(message) {
                console.log("LogInfo:", message);
            });

        @method onLogInfo
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onLogInfo : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("TundraClient.LogInfo", context, callback);
    },

    /**
        Registers a callback for log warning prints. Note: Important messages is ones are already
        logged to console.warn() and the UI console if one has been created.

            TundraSDK.framework.client.onLogWarning(null, function(message) {
                console.warn("LogWarning:", message);
            });

        @method onLogWarning
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onLogWarning : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("TundraClient.LogWarning", context, callback);
    },

    /**
        Registers a callback for log error prints. Note: Important messages is ones are already
        logged to console.error() and the UI console if one has been created.

            TundraSDK.framework.client.onLogError(null, function(message) {
                console.log("LogError:", message);
            });

        @method onLogError
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onLogError : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("TundraClient.LogError", context, callback);
    },

    /**
        Resets the client object state. This is automatically called when disconnected from a server.
        @method reset
    */
    reset : function()
    {
        // Reset data
        this.websocket = null;
        this.loginProperties = {};
        this.connectionId = 0;
        this.authTokens = {};

        // Reset APIs
        this.frame.reset();
        this.ui.reset();
        this.input.reset();
        this.asset.reset();
        this.scene.reset();
        this.renderer.reset();

        // Reset frametime
        this.lastTime = performance.now();

        this.cameraApplications = [];
        this.cameraApplicationIndex = 0;
        this.cameraSwitcherButton = null;
        this.cameraSwitcherMenu = null;
    },

    onUpdateInternal : function()
    {
        var that = TundraSDK.framework.client;
        requestAnimationFrame(that.onUpdateInternal);

        var timeNow = performance.now()
        var frametime = (timeNow - that.lastTime);
        frametimeMsec = frametime;
        frametime = frametime / 1000.0;
        that.lastTime = timeNow;

        that.frame._update(frametime);

        // Update APIs
        that.asset.update(frametime);
        that.scene.update(frametime);

        // Render scene
        that.renderer.update(frametime, frametimeMsec);

        that.frame._postUpdate(frametime);
    },

    /**
        Logs a info message. Always sends the event to {{#crossLink "TundraClient/onLogInfo:method"}}{{/crossLink}}
        callbacks and optionally logs to the browsers console.
        @method logInfo
        @param {String} message Log message.
        @param {Boolean} toBrowserConsole If the message should be logged to the browsers console.log function.
    */
    logInfo : function(message, toBrowserConsole)
    {
        if (toBrowserConsole === undefined || toBrowserConsole == null)
            toBrowserConsole = false;
        if (toBrowserConsole && console.log != null)
            console.log(message);

        TundraSDK.framework.events.send("TundraClient.LogInfo", message);
    },

    /**
        Logs a warning message. Always sends the event to {{#crossLink "TundraClient/onLogWarning:method"}}{{/crossLink}}
        callbacks and optionally logs to the browsers console.
        @method logWarning
        @param {String} message Log message.
        @param {Boolean} toBrowserConsole If the message should be logged to the browsers console.warn function.
    */
    logWarning : function(message, toBrowserConsole)
    {
        if (toBrowserConsole === undefined || toBrowserConsole == null)
            toBrowserConsole = false;
        if (toBrowserConsole && console.warn != null)
            console.warn(message);

        TundraSDK.framework.events.send("TundraClient.LogWarning", message);
    },

    /**
        Logs a error message. Always sends the event to {{#crossLink "TundraClient/onLogWarning:method"}}{{/crossLink}}
        callbacks and optionally logs to the browsers console.
        @method logError
        @param {String} message Log message.
        @param {Boolean} toBrowserConsole If the message should be logged to the browsers console.error function.
    */
    logError : function(message, toBrowserConsole)
    {
        if (toBrowserConsole === undefined || toBrowserConsole == null)
            toBrowserConsole = false;
        if (toBrowserConsole && console.error != null)
            console.error(message);

        TundraSDK.framework.events.send("TundraClient.LogError", message);
    },

    /**
        Returns if there is a active connection to a WebSocket host.
        @method isConnected
        @return {Boolean}
    */
    isConnected : function()
    {
        if (this.websocket == null)
            return false;
        else if (this.websocket.readyState != 3) // CLOSED
            return true;
        return false;
    },

    /**
        Connects to a WebSocket host with login properties and returns if successful.
        @method connect
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
        if ("WebSocket" in window)
            this.websocket = new WebSocket(host);
        else if ("MozWebSocket" in window)
            this.websocket = new MozWebSocket(host);
        else
            return { success : false, reason : "This browser does not support WebSocket connections" };

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

    /**
        Disconnects if there is a active websocket connection.
        @method disconnect
    */
    disconnect : function()
    {
        if (this.websocket != null)
            this.websocket.close();
        this.reset();
    },

    onWebSocketConnectionOpened : function(event)
    {
        var that = TundraSDK.framework.client;
        that.log.infoC("Server connection established");

        // Send login message
        var message = new LoginMessage();
        message.serialize(JSON.stringify(that.loginProperties));
        TundraSDK.framework.network.send(message);

        // Fire event
        that.events.send("TundraClient.Connected");
    },

    onWebSocketConnectionError : function(event)
    {
        var that = TundraSDK.framework.client;
        that.log.errorC("Failed to connect to", event.target.url);
        that.events.send("TundraClient.ConnectionError", event);
    },

    onWebSocketConnectionClosed : function(event)
    {
        var that = TundraSDK.framework.client;
        that.log.infoC("Server connection disconnected");
        that.events.send("TundraClient.Disconnected", event);

        // Reset client and all APIs
        that.reset();
    },

    onWebSocketMessage : function(event)
    {
        var that = TundraSDK.framework.client;

        // Binary frame
        if (typeof event.data !== "string")
        {
            TundraSDK.framework.client.network.receive(event.data);
            event.data = null;
        }
        // String frame, just log it..
        else
            that.log.info("Server sent a unexpected string message '" + event.data + "'");
    }
});

return TundraClient;

}); // require js
