
define([
        "lib/classy",
        "lib/jquery.mousewheel",
        "core/framework/TundraSDK"
    ], function(Class, jqueryMouseWheel, TundraSDK) {

/**
    InputAPI that is accessible from {{#crossLink "TundraClient/input:property"}}TundraClient.input{{/crossLink}}

    Provides mouse and keyboard input state and events.
    @class InputAPI
    @constructor
*/
var InputAPI = Class.$extend(
{
    /**
        Event object description for {{#crossLink "InputAPI/onMouseEvent:method"}}{{/crossLink}}, {{#crossLink "InputAPI/onMouseMove:method"}}{{/crossLink}}, {{#crossLink "InputAPI/onMouseClick:method"}}{{/crossLink}}, {{#crossLink "InputAPI/onMousePress:method"}}{{/crossLink}}, {{#crossLink "InputAPI/onMouseRelease:method"}}{{/crossLink}} and {{#crossLink "InputAPI/onMouseWheel:method"}}{{/crossLink}} callbacks.
        @event MouseEvent
        @param {String} type "move" | "press" | "release" | "wheel"
        @param {Number} x Current x position
        @param {Number} y Current y position
        @param {Number} relativeX Relative x movement since last mouse event
        @param {Number} relativeY Relative y movement since last mouse event
        @param {Number} relativeZ Mouse wheel delta
        @param {Boolean} rightDown Is right mouse button down
        @param {Boolean} leftDown Is left mouse button down
        @param {Boolean} middleDown Is middle mouse button down
        @param {String} targetId DOM element id that the mouse event occurred on
        @param {String} targetNodeName HTML node name eg. 'canvas' and 'div'. Useful for detected
        when on 'canvas' element aka the mouse event occurred on the 3D scene canvas and not on top of a UI widget.
        @param {Object} originalEvent Original jQuery mouse event
    */

    /**
        Event object description for {{#crossLink "InputAPI/onKeyEvent:method"}}{{/crossLink}}, {{#crossLink "InputAPI/onKeyPress:method"}}{{/crossLink}} and {{#crossLink "InputAPI/onKeyRelease:method"}}{{/crossLink}} callbacks.
        @event KeyEvent
        @param {String} type "press" | "release"
        @param {Number} keyCode Key as number
        @param {String} key Key as string
        @param {Object} pressed Currently held down keys. Maps key as string to boolean.
        @param {String} targetId DOM element id that the mouse event occurred on
        @param {String} targetNodeName HTML node name eg. 'canvas' and 'div'. Useful for detected
        when on 'body' element aka the mouse event occurred on the "3D scene" and not on top of another input UI widget.
        @param {Object} originalEvent Original jQuery key event
    */

    __init__ : function(params)
    {
        var that = this;

        /**
            Current mouse state
            <pre>{
                x : Number,
                y : Number
            }</pre>

                overlay.css({
                    top  : TundraSDK.framework.input.mouse.y,
                    left : 5
                });

            @property mouse
            @type Object
        */
        this.mouse =
        {
            // Event type: move, press, release, wheel
            type : "",
            // Absolute position
            x : null,
            y : null,
            // Relative position
            relativeX : 0,
            relativeY : 0,
            // Wheel delta
            relativeZ : 0,
            // Button states
            rightDown  : false,
            leftDown   : false,
            middleDown : false,
            // HTML element id that the mouse event occurred on
            targetId : "",
            // HTML node name eg. 'canvas' and 'div'. Useful for detected
            // when on 'canvas' element aka the mouse event occurred on the
            // 3D scene canvas and not on top of a UI widget.
            targetNodeName : "",
            // Original jQuery mouse event
            originalEvent : null
        };

        /**
            Current keyboard state
            <pre>{
                pressed :
                {
                    keyCodeStr : Boolean
                }
            }</pre>

                if (TundraSDK.framework.input.keyboard.pressed["w"] === true)
                    console.log("W is down");

            @property keyboard
            @type Object
        */
        this.keyboard =
        {
            // Event type: press, release
            type : "",
            // Event key code
            keyCode : 0,
            // Event key as string
            key : "",
            // If this is a repeat. Meaning the key was already in the pressed state.
            repeat : false,
            // Currently held down keys: maps key as string to 'true' boolean
            // Check with inputApi.keyboard.pressed["w"] or keyEvent.pressed["f"]
            pressed : {},
            // HTML element id that the mouse event occurred on
            targetId : "",
            // HTML node name eg. 'canvas' and 'div'. Useful for detected
            // when on 'body' element aka the mouse event occurred on the "3D scene" and not on top of another input UI widget.
            targetNodeName : "",
            // Original jQuery mouse event
            originalEvent : null
        };

        this.keys =
        {
            8   : 'backspace',
            9   : 'tab',
            13  : 'enter',
            16  : 'shift',
            17  : 'ctrl',
            18  : 'alt',
            20  : 'capslock',
            27  : 'esc',
            32  : 'space',
            33  : 'pageup',
            34  : 'pagedown',
            35  : 'end',
            36  : 'home',
            37  : 'left',
            38  : 'up',
            39  : 'right',
            40  : 'down',
            45  : 'ins',
            46  : 'del',
            91  : 'meta',
            93  : 'meta',
            224 : 'meta'
        };

        this.keycodes =
        {
            106 : '*',
            107 : '+',
            109 : '-',
            110 : '.',
            111 : '/',
            186 : ';',
            187 : '=',
            188 : ',',
            189 : '-',
            190 : '.',
            191 : '/',
            192 : '`',
            219 : '[',
            220 : '\\',
            221 : ']',
            222 : '\''
        };

        $(document).keydown(function(e) {
            that.onKeyPressInternal(e);
        });
        $(document).keyup(function(e) {
            that.onKeyReleaseInternal(e);
        });
    },

    __classvars__ :
    {
        plugins : [],

        /**
            Registers a new input plugin. Name of the plugin must be unique.

            @method registerPlugin
            @static
            @param {IInputPlugin} plugin Plugin instance.
        */
        registerPlugin : function(plugin)
        {
            /*if (!(plugin instanceof IInputPlugin))
            {
                TundraSDK.framework.client.logError("[InputAPI]: Cannot register plugin that is not of type IInputPlugin");
                return false;
            }*/

            for (var i = 0; i < InputAPI.plugins.length; i++)
            {
                if (InputAPI.plugins[i].name === plugin.name)
                {
                    console.error("[InputAPI]: registerPlugin() Name of the plugin needs to be unique. Name", plugin.name, "already registered");
                    return;
                }
            }
            InputAPI.plugins.push(plugin);
        },

        /**
            Get input plugin.

            @method registerPlugin
            @static
            @param {String} name Name of the plugin.
            @return {IInputPlugin}
        */
        getPlugin : function(name)
        {
            for (var i = 0; i < InputAPI.plugins.length; i++)
            {
                if (InputAPI.plugins[i].name === plugin.name)
                    return InputAPI.plugins[i];
            }
            return null;
        }
    },

    postInitialize : function()
    {
        // Register main container mouse events
        TundraSDK.framework.input.registerMouseEvents(TundraSDK.framework.client.container);

        for (var i = 0; i < InputAPI.plugins.length; i++)
        {
            try
            {
                InputAPI.plugins[i]._start();
            }
            catch(e)
            {
                TundraSDK.framework.client.logError("[InputAPI:] Plugin " + InputAPI.plugins[i].name + " start() threw exception: " + e);
            }
        }
    },

    reset : function()
    {
        TundraSDK.framework.events.remove("InputAPI.MouseEvent");
        TundraSDK.framework.events.remove("InputAPI.MouseMove");
        TundraSDK.framework.events.remove("InputAPI.MouseClick");
        TundraSDK.framework.events.remove("InputAPI.MousePress");
        TundraSDK.framework.events.remove("InputAPI.MouseRelease");
        TundraSDK.framework.events.remove("InputAPI.MouseWheel");
        TundraSDK.framework.events.remove("InputAPI.KeyEvent");
        TundraSDK.framework.events.remove("InputAPI.KeyPress");
        TundraSDK.framework.events.remove("InputAPI.KeyRelease");

        for (var i = 0; i < InputAPI.plugins.length; i++)
        {
            try
            {
                InputAPI.plugins[i].reset();
            }
            catch(e)
            {
                TundraSDK.framework.client.logError("[InputAPI:] Plugin " + InputAPI.plugins[i].name + " reset() threw exception: " + e);
            }
        }
    },

    registerPluginEvent : function(eventName, eventStringSignature)
    {
        var eventHandler = "on" + eventName;
        if (this[eventHandler] !== undefined)
        {
            TundraSDK.framework.client.logError("[InputAPI]: Cannot register plugin event " + eventName + " the handler InputAPI." +
                eventHandler + " is already registered!");
            return false;
        }

        this[eventHandler] = function(context, callback)
        {
            return TundraSDK.framework.events.subscribe(eventStringSignature, context, callback);
        };
        return true;
    },

    supportsEventType : function(eventName)
    {
        return (typeof this["on" + eventName] === "function");
    },

    registerMouseEvents : function(element)
    {
        var receiver = this;
        var qElement = $(element);

        // Mouse events
        qElement.mousemove(function(e) {
            receiver.onMouseMoveInternal(e);
        });
        qElement.mousedown(function(e) {
            receiver.onMousePressInternal(e);
        });
        qElement.mouseup(function(e) {
            receiver.onMouseReleaseInternal(e);
        });
        qElement.mousewheel(function(e, delta, deltaX, deltaY) {
            receiver.onMouseWheelInternal(e, delta, deltaX, deltaY);
        });

        // Disable right click context menu
        qElement.bind("contextmenu", function(e) {
            return false;
        });
    },

    /**
        Registers a callback for all mouse events. See {{#crossLink "InputAPI/MouseEvent:event"}}{{/crossLink}} for event data.
        @example
            function onMouseEvent(event)
            {
                // event === MouseEvent
            }

            TundraSDK.framework.input.onMouseEvent(null, onMouseEvent);

        @method onMouseEvent
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMouseEvent : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.MouseEvent", context, callback);
    },

    /**
        Registers a callback for mouse move events. See {{#crossLink "InputAPI/MouseEvent:event"}}{{/crossLink}} for event data.
        @example
            function onMouseMove(event)
            {
                // event === MouseEvent
            }

            TundraSDK.framework.input.onMouseMove(null, onMouseMove);

        @method onMouseMove
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMouseMove : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.MouseMove", context, callback);
    },

    /**
        Registers a callback for mouse press and release events. See {{#crossLink "InputAPI/MouseEvent:event"}}{{/crossLink}} for event data.
        @example
            function onMouseClick(event)
            {
                // event === MouseEvent
            }

            TundraSDK.framework.input.onMouseClick(null, onMouseClick);

        @method onMouseClick
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMouseClick : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.MouseClick", context, callback);
    },

    /**
        Registers a callback for mouse press events. See {{#crossLink "InputAPI/MouseEvent:event"}}{{/crossLink}} for event data.
        @example
            function onMousePress(event)
            {
                // event === MouseEvent
            }

            TundraSDK.framework.input.onMousePress(null, onMousePress);

        @method onMousePress
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMousePress : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.MousePress", context, callback);
    },

    /**
        Registers a callback for mouse release events. See {{#crossLink "InputAPI/MouseEvent:event"}}{{/crossLink}} for event data.
        @example
            function onMouseRelease(event)
            {
                // event === MouseEvent
            }

            TundraSDK.framework.input.onMouseRelease(null, onMouseRelease);

        @method onMouseRelease
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMouseRelease : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.MouseRelease", context, callback);
    },

    /**
        Registers a callback for mouse wheel events. See {{#crossLink "InputAPI/MouseEvent:event"}}{{/crossLink}} for event data.
        @example
            function onMouseWheel(event)
            {
                // event === MouseEvent
            }

            TundraSDK.framework.input.onMouseWheel(null, onMouseWheel);

        @method onMouseWheel
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMouseWheel : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.MouseWheel", context, callback);
    },

    /**
        Registers a callback for all key events. See {{#crossLink "InputAPI/KeyEvent:event"}}{{/crossLink}} for event data.
        @example
            function onKeyEvent(event)
            {
                // event === KeyEvent
            }

            TundraSDK.framework.input.onKeyEvent(null, onKeyEvent);

        @method onKeyEvent
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onKeyEvent : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.KeyEvent", context, callback);
    },

    /**
        Registers a callback for key press events. See {{#crossLink "InputAPI/KeyEvent:event"}}{{/crossLink}} for event data.
        @example
            function onKeyPress(event)
            {
                // event === KeyEvent
            }

            TundraSDK.framework.input.onKeyPress(null, onKeyPress);

        @method onKeyPress
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onKeyPress : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.KeyPress", context, callback);
    },

    /**
        Registers a callback for key release events. See {{#crossLink "InputAPI/KeyEvent:event"}}{{/crossLink}} for event data.
        @example
            function onKeyRelease(event)
            {
                // event === KeyEvent
            }

            TundraSDK.framework.input.onKeyRelease(null, onKeyRelease);

        @method onKeyRelease
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onKeyRelease : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputAPI.KeyRelease", context, callback);
    },

    onMouseMoveInternal : function(event)
    {
        this.readMouseEvent(event);
        this.mouse.type = "move";

        TundraSDK.framework.events.send("InputAPI.MouseEvent", this.mouse);
        TundraSDK.framework.events.send("InputAPI.MouseMove", this.mouse);
    },

    onMousePressInternal : function(event)
    {
        this.readMouseEvent(event);
        this.mouse.type = "press";

        TundraSDK.framework.events.send("InputAPI.MouseEvent", this.mouse);
        TundraSDK.framework.events.send("InputAPI.MouseClick", this.mouse);
        TundraSDK.framework.events.send("InputAPI.MousePress", this.mouse);
    },

    onMouseReleaseInternal : function(event)
    {
        this.readMouseEvent(event);
        this.mouse.type = "release";
        this.mouse.leftDown = false;
        this.mouse.rightDown = false;
        this.mouse.middleDown = false;

        TundraSDK.framework.events.send("InputAPI.MouseEvent", this.mouse);
        TundraSDK.framework.events.send("InputAPI.MouseClick", this.mouse);
        TundraSDK.framework.events.send("InputAPI.MouseRelease", this.mouse);
    },

    onMouseWheelInternal : function(event, delta, deltaX, deltaY)
    {
        this.readMouseEvent(event, deltaY);
        this.mouse.type = "wheel";

        TundraSDK.framework.events.send("InputAPI.MouseEvent", this.mouse);
        TundraSDK.framework.events.send("InputAPI.MouseWheel", this.mouse);
    },

    readMouseEvent : function(event, wheelY)
    {
        // Original jQuery event
        this.mouse.originalEvent = event;

        // Target element
        if (event.target !== undefined && event.target !== null)
        {
            this.mouse.targetNodeName = event.target.localName;
            this.mouse.targetId = event.target.id;
        }
        else
        {
            this.mouse.targetNodeName = "";
            this.mouse.targetId = "";
        }

        // Relative movement
        if (this.mouse.x != null)
            this.mouse.relativeX = event.pageX - this.mouse.x;
        if (this.mouse.y != null)
            this.mouse.relativeY = event.pageY - this.mouse.y;

        // Wheel
        this.mouse.relativeZ = (wheelY != null ? wheelY : 0);

        // Mouse position
        this.mouse.x = event.pageX;
        this.mouse.y = event.pageY;

        // Buttons
        if (TundraSDK.browser.isFirefox)
        {
            this.mouse.leftDown   = (event.buttons === 1);
            this.mouse.rightDown  = (event.buttons === 2);
            this.mouse.middleDown = (event.buttons === 3);
        }
        else
        {
            this.mouse.leftDown   = (event.which === 1);
            this.mouse.rightDown  = (event.which === 3);
            this.mouse.middleDown = (event.which === 2);
        }
    },

    onKeyPressInternal : function(event)
    {
        this.readKeyEvent(event);
        this.keyboard.type = "press";

        TundraSDK.framework.events.send("InputAPI.KeyEvent", this.keyboard);
        TundraSDK.framework.events.send("InputAPI.KeyPress", this.keyboard);
    },

    onKeyReleaseInternal : function(event)
    {
        this.readKeyEvent(event);
        this.keyboard.type = "release";

        TundraSDK.framework.events.send("InputAPI.KeyEvent", this.keyboard);
        TundraSDK.framework.events.send("InputAPI.KeyRelease", this.keyboard);
    },

    readKeyEvent : function(event)
    {
        // Original jQuery event
        this.keyboard.originalEvent = event;

        // Target element
        if (event.target !== undefined && event.target !== null)
        {
            this.keyboard.targetNodeName = event.target.localName;
            this.keyboard.targetId = event.target.id;
        }
        else
        {
            this.keyboard.targetNodeName = "";
            this.keyboard.targetId = "";
        }

        // Key code
        this.keyboard.keyCode = event.which;
        this.keyboard.key = this.characterForKeyCode(event.which);

        // Track currenly held down keys
        this.keyboard.repeat = false;
        if (event.type === "keydown")
        {
            if (this.keyboard.pressed[this.keyboard.key] === true)
                this.keyboard.repeat = true;
            else
                this.keyboard.pressed[this.keyboard.key] = true;
        }
        else
            delete this.keyboard.pressed[this.keyboard.key];
    },

    characterForKeyCode : function(keyCode)
    {
        // Special keys
        if (this.keys[keyCode])
            return this.keys[keyCode];
        if (this.keycodes[keyCode])
            return this.keycodes[keyCode];

        // Convert from char code
        /// @todo Fix non ascii keys
        return String.fromCharCode(keyCode).toLowerCase();
    }
});

return InputAPI;

}); // require js
