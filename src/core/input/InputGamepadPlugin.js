
define([
        "core/framework/Tundra",
        "core/input/IInputPlugin"
    ], function(Tundra, IInputPlugin) {

var InputGamepadPlugin = IInputPlugin.$extend(
/** @lends InputGamepadPlugin.prototype */
{
    /**
        Provides gamepad state and events. Accessible from InputAPI.getPlugin("Gamepad").

        @constructs
        @extends IInputPlugin
        @private
    */
    __init__ : function()
    {
        this.$super("Gamepad");
        /**
            @todo Document this object
            @var {Object} gamepad
        */
    },

    start : function()
    {
        this.gamepadSupportAvailable = null;

        /**
            Current gamepad state.

            @property {Object} gamepad
            @property {number} gamepad.gamepadid Gamepad ID
            @property {Array.<Object>} gamepad.button Button values. Typical count 16. 8 additional added.
            @property {Array.<any>} gamepad.axis stick: x, x: value, y: value
            @property {Array.<any>} gamepad.gamepads The list of attached gamepads
            @property {Array.<any>} gamepad.prevRawGamepadTypes Remembers the connected gamepads at the last check; used in Chrome to figure out when gamepads get connected or disconnected, since no events are fired.
            @property {Array.<any>} gamepad.prevTimestamps Previous timestamps for gamepad state; used in Chrome to not bother with analyzing the polled data if nothing changed (timestamp is the same as last time).
            @property {number} gamepad.AXIS_THRESHOLD Threshold for axis indicating it is moving.
            @property {number} gamepad.TYPICAL_BUTTON_COUNT A number of typical buttons recognized by Gamepad API and mapped to standard controls. Any extraneous buttons will have larger indexes.
            @property {number} gamepad.TYPICAL_AXIS_COUNT A number of typical axes recognized by Gamepad API and mapped to standard controls. Any extraneous buttons will have larger indexes.
        */
        this.gamepad =
        {
            gamepadid : null,
            button : [],
            axis : [],
            gamepads: [],
            prevRawGamepadTypes: [],
            prevTimestamps: [],
            AXIS_THRESHOLD:  .1,
            TYPICAL_BUTTON_COUNT: 16,
            TYPICAL_AXIS_COUNT: 4
        };

        // Check browser support
        this.gamepadSupportAvailable = (!!navigator.webkitGetGamepads || !!navigator.webkitGamepads || (navigator.userAgent.indexOf('Firefox/') != -1));
        if (this.gamepadSupportAvailable)
        {
            this.registerEvent("GamepadEvent", "InputGamepadPlugin.GamepadEvent");
            this.registerEvent("GamepadStatusEvent", "InputGamepadPlugin.GamepadStatusEvent");

            // Connect frame update
            Tundra.frame.onUpdate(this, this.onUpdate);
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
            Tundra.events.remove("InputGamepadPlugin.GamepadEvent");
            Tundra.events.remove("InputGamepadPlugin.GamepadStatusEvent");
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
                Tundra.events.send("InputGamepadPlugin.GamepadStatusEvent", this.gamepad);
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

        Tundra.events.send("InputGamepadPlugin.GamepadEvent", this.gamepad);
    },

    /**
        Registers a callback for all gamepad events. See {{#crossLink "InputGamepadPlugin/GamepadEvent:event"}}{{/crossLink}} for event data.

        @subscribes

        * @example
        * Tundra.input.onGamepadEvent(function(event) {
        *     // event === GamepadEvent
        * });
    */
    onGamepadEvent : function(context, callback)
    {
        return Tundra.events.subscribe("InputGamepadPlugin.GamepadEvent", context, callback);
    },

    /**
        Registers a callback for gamepad status change. If there is no gamepad status is null See {{#crossLink "InputGamepadPlugin/GamepadEvent:event"}}{{/crossLink}} for event data.

        @subscribes

        * @example
        * Tundra.input.onGamepadStatusEvent(function(event) {
        *     // event === GamepadEvent
        * });
    */
    onGamepadStatusEvent : function(context, callback)
    {
        return Tundra.events.subscribe("InputGamepadPlugin.GamepadStatusEvent", context, callback);
    }
});

InputGamepadPlugin.register();

return InputGamepadPlugin;

}); // require js
