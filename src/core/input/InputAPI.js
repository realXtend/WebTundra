
define([
        "lib/jquery.mousewheel",
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/TundraLogging",
        "core/frame/AsyncHelper",
        "core/input/InputEventMouse"
    ], function(jqueryMouseWheel, Tundra, ITundraAPI, TundraLogging, AsyncHelper, InputEventMouse) {

/* @todo Implement InputEventKey and remove this!
    Event object description for {{#crossLink "InputAPI/onKeyEvent:method"}}{{/crossLink}}, {{#crossLink "InputAPI/onKeyPress:method"}}{{/crossLink}} and {{#crossLink "InputAPI/onKeyRelease:method"}}{{/crossLink}} callbacks.
    @event KeyEvent
    @param {String} type "press" | "release"
    @param {Number} keyCode Key as number
    @param {String} key Key as string
    @param {Object} pressed Currently held down keys. Maps key as string to boolean.
    @param {String} targetId DOM element id that the mouse event occurred on
    @param {String} targetNodeName HTML node name e.g. 'canvas' and 'div'. Useful for detected
    when on 'body' element aka the mouse event occurred on the "3D scene" and not on top of another input UI widget.
    @param {Object} originalEvent Original jQuery key event
*/

var InputAPI = ITundraAPI.$extend(
/** @lends InputAPI.prototype */
{
    /**
        Provides mouse and keyboard input state and events.
        InputAPI is a singleton and is accessible from {@link Tundra.input}.

        @constructs
        @extends ITundraAPI
        @private
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        this.timing = new AsyncHelper("InputAPI", this);

        /*
            Current mouse state.
            @var {InputEventMouse}
        */
        this.mouse = new InputEventMouse();

        // mouse wheel hacks
        this._resetMouseWheelDirBinded = this._resetMouseWheelDir.bind(this);
        this._lastMouseWheelDir = 0;

        /*
            Current keyboard state.
            @var {Object}
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
            // HTML node name e.g. 'canvas' and 'div'. Useful for detected
            // when on 'body' element aka the mouse event occurred on the "3D scene" and not on top of another input UI widget.
            targetNodeName : "",
            // Original jQuery mouse event
            originalEvent : null,

            /// @todo Document this whole object better!
            suppress : function(preventDefault, preventPropagation)
            {
                if (this.originalEvent != null)
                {
                    if (preventDefault === undefined || preventDefault === true)
                        this.originalEvent.preventDefault();
                    if (preventPropagation === undefined || preventPropagation === true)
                        this.originalEvent.stopPropagation();
                }
            }
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
    },

    // ITundraAPI override
    initialize : function()
    {
        this.clearOverrideCursor();

        /* Clear any custom cursors when tab focus changes.
           This is for safety so that no app can accidentally leave
           override cursors by handling certain events poorly, while
           their action/cursor is ongoing. */
        Tundra.ui.onTabFocusChanged(this, this.clearOverrideCursor.bind(this));

        // Mouse events
        Tundra.input.registerMouseEvents(Tundra.client.container);

        this.ignoredNodeNameRules = [ "webrocket-", "meshmoon-" ];

        // Key events
        /* @note If a input field has focus inside a polymer element, there is no easy way to ask this.
           Below jqeury check wont work as the input is hidden inside the shadow dom. This should improve when shadow dom
           support gets better in browsers. For now if the target is a polymer element don't send out InputAPI events */
        $(document).keydown(function(e) {
            // eg. <webrocket-x> polymer element has focus
            var nodeLower = e.target.nodeName.toLowerCase();
            for (var i = this.ignoredNodeNameRules.length - 1; i >= 0; i--)
            {
                if (nodeLower.indexOf(this.ignoredNodeNameRules[i]) === 0)
                    return;
            }
            // Input/overlay has focus
            if (!$(e.target, document.activeElement).is("input, textarea, core-input, paper-input, overlay-host"))
                this.onKeyPressInternal(e);
        }.bind(this)).keyup(function(e) {
            // eg. <webrocket-x> polymer element has focus
            var nodeLower = e.target.nodeName.toLowerCase();
            for (var i = this.ignoredNodeNameRules.length - 1; i >= 0; i--)
            {
                if (nodeLower.indexOf(this.ignoredNodeNameRules[i]) === 0)
                    return;
            }
            // Input/overlay has focus
            if (!$(e.target, document.activeElement).is("input, textarea, core-input, paper-input, overlay-host"))
                this.onKeyReleaseInternal(e);
        }.bind(this));
    },

    // ITundraAPI override
    postInitialize : function()
    {
        // Load input plugins
        for (var i = 0; i < InputAPI.plugins.length; i++)
        {
            try
            {
                InputAPI.plugins[i]._start();
            }
            catch(e)
            {
                this.log.error("Plugin '" + InputAPI.plugins[i].name + "' start() threw exception: " + e);
            }
        }
    },

    // ITundraAPI override.
    reset : function()
    {
        Tundra.events.remove("InputAPI.MouseEvent");
        Tundra.events.remove("InputAPI.MouseMove");
        Tundra.events.remove("InputAPI.MouseClick");
        Tundra.events.remove("InputAPI.MousePress");
        Tundra.events.remove("InputAPI.MouseRelease");
        Tundra.events.remove("InputAPI.MouseWheel");
        Tundra.events.remove("InputAPI.MouseDoubleClicked");
        Tundra.events.remove("InputAPI.KeyEvent");
        Tundra.events.remove("InputAPI.KeyPress");
        Tundra.events.remove("InputAPI.KeyRelease");

        for (var i = 0; i < InputAPI.plugins.length; i++)
        {
            try
            {
                InputAPI.plugins[i]._reset();
            }
            catch(e)
            {
                this.log.error("Plugin '" + InputAPI.plugins[i].name + "' reset() threw exception: " + e);
            }
        }
    },

    __classvars__ :
    {
        plugins : [],

        /**
            Registers a new input plugin. Name of the plugin must be unique.

            @static
            @param {IInputPlugin} plugin Plugin instance.
        */
        registerPlugin : function(plugin)
        {
            /*if (!(plugin instanceof IInputPlugin))
            {
                Tundra.client.logError("[InputAPI]: Cannot register plugin that is not of type IInputPlugin");
                return false;
            }*/

            for (var i = 0; i < InputAPI.plugins.length; i++)
            {
                if (InputAPI.plugins[i].name === plugin.name)
                {
                    this.log.error("registerPlugin() Name of the plugin needs to be unique. Name", plugin.name, "already registered");
                    return;
                }
            }
            InputAPI.plugins.push(plugin);
        },

        /**
            Get input plugin.

            @static
            @param {String} name Name of the plugin.
            @return {IInputPlugin}
        */
        getPlugin : function(name)
        {
            for (var i = 0; i < InputAPI.plugins.length; i++)
            {
                if (InputAPI.plugins[i].name === name)
                    return InputAPI.plugins[i];
            }
            return null;
        }
    },

    registerPluginEvent : function(eventName, eventStringSignature)
    {
        var eventHandler = "on" + eventName;
        if (this[eventHandler] !== undefined)
        {
            this.log.error("[InputAPI]: Cannot register plugin event " + eventName + " the handler InputAPI." +
                eventHandler + " is already registered!");
            return false;
        }
        this[eventHandler] = function(context, callback)
        {
            return Tundra.events.subscribe(eventStringSignature, context, callback);
        };
        this.log.debug("Registered event", eventStringSignature);
        return true;
    },

    /**
        Set override cursor for Tundra container.

        @param {String} cursor https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
    */
    setOverrideCursor : function(cursor)
    {
        if (Tundra.client.container)
            Tundra.client.container.css("cursor", cursor);
    },

    /**
        Get current override cursor for Tundra container.

        @return {String} cursor Returns empty string if 'default'.
    */
    getOverrideCursor : function()
    {
        var cursor = (Tundra.client.container ? Tundra.client.container.css("cursor") : "");
        if (typeof cursor !== "string" || cursor === "default")
            cursor = "";
        return cursor;
    },

    /**
        Clear override cursor for Tundra container.
    */
    clearOverrideCursor : function()
    {
        this.setOverrideCursor("default");
    },

    /**
        Returns if a event handler is available. This can be used to detect eg.
        input plugin event registration handlers, which are not present if the
        plugin is not loaded.

        @param {String} eventName
        @return {Boolean}

        * @example
        * if (Tundra.input.hasEvent("TouchPan"))
        *     Tundra.input.onTouchPan(myHandler);
    */
    hasEvent : function(eventName)
    {
        if (typeof eventName !== "string")
            return false;
        return (typeof this["on" + eventName] === "function");
    },

    supportsEventType : function(eventName)
    {
        return (typeof this["on" + eventName] === "function");
    },

    registerMouseEvents : function(element)
    {
        var receiver = this;
        var qElement = $(element);

        qElement.css({ "user-select" : "none" });

        // Mouse events
        qElement.mousedown(function(e) {
            receiver.onMousePressInternal(e);
        });
        qElement.mouseup(function(e) {
            receiver.onMouseReleaseInternal(e);
        });
        qElement.mousemove(function(e) {
            receiver.onMouseMoveInternal(e);
        });
        qElement.mousewheel(function(e, delta, deltaX, deltaY) {
            receiver.onMouseWheelInternal(e, delta, deltaX, deltaY);
        });
        qElement.dblclick(function(e) { receiver.onMouseDoubleClickInternal(e); } );

        // Disable right click context menu
        qElement.bind("contextmenu", function(/*e*/) {
            return false;
        });
    },

    /**
        Registers a callback for all mouse events. See {{#crossLink "InputEventMouse"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @param {Number} [priority] The priority level of the event listener (default 0). Listeners with higher priority will
            be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onMouseEvent(function(event) {
        *     // event === InputEventMouse
        * });
    */
    onMouseEvent : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.MouseEvent", context, callback, priority);
    },

    /**
        Registers a callback for mouse move events. See {{#crossLink "InputEventMouse"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onMouseMove(function(event) {
        *     // event === InputEventMouse
        * });
    */
    onMouseMove : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.MouseMove", context, callback, priority);
    },

    /**
        Registers a callback for mouse press and release events. See {{#crossLink "InputEventMouse"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onMouseClick(function(event) {
        *     // event === InputEventMouse
        * });
    */
    onMouseClick : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.MouseClick", context, callback, priority);
    },

    /**
        Registers a callback for mouse press events. See {{#crossLink "InputEventMouse"}}{{/crossLink}} for event data.

        @method onMousePress
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onMousePress(function(event) {
        *     // event === InputEventMouse
        * });
    */
    onMousePress : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.MousePress", context, callback, priority);
    },

    /**
        Registers a callback for mouse release events. See {{#crossLink "InputEventMouse"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onMouseRelease(function(event) {
        *     // event === InputEventMouse
        * });
    */
    onMouseRelease : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.MouseRelease", context, callback, priority);
    },

    /**
        Registers a callback for mouse wheel events. See {{#crossLink "InputEventMouse"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onMouseWheel(function(event) {
        *     // event === InputEventMouse
        * });
    */
    onMouseWheel : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.MouseWheel", context, callback, priority);
    },

    /**
        Registers a callback for a mouse (left button) double-click event. See {{#crossLink "InputEventMouse"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onMouseDoubleClicked(function(event) {
        *     // event === InputEventMouse
        * });
    */
    onMouseDoubleClicked : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.MouseDoubleClicked", context, callback, priority);
    },

    /**
        Registers a callback for all key events. See {{#crossLink "InputAPI/KeyEvent:event"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @param {Number} [priority] The priority level of the event listener (default 0). Listeners with higher priority will
            be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onKeyEvent(function(event) {
        *     // event === KeyEvent
        * });
    */
    onKeyEvent : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.KeyEvent", context, callback, priority);
    },

    /**
        Registers a callback for key press events. See {{#crossLink "InputAPI/KeyEvent:event"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onKeyPress(function(event) {
        *     // event === KeyEvent
        * });
    */
    onKeyPress : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.KeyPress", context, callback, priority);
    },

    /**
        Registers a callback for key release events. See {{#crossLink "InputAPI/KeyEvent:event"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.input.onKeyRelease(function(event) {
        *     // event === KeyEvent
        * });
    */
    onKeyRelease : function(context, callback, priority)
    {
        return Tundra.events.subscribe("InputAPI.KeyRelease", context, callback, priority);
    },

    onMouseMoveInternal : function(event)
    {
        this.readMouseEvent("move", event);

        /* After mouse clicks jquery sends an event that according to
           our tracking has not actually moved a pixel. Ignore these. */
        if (this.mouse.relativeX === 0 && this.mouse.relativeY === 0)
            return;

        if (Tundra.events.send("InputAPI.MouseMove", this.mouse))
            return;
        Tundra.events.send("InputAPI.MouseEvent", this.mouse);
    },

    onMousePressInternal : function(event)
    {
        this.readMouseEvent("press", event);

        if (Tundra.events.send("InputAPI.MouseClick", this.mouse))
            return;
        if (Tundra.events.send("InputAPI.MousePress", this.mouse))
            return;
        Tundra.events.send("InputAPI.MouseEvent", this.mouse);
    },

    onMouseReleaseInternal : function(event)
    {
        this.readMouseEvent("release", event);
        this.mouse.setButtons(false, false, false);

        if (Tundra.events.send("InputAPI.MouseClick", this.mouse))
            return;
        if (Tundra.events.send("InputAPI.MouseRelease", this.mouse))
            return;
        Tundra.events.send("InputAPI.MouseEvent", this.mouse);
    },

    _resetMouseWheelDir : function()
    {
        this._lastMouseWheelDir = 0;
    },

    onMouseWheelInternal : function(event, delta, deltaX, deltaY)
    {
        /* For somea reason we get -1 -1 -1 and then a +1 even if you dont change the wheel dir.
           Not sure if this is a jQuery or a browser bug. Happens on windows at least.
           Below code tries to ignore wheel events like this. It's very annoying when you do for
           example a wheel zoom that suddely jumps back. */
        if (typeof this._lastMouseWheelDir !== 0)
        {
            if ((this._lastMouseWheelDir < 0 && deltaY > 0) || (this._lastMouseWheelDir > 0 && deltaY < 0))
            {
                this._lastMouseWheelDir = 0;
                return;
            }
        }
        this.timing.async("reset.wheel.dir", this._resetMouseWheelDirBinded, 300);
        this._lastMouseWheelDir = deltaY;

        this.readMouseEvent("wheel", event, deltaY);

        if (Tundra.events.send("InputAPI.MouseWheel", this.mouse))
            return;
        Tundra.events.send("InputAPI.MouseEvent", this.mouse);
    },

    onMouseDoubleClickInternal : function(event)
    {
        this.readMouseEvent("dblclick", event);

        if (Tundra.events.send("InputAPI.MouseDoubleClicked", this.mouse))
            return;
        Tundra.events.send("InputAPI.MouseEvent", this.mouse);
    },

    readMouseEvent : function(type, event, wheelY)
    {
        this.mouse.setOriginalEvent(event, type);
        this.mouse.readButtonsFromEvent(event, type);

        /* @todo Use clientX/Y to get webrocket container coords?
           Using pageX on webrocket that is not at 0,0 will screw up relativeX/Y? */
        this.mouse.setPosition(event.pageX, event.pageY);

        if (typeof wheelY === "number")
            this.mouse.relativeZ = wheelY;

        this.mouse.setType(type);
    },

    onKeyPressInternal : function(event)
    {
        this.readKeyEvent(event);
        this.keyboard.type = "press";

        if (Tundra.events.send("InputAPI.KeyPress", this.keyboard))
            return;
        Tundra.events.send("InputAPI.KeyEvent", this.keyboard);
    },

    onKeyReleaseInternal : function(event)
    {
        this.readKeyEvent(event);
        this.keyboard.type = "release";

        if (Tundra.events.send("InputAPI.KeyRelease", this.keyboard))
            return;
        Tundra.events.send("InputAPI.KeyEvent", this.keyboard);
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

        // Track currently held down keys
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
