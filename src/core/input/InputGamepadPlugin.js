
define([
        "core/framework/TundraSDK",
        "core/input/IInputPlugin"
    ], function(TundraSDK, IInputPlugin) {

/**
    Provides gamepad state and events. Accessible from InputAPI.getPlugin("Gamepad").

    @class InputGamepadPlugin
    @extends IInputPlugin
    @constructor
*/
var InputGamepadPlugin = IInputPlugin.$extend(
{
    /**
        Event object description for
        {{#crossLink "InputGamepadPlugin/onGamepadEvent:method"}}{{/crossLink}},
        and {{#crossLink "InputGamepadPlugin/onGamepadStatusEvent:method"}}{{/crossLink}} callbacks.
        @event GamepadEvent
        @param {String} gamepadid Gamepad id. e.g. XBOX 360...
        @param {String[]} button Array of current button values
        @param {String[]} axis Array of current axis values
    */

    __init__ : function()
    {
        this.$super("Gamepad");
    },

    start : function()
    {
        this.gamepadSupportAvailable = null;

        /**
            Current gamepad state
            <pre>{
                type : String,
                currentval : Number
            }</pre>

            console.log(TundraSDK.framework.gamepad.gamepad.type +" has value "+TundraSDK.framework.gamepad.gamepad.currentval);

            @property gamepad
            @type Object
        */
        this.gamepad =
        {
            //Gamepad id
            gamepadid : null,
            // Button values. Typical count 16. 8 additional added.
            button : [], //"button: x, pressed: true/false"
            // Axis values. Typical count 4. 4 additional added.
            axis : [], //stick: x, x: value, y: value
            // The list of attached gamepads
            gamepads: [],
            // Remembers the connected gamepads at the last check; used in Chrome
            // to figure out when gamepads get connected or disconnected, since no
            // events are fired.
            prevRawGamepadTypes: [],
            // Previous timestamps for gamepad state; used in Chrome to not bother with
            // analyzing the polled data if nothing changed (timestamp is the same
            // as last time).
            prevTimestamps: [],
            // Threshold for axis indicating it is moving.
            AXIS_THRESHOLD:  .1,
            // A number of typical buttons recognized by Gamepad API and mapped to
            // standard controls. Any extraneous buttons will have larger indexes.
            TYPICAL_BUTTON_COUNT: 16,
            // A number of typical axes recognized by Gamepad API and mapped to
            // standard controls. Any extraneous buttons will have larger indexes.
            TYPICAL_AXIS_COUNT: 4
        };

        // Check browser support
        this.gamepadSupportAvailable = (!!navigator.webkitGetGamepads || !!navigator.webkitGamepads || (navigator.userAgent.indexOf('Firefox/') != -1));
        if (this.gamepadSupportAvailable)
        {
            this.registerEvent("GamepadEvent", "InputGamepadPlugin.GamepadEvent");
            this.registerEvent("GamepadStatusEvent", "InputGamepadPlugin.GamepadStatusEvent");

            // Connect frame update
            TundraSDK.framework.frame.onUpdate(this, this.onUpdate);
        }
    },

    stop : function()
    {
        this.reset();
    },

    reset : function()
    {
        if (this.gamepadSupportAvailable)
        {
            TundraSDK.framework.events.remove("InputGamepadPlugin.GamepadEvent");
            TundraSDK.framework.events.remove("InputGamepadPlugin.GamepadStatusEvent");
        }
    },

    isBrowserSupported : function()
    {
        return this.gamepadSupportAvailable;
    },

    onUpdate : function(frametime)
    {
        // Checks for the gamepad status. Monitors the necessary data and notices
        // the differences from previous state
        this.pollGamepads();

        for (var i in this.gamepad.gamepads)
        {
            var gpad = this.gamepad.gamepads[i];

            // Only supported in Chrome. If timestamp value is same as previous. Gamepad state hasn´t changed.
            if (gpad.timestamp && (gpad.timestamp == this.gamepad.prevTimestamps[i])) {
                continue;
            }

            this.gamepad.prevTimestamps[i] = gpad.timestamp;
            this.sendGamepadChanges(i);
        }
    },

    pollGamepads : function()
    {
        var rawGamepads = null;
        if (typeof navigator.webkitGetGamepads === "function")
            rawGamepads = navigator.webkitGetGamepads();

        if (rawGamepads != null && rawGamepads.length !== undefined) {

            this.gamepad.gamepads = [];
            var gamepadsChanged = false;

            for (var i = 0; i < rawGamepads.length; i++)
            {
                if (typeof rawGamepads[i] != this.gamepad.prevRawGamepadTypes[i]) {
                    gamepadsChanged = true;
                    this.gamepad.prevRawGamepadTypes[i] = typeof rawGamepads[i];
                }

                if (rawGamepads[i]) {
                    this.gamepad.gamepads.push(rawGamepads[i]);
                }
            }

            if (gamepadsChanged)
            {
                if (this.gamepad.gamepads[0])
                {
                    this.gamepad.gamepadid = this.gamepad.gamepads[0].id;
                }
                else
                {
                    this.gamepad.gamepadid = "null";
                }
                TundraSDK.framework.events.send("InputGamepadPlugin.GamepadStatusEvent", this.gamepad);
            }
        }
    },

    sendGamepadChanges : function(gamepadId)
    {
        var gpad = this.gamepad.gamepads[gamepadId];
        //Clear previous values
        this.gamepad.button = [];
        this.gamepad.axis = [];

        //Set new button values
        for (var i = 0; i < 16; i++)
        {
            var prs = false;
            if (gpad.buttons[i] == 1)
            {
                prs = true;
            }
            this.gamepad.button.push({button: i, pressed: prs});
        }

        //Set new axis values
        var x1 = gpad.axes[0];
        var y1 = gpad.axes[1];
        var x2 = gpad.axes[2];
        var y2 = gpad.axes[3];

        this.gamepad.axis.push({stick: 0, x: x1, y: y1});
        this.gamepad.axis.push({stick: 1, x: x2, y: y2});

        // Extra buttons.
        var extraButtonId = this.gamepad.TYPICAL_BUTTON_COUNT;
        while (typeof gpad.buttons[extraButtonId] != 'undefined') {
            var prs = false;
            if (gpad.buttons[extraButtonId] == 1)
            {
                prs = true;
            }
            this.gamepad.button.push({button: extraButtonId, pressed: prs});
            extraButtonId++;
        }

        // Extra axes. Read pairs
        var extraAxisId = this.gamepad.TYPICAL_AXIS_COUNT;
        while (typeof gpad.axes[extraAxisId] != 'undefined') {
            var x1 = gpad.axes[extraAxisId];
            var y1 = gpad.axes[extraAxisId + 1];
            this.gamepad.axis.push({stick: extraAxisId, x: x1, y: y1});
            extraAxisId = extraAxisId + 2;
        }

        TundraSDK.framework.events.send("InputGamepadPlugin.GamepadEvent", this.gamepad);
    },

    /**
        Registers a callback for all gamepad events. See {{#crossLink "InputGamepadPlugin/GamepadEvent:event"}}{{/crossLink}} for event data.
        @example
            function onGamepadEvent(event)
            {
                // event === GamepadEvent
            }

            TundraSDK.framework.input.onGamepadEvent(null, onGamepadEvent);

        @method onGamepadEvent
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onGamepadEvent : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputGamepadPlugin.GamepadEvent", context, callback);
    },

    /**
        Registers a callback for gamepad status change. If there is no gamepad status is null See {{#crossLink "InputGamepadPlugin/GamepadEvent:event"}}{{/crossLink}} for event data.
        @example
            function onGamepadStatusEvent(event)
            {
                // event === GamepadEvent
            }

            TundraSDK.framework.input.onGamepadStatusEvent(null, onGamepadStatusEvent);

        @method onGamepadStatusEvent
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onGamepadStatusEvent : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputGamepadPlugin.GamepadStatusEvent", context, callback);
    }
});

InputGamepadPlugin.register();

return InputGamepadPlugin;

}); // require js
