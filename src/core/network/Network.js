
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/data/DataDeserializer",
        "core/network/INetworkMessageHandler",
        "core/network/INetworkMessage"
    ], function(Class, TundraSDK, TundraLogging, DataDeserializer, INetworkMessageHandler, INetworkMessage) {

/**
    Tundra protocol contains utilities and properties for the handling the Tundra protocol.
    @class Network
    @constructor
*/
var Network = Class.$extend(
{
    __init__ : function(params)
    {
        this.log = TundraLogging.getLogger("Network");

        this.messageHandlers = [];
    },

    __classvars__ :
    {
        /**
            Map for Tundra Entity Component ids to component names.
            @property components
            @type Object
            @static
            @example
                {
                    // Tundra core components
                    1   : "EC_Avatar",                  21  : "EC_RttTarget",
                    2   : "EC_Billboard",               23  : "EC_RigidBody",
                    5   : "EC_Script",                  24  : "EC_VolumeTrigger",
                    6   : "EC_Sound",                   25  : "EC_DynamicComponent",
                    7   : "EC_SoundListener",           26  : "EC_Name",
                    8   : "EC_EnvironmentLight",        27  : "EC_ParticleSystem",
                    9   : "EC_Fog",                     28  : "EC_Highlight",
                    10  : "EC_Sky",                     29  : "EC_HoveringText",
                    11  : "EC_Terrain",                 30  : "EC_TransformGizmo",
                    12  : "EC_WaterPlane",              31  : "EC_Material",
                    13  : "EC_InputMapper",             33  : "EC_ProximityTrigger",
                    14  : "EC_AnimationController",     34  : "EC_PlanarMirror",
                    15  : "EC_Camera",                  35  : "EC_WidgetCanvas",
                    16  : "EC_Light",                   36  : "EC_WebView",
                    17  : "EC_Mesh",                    37  : "EC_MediaPlayer",
                    18  : "EC_OgreCompositor",          38  : "EC_SkyX",
                    19  : "EC_OgreCustomObject",        39  : "EC_Hydrax",
                    20  : "EC_Placeable",               40  : "EC_LaserPointer",

                    41  : "EC_SlideShow",               52  : "EC_GraphicsViewCanvas",
                    42  : "EC_WidgetBillboard",         108 : "EC_StencilGlow",
                    43  : "EC_PhysicsMotor"
                }
        */
        components :
        {
            // Tundra core components
            1   : "EC_Avatar",                  21  : "EC_RttTarget",
            2   : "EC_Billboard",               23  : "EC_RigidBody",
            5   : "EC_Script",                  24  : "EC_VolumeTrigger",
            6   : "EC_Sound",                   25  : "EC_DynamicComponent",
            7   : "EC_SoundListener",           26  : "EC_Name",
            8   : "EC_EnvironmentLight",        27  : "EC_ParticleSystem",
            9   : "EC_Fog",                     28  : "EC_Highlight",
            10  : "EC_Sky",                     29  : "EC_HoveringText",
            11  : "EC_Terrain",                 30  : "EC_TransformGizmo",
            12  : "EC_WaterPlane",              31  : "EC_Material",
            13  : "EC_InputMapper",             33  : "EC_ProximityTrigger",
            14  : "EC_AnimationController",     34  : "EC_PlanarMirror",
            15  : "EC_Camera",                  35  : "EC_WidgetCanvas",
            16  : "EC_Light",                   36  : "EC_WebView",
            17  : "EC_Mesh",                    37  : "EC_MediaPlayer",
            18  : "EC_OgreCompositor",          38  : "EC_SkyX",
            19  : "EC_OgreCustomObject",        39  : "EC_Hydrax",
            20  : "EC_Placeable",               40  : "EC_LaserPointer",

            41  : "EC_SlideShow",               52  : "EC_GraphicsViewCanvas",
            42  : "EC_WidgetBillboard",         108 : "EC_StencilGlow",
            43  : "EC_PhysicsMotor"
        }
    },

    /**
        Register a network message handler. Note: Does not check if the handler is already registered!

        @method registerMessageHandler
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
        @method send
        @param {INetworkMessage} message Message to send.
    */
    send : function(message)
    {
        if (TundraSDK.framework.client.websocket === null)
        {
            this.log.error("Cannot send message, no active WebSocket connection!");
            return;
        }
        if (!(message instanceof INetworkMessage))
        {
            this.log.error("Cannot send message, given object is not an instance of INetworkMessage!");
            return;
        }

        var buffer = message.getBuffer();
        if (buffer !== null)
            TundraSDK.framework.client.websocket.send(buffer);
        else
            this.log.error("Cannot send message as it's buffer is null! Are you sure it's an outgoing message and serialize() has been called?");

        delete message;
        message = null;
    },

    /**
        Handles incoming message from input buffer. Handlers for messages can be registered via registerMessageHandler.

        @method receive
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