
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/TundraLogging",
        "core/data/DataDeserializer",
        "core/network/INetworkMessageHandler",
        "core/network/INetworkMessage",
        "core/network/TundraMessageHandler",
        "core/network/WebSocketTester"
    ], function(Tundra, ITundraAPI, TundraLogging,
                DataDeserializer, INetworkMessageHandler,
                INetworkMessage, TundraMessageHandler,
                WebSocketTester) {

var Network = ITundraAPI.$extend(
/** @lends Network.prototype */
{
    /**
        Network contains utilities and properties for the handling of the Tundra protocol.

        @constructs
        @extends ITundraAPI
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        this.messageHandlers = [];
    },

    initialize : function()
    {
        this.registerMessageHandler(new TundraMessageHandler());
    },

    // ITundraAPI override.
    postInitialize : function()
    {
        Tundra.console.registerCommand("disconnect", "Disconnects the active server connection", null, Tundra.client, Tundra.client.disconnect);
    },

    __classvars__ :
    {
        getDefaultOptions : function()
        {
            return {
                debug : false
            };
        },

        /**
            Map for Tundra Entity Component ids to component names.

            @static
            @vara {Object}

            * @example
            * {
            *     // Tundra core components
            *     1   : "Avatar",                  21  : "RttTarget",
            *     2   : "Billboard",               23  : "RigidBody",
            *     5   : "Script",                  24  : "VolumeTrigger",
            *     6   : "Sound",                   25  : "DynamicComponent",
            *     7   : "SoundListener",           26  : "Name",
            *     8   : "EnvironmentLight",        27  : "ParticleSystem",
            *     9   : "Fog",                     28  : "Highlight",
            *     10  : "Sky",                     29  : "HoveringText",
            *     11  : "Terrain",                 30  : "TransformGizmo",
            *     12  : "WaterPlane",              31  : "Material",
            *     13  : "InputMapper",             33  : "ProximityTrigger",
            *     14  : "AnimationController",     34  : "PlanarMirror",
            *     15  : "Camera",                  35  : "WidgetCanvas",
            *     16  : "Light",                   36  : "WebView",
            *     17  : "Mesh",                    37  : "MediaPlayer",
            *     18  : "OgreCompositor",          38  : "SkyX",
            *     19  : "OgreCustomObject",        39  : "Hydrax",
            *     20  : "Placeable",               40  : "LaserPointer",
            *
            *     41  : "SlideShow",               52  : "GraphicsViewCanvas",
            *     42  : "WidgetBillboard",         108 : "StencilGlow",
            *     43  : "PhysicsMotor"
            * }
        */
        components :
        {
            // Tundra core components
            1   : "Avatar",                  21  : "RttTarget",
            2   : "Billboard",               23  : "RigidBody",
            5   : "Script",                  24  : "VolumeTrigger",
            6   : "Sound",                   25  : "DynamicComponent",
            7   : "SoundListener",           26  : "Name",
            8   : "EnvironmentLight",        27  : "ParticleSystem",
            9   : "Fog",                     28  : "Highlight",
            10  : "Sky",                     29  : "HoveringText",
            11  : "Terrain",                 30  : "TransformGizmo",
            12  : "WaterPlane",              31  : "Material",
            13  : "InputMapper",             33  : "ProximityTrigger",
            32  : "SceneShadowSetup",
            14  : "AnimationController",     34  : "PlanarMirror",
            15  : "Camera",                  35  : "WidgetCanvas",
            16  : "Light",                   36  : "WebView",
            17  : "Mesh",                    37  : "MediaPlayer",
            18  : "OgreCompositor",          38  : "SkyX",
            19  : "OgreCustomObject",        39  : "Hydrax",
            20  : "Placeable",               40  : "LaserPointer",

            41  : "SlideShow",               52  : "GraphicsViewCanvas",
            42  : "WidgetBillboard",         108 : "StencilGlow",
            43  : "PhysicsMotor"
        }
    },

    /**
        Register a network message handler. Note: Does not check if the handler is already registered!

        @param {INetworkMessageHandler} handler
    */
    registerMessageHandler : function(handler)
    {
        if (!(handler instanceof INetworkMessageHandler))
        {
            this.log.error("registerMessageHandler called with a non INetworkMessageHandler object:", hadler);
            return;
        }
        this.messageHandlers.push(handler);
    },

    /**
        Sends an message to the active WebSocket connection.

        This function will delete and null out the passed message object after it has been sent.
        This is done to help out the garbage collection. You cannot use the message object after this function call.

        @param {INetworkMessage} message Message to send.
    */
    send : function(message)
    {
        if (!Tundra.client._isWebSocketConnected())
        {
            //this.log.error("Cannot send message, no active WebSocket connection!");
            return;
        }
        if (!(message instanceof INetworkMessage))
        {
            this.log.error("Cannot send message, given object is not an instance of INetworkMessage!");
            return;
        }

        var buffer = message.getBuffer();
        if (buffer !== null)
            Tundra.client.websocket.send(buffer);
        else
            this.log.error("Cannot send message as it's buffer is null! Are you sure it's an outgoing message and serialize() has been called?");

        delete message;
        message = null;
    },

    /**
        Handles incoming message from input buffer. Handlers for messages can be registered via registerMessageHandler.

        @param {ArrayBuffer} buffer Source data buffer.
    */
    receive : function(buffer)
    {
        var ds = new DataDeserializer(buffer, 0);
        var id = ds.readU16();

        /** @todo Figure out if it makes sense to let multiple registered
            handlers to handle the same message id. In this case we would
            need to create copies of the data for each. */
        for (var i=0; i<this.messageHandlers.length; i++)
        {
            if (this.messageHandlers[i].canHandle(id))
            {
                this.messageHandlers[i].handle(id, ds);
                return;
            }
        }

        var msg = new INetworkMessage(id);
        this.log.warn("Received an unhandled network message", msg.name, msg.id);
    }
});

return Network;

}); // require js
