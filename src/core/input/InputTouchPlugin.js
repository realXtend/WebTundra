
define([
        "lib/hammer",
        "core/framework/Tundra",
        "core/input/IInputPlugin",
        "core/input/InputEventTouch"
    ], function(Hammer, Tundra, IInputPlugin, InputEventTouch) {

var InputTouchPlugin = IInputPlugin.$extend(
/** @lends InputTouchPlugin.prototype */
{
    /**
        Provides touch state and events. Accessible from InputAPI.getPlugin("Touch").

        @constructs
        @extends IInputPlugin
        @private
    */
    __init__ : function(params)
    {
        this.$super("Touch");

        this.suppressing = { "pan" : false };
        this.hammers = [];

        /**
            Current touch state.
            @var {InputEventTouch} touch
        */
    },

    __classvars__ :
    {
        /* We don't want to simulate touch events from mouse on desktop.
           This will mostly give "pan" events which are already implemented
           with mouse move events in InputAPI. However if on mobile, these
           should be left on to support certain devices/browsers that fake
           touch input from mouse eg. IE on Windows phones/tablets. */
        SimulateWithMouse : Tundra.browser.isMobile(),

        /* Suppress time for any pan events after multitouch event has been stopped.
           When you do a pinch motion, you many times let go of the second finger,
           while still moving the other finger. This triggers an unfortunate
           one finger pan once all the multi touches are done.
           Configurable time in msecs for how long to suppress one finger pan
           after multitouch pan has ended. */
        SuppressMasecPanAfterMultiPan : 200
    },

    start : function()
    {
        this.touch = new InputEventTouch();

        this.registerTouchEvents(Tundra.client.container);
        this.registerEvent("TouchEvent", "InputTouchPlugin.TouchEvent");
        this.registerEvent("TouchPan", "InputTouchPlugin.TouchPan");
        this.registerEvent("TouchSwipe", "InputTouchPlugin.TouchSwipe");
        this.registerEvent("TouchPinch", "InputTouchPlugin.TouchPinch");
        this.registerEvent("TouchRotate", "InputTouchPlugin.TouchRotate");
        this.registerEvent("TouchPress", "InputTouchPlugin.TouchPress");
        this.registerEvent("TouchTap", "InputTouchPlugin.TouchTap");
        this.registerEvent("TouchDoubleTap", "InputTouchPlugin.TouchDoubleTap");
    },

    stop : function()
    {
        for (var i = 0; i < this.hammers.length; i++)
        {
            this.hammers[i].stop(true);
            this.hammers[i].destroy();
        }
        this.hammers = [];
    },

    registerTouchEvents : function(element)
    {
        var hammer = new Hammer($(element).get(0));

        /* Configure pinch and rotate to work at the same time.
           This leaves the application to decide which one it wants to use.
           They will trigger pretty much from all >1 tounch point movement,
           so its hard to do detect which one should be triggered etc. */
        var rotate = new Hammer.Rotate();
        var pinch = new Hammer.Pinch();
        var pan = hammer.get("pan").set({
            threshold   : 10,
            pointers    : 1,
            direction   : Hammer.DIRECTION_ALL
        });
        var pan2 = new Hammer.Pan({
            event       : "pan2",
            threshold   : 15,
            pointers    : 2,
            direction   : Hammer.DIRECTION_ALL
        });
        pan2.recognizeWith(pan);
        pinch.recognizeWith([ pan2 ]);
        rotate.recognizeWith([ pinch, pan2 ]);
        hammer.add([ pan2, pinch, rotate ]);

        // Configure tap movement/pos pixel thresholds to be bigger
        hammer.get("rotate").set({ threshold : 10 });
        hammer.get("tap").set({ threshold : 10 });
        hammer.get("doubletap").set({ threshold : 10, posThreshold : 20});
        hammer.get("pinch").set({ threshold : 0.05 });

        hammer.on("pan", this._onPanInternal.bind(this));
        hammer.on("pan2", this._onPanInternal.bind(this));
        hammer.on("swipe", this._onSwipeInternal.bind(this));
        hammer.on("pinch", this._onPinchInternal.bind(this));
        hammer.on("rotate", this._onRotateInternal.bind(this));
        hammer.on("press", this._onPressInternal.bind(this));
        hammer.on("tap", this._onTapInternal.bind(this));
        hammer.on("doubletap", this._onDoubleTapInternal.bind(this));

        hammer.on("hammer.input", function(e) {
            if (e.eventType === Hammer.INPUT_START)
            {
                this.touch.clear();
                //Tundra.ui.autoFullscreen();
            }
        }.bind(this));

        this.hammers.push(hammer);
    },

    _onPanInternal : function(e)
    {
        // Ignore pan2 if pan1 is not ongoing.
        //if (!e.isFirst && e.type === "pan2" && this.touch.type !== "pan")
        //    return;
        if (!this.readTouchEvent(e))
            return;

        var multiTouch = this.touch.isMultiTouch;
        if (this.touch.eventId === InputEventTouch.Event.End && multiTouch && !this.suppressing.pan)
        {
            if (typeof InputTouchPlugin.SuppressMasecPanAfterMultiPan === "number" && InputTouchPlugin.SuppressMasecPanAfterMultiPan > 0)
            {
                setTimeout(function() {
                    this.suppressing.pan = false;
                }.bind(this), InputTouchPlugin.SuppressMasecPanAfterMultiPan);
                this.suppressing.pan = true;
            }
        }
        else if (!multiTouch && this.suppressing.pan)
            return;

        if (Tundra.events.send("InputTouchPlugin.TouchPan", this.touch) === true)
            return;
        Tundra.events.send("InputTouchPlugin.TouchEvent", this.touch);
    },

    _onSwipeInternal : function(e)
    {
        if (!this.readTouchEvent(e))
            return;

        if (Tundra.events.send("InputTouchPlugin.TouchSwipe", this.touch) === true)
            return;
        Tundra.events.send("InputTouchPlugin.TouchEvent", this.touch);
    },

    _onPinchInternal : function(e)
    {
        if (!this.readTouchEvent(e))
            return;

        if (Tundra.events.send("InputTouchPlugin.TouchPinch", this.touch) === true)
            return;
        Tundra.events.send("InputTouchPlugin.TouchEvent", this.touch);
    },

    _onRotateInternal : function(e)
    {
        if (!this.readTouchEvent(e))
            return;

        if (Tundra.events.send("InputTouchPlugin.TouchRotate", this.touch) === true)
            return;
        Tundra.events.send("InputTouchPlugin.TouchEvent", this.touch);
    },

    _onPressInternal : function(e)
    {
        if (!this.readTouchEvent(e))
            return;

        if (Tundra.events.send("InputTouchPlugin.TouchPress", this.touch) === true)
            return;
        Tundra.events.send("InputTouchPlugin.TouchEvent", this.touch);
    },

    _onTapInternal : function(e)
    {
        if (!this.readTouchEvent(e))
            return;

        if (Tundra.events.send("InputTouchPlugin.TouchTap", this.touch) === true)
            return;
        Tundra.events.send("InputTouchPlugin.TouchEvent", this.touch);
    },

    _onDoubleTapInternal : function(e)
    {
        if (!this.readTouchEvent(e))
            return;

        if (Tundra.events.send("InputTouchPlugin.TouchDoubleTap", this.touch) === true)
            return;
        Tundra.events.send("InputTouchPlugin.TouchEvent", this.touch);
    },

    readTouchEvent : function(e)
    {
        /* Don't process "touch" events that are simulated from mouse events.
           This happens when running on non touch devices, eg. desktop browsers. */
        if (InputTouchPlugin.SimulateWithMouse === false)
            if (e.pointerType === "mouse" || e.srcEvent instanceof MouseEvent)
                return false;

        this.touch.setOriginalEvent(e);
        return true;
    },

    /**
        Register handler for all touch events.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
    */
    onTouchEvent : function(context, callback)
    {
        return Tundra.events.subscribe("InputTouchPlugin.TouchEvent", context, callback);
    },

    /**
        Register handler for all touch events.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
    */
    onTouchPan : function(context, callback)
    {
        return Tundra.events.subscribe("InputTouchPlugin.TouchPan", context, callback);
    }
});

InputTouchPlugin.register();

return InputTouchPlugin;

}); // require js
