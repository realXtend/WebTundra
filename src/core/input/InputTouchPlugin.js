
define([
        "lib/jquery.jgestures",
        "core/framework/TundraSDK",
        "core/input/IInputPlugin"
    ], function(jgestures, TundraSDK, IInputPlugin) {

/**
    Provides touch state and events. Accessible from InputAPI.getPlugin("Touch").

    @class InputTouchPlugin
    @extends IInputPlugin
    @constructor
*/
var InputTouchPlugin = IInputPlugin.$extend(
{
    /**
        Event object description for
		{{#crossLink "InputTouchPlugin/onTouchEvent:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onTapOne:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onTapTwo:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onTapThree:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onPinch:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onPinchOpen:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onPinchClose:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onRotate:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onRotateCW:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onRotateCCW:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onSwipeMove:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onSwipeOne:method"}}{{/crossLink}}
		{{#crossLink "InputTouchPlugin/onSwipeTwo:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onSwipeThree:method"}}{{/crossLink}},
		{{#crossLink "InputTouchPlugin/onSwipeFour:method"}}{{/crossLink}},
		and {{#crossLink "InputTouchPlugin/onShake:method"}}{{/crossLink}} callbacks.
        @event TouchEvent
        @param {String} type "tapone" | "taptwo" | "tapthree" | "tapfour" | "pinch" | "pinchopen" | "pinchclose" | "rotate" | "rotatecw" | "rotateccw" | "swipeone" | "swipetwo" | "swipethree" | "swipefour" | "shake"
        @param {Number} x Current x position
        @param {Number} y Current y position
        @param {Number} relativeX Relative x movement since last touch event
        @param {Number} relativeY Relative y movement since last touch event
        @param {String} targetId DOM element id that the touch event occurred on
        @param {String} targetNodeName HTML node name eg. 'canvas' and 'div'. Useful for detected
        when on 'canvas' element aka the touch event occurred on the 3D scene canvas and not on top of a UI widget.
        @param {Object} originalEvent Original jQuery touch event
    */

    __init__ : function(params)
    {
        this.$super("Touch");
    },

    start : function()
    {
        /**
            Current touch state
            <pre>{
                startx : String,
                startx : Number,
                starty : Number
            }</pre>

                if (TundraSDK.framework.touch.touch.type === "tapone")
                    console.log("User tapped screen.");

            @property touch
            @type Object
        */

        this.touch =
        {
            // Event type: move, press, release, wheel
            type : "",
            originaltype: "",
            // Start x, start y, moved
            startx : null,
            starty : null,
            moved : null,
            // Relative position
            relativeX : 0,
            relativeY : 0,
            // HTML element id that the touch event occurred on
            targetId : "",
            // HTML node name eg. 'canvas' and 'div'. Useful for detected
            // when on 'canvas' element aka the touch event occurred on the
            // 3D scene canvas and not on top of a UI widget.
            targetNodeName : "",
            // Original jQuery event
            originalEvent : null
        };

        // Register main container touch events
        this.registerTouchEvents(TundraSDK.framework.client.container);
    },

    stop : function()
    {
        this.reset();
    },

    reset : function()
    {
        TundraSDK.framework.events.remove("InputTouchPlugin.TouchEvent");
        TundraSDK.framework.events.remove("InputTouchPlugin.TapOneEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.TapTwoEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.TapThreeEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.SwipeMoveEvent");
        TundraSDK.framework.events.remove("InputTouchPlugin.SwipeOneEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.SwipeTwoEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.SwipeThreeEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.SwipeFourEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.PinchEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.PinchOpenEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.PinchCloseEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.RotateEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.RotateCWEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.RotateCCWEvent");
		TundraSDK.framework.events.remove("InputTouchPlugin.ShakeEvent");
    },

    registerTouchEvents : function(element)
    {
        var qElement = $(element);

        // Touch events
		var that = this;
        qElement.bind('tapone', function(e, obj) {
            that.onTapOneInternal(e, obj);
        });
        qElement.bind('taptwo', function(e, obj) {
            that.onTapTwoInternal(e, obj);
        });
        qElement.bind('tapthree', function(e, obj) {
            that.onTapThreeInternal(e, obj);
        });
        qElement.bind('swipemove', function(e, obj) {
            that.onSwipeMoveInternal(e, obj);
        });
        qElement.bind('swipeone', function(e, obj) {
            that.onSwipeOneInternal(e, obj);
        });
        qElement.bind('swipetwo', function(e, obj) {
            that.onSwipeTwoInternal(e, obj);
        });
        qElement.bind('swipethree', function(e, obj) {
            that.onSwipeThreeInternal(e, obj);
        });
        qElement.bind('swipefour', function(e, obj) {
            that.onSwipeFourInternal(e, obj);
        });
        qElement.bind('pinch', function(e, obj) {
            that.onPinchInternal(e, obj);
        });
		qElement.bind('pinchclose', function(e, obj) {
            that.onPinchCloseInternal(e, obj);
        });
		qElement.bind('pinchopen', function(e, obj) {
            that.onPinchOpenInternal(e, obj);
        });
		qElement.bind('rotate', function(e, obj) {
            that.onRotateInternal(e, obj);
        });
		qElement.bind('rotatecw', function(e, obj) {
            that.onRotateCWInternal(e, obj);
        });
		qElement.bind('rotateccw', function(e, obj) {
            that.onRotateCCWInternal(e, obj);
        });
		qElement.bind('shake', function(e, obj) {
            that.onShakeInternal(e, obj);
        });
    },




    /**
        Registers a callback for all touch events. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onTouchEvent(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onTouchEvent(null, onTouchEvent);

        @method onTouchEvent
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onTouchEvent : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.TouchEvent", context, callback);
    },

    /**
        Registers a callback for tap with one finger event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onTapOne(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onTapOne(null, onTapOne);

        @method onTapOne
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onTapOne : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.TapOneEvent", context, callback);
    },

    /**
        Registers a callback for tap with two fingers event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onTapTwo(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onTapTwo(null, onTapTwo);

        @method onTapTwo
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onTapTwo : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.TapTwoEvent", context, callback);
    },

    /**
        Registers a callback for tap with three fingers event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onTapThree(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onTapThree(null, onTapThree);

        @method onTapThree
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onTapThree : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.TapThreeEvent", context, callback);
    },

    /**
        Registers a callback for swipe move event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onSwipeMove(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onSwipeMove(null, onSwipeMove);

        @method onSwipeMove
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onSwipeMove : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.SwipeMoveEvent", context, callback);
    },

    /**
        Registers a callback for swipe one finger event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onSwipeOne(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onSwipeOne(null, onSwipeOne);

        @method onSwipeOne
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onSwipeOne : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.SwipeOneEvent", context, callback);
    },

    /**
        Registers a callback for swipe with two fingers event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onSwipeTwo(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onSwipeTwo(null, onSwipeTwo);

        @method onSwipeTwo
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onSwipeTwo : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.SwipeTwoEvent", context, callback);
    },

    /**
        Registers a callback for swipe with three fingers event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onSwipeThree(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onSwipeThree(null, onSwipeThree);

        @method onSwipeThree
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onSwipeThree : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.SwipeThreeEvent", context, callback);
    },

    /**
        Registers a callback for swipe with four fingers event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onSwipeFour(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onSwipeFour(null, onSwipeFour);

        @method onSwipeFour
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onSwipeFour : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.SwipeFourEvent", context, callback);
    },

    /**
        Registers a callback for pinch event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onPinch(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onPinch(null, onPinch);

        @method onPinch
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onPinch : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.PinchEvent", context, callback);
    },

    /**
        Registers a callback for pinch open event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onPinchOpen(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onPinchOpen(null, onPinchOpen);

        @method onPinchOpen
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onPinchOpen : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.PinchOpenEvent", context, callback);
    },

    /**
        Registers a callback for pinch close event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onPinchClose(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onPinchClose(null, onPinchClose);

        @method onPinchClose
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onPinchClose : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.PinchCloseEvent", context, callback);
    },

    /**
        Registers a callback for rotate event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onRotate(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onRotate(null, onRotate);

        @method onRotate
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onRotate : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.RotateEvent", context, callback);
    },

    /**
        Registers a callback for rotate clockwise event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onRotateCW(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onRotateCW(null, onRotateCW);

        @method onRotateCW
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onRotateCW : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.RotateCWEvent", context, callback);
    },

    /**
        Registers a callback for rotate counter clockwise event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onRotateCCW(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onRotateCCW(null, onRotateCCW);

        @method onRotateCCW
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onRotateCCW : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.RotateCCWEvent", context, callback);
    },

    /**
        Registers a callback for shake event. See {{#crossLink "InputTouchPlugin/TouchEvent:event"}}{{/crossLink}} for event data.
        @example
            function onShake(event)
            {
                // event === TouchEvent
            }

            TundraSDK.framework.touch.onShake(null, onShake);

        @method onShake
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
	onShake : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("InputTouchPlugin.ShakeEvent", context, callback);
    },

    onTapOneInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
	   	this.touch.type = "tapone";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
		TundraSDK.framework.events.send("InputTouchPlugin.TapOneEvent", this.touch);
    },

    onTapTwoInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "taptwo";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
		TundraSDK.framework.events.send("InputTouchPlugin.TapTwoEvent", this.touch);
    },

	onTapThreeInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "tapthree";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
		TundraSDK.framework.events.send("InputTouchPlugin.TapThreeEvent", this.touch);
    },

    onSwipeMoveInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "swipemove";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.SwipeMoveEvent", this.touch);
    },

    onSwipeOneInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "swipeone";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.SwipeOneEvent", this.touch);
    },

    onSwipeTwoInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "swipetwo";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.SwipeTwoEvent", this.touch);
    },

    onSwipeThreeInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "swipethree";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.SwipeThreeEvent", this.touch);
    },

    onSwipeFourInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "swipefour";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.SwipeFourEvent", this.touch);
    },

    onPinchInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "pinch";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.PinchEvent", this.touch);
    },

    onPinchOpenInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "pinchopen";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.PinchEvent", this.touch);
		TundraSDK.framework.events.send("InputTouchPlugin.PinchOpenEvent", this.touch);
    },

    onPinchCloseInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "pinchclose";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.PinchEvent", this.touch);
		TundraSDK.framework.events.send("InputTouchPlugin.PinchCloseEvent", this.touch);
    },

    onRotateInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "rotate";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.RotateEvent", this.touch);
    },

    onRotateCWInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "rotatecw";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.RotateEvent", this.touch);
		TundraSDK.framework.events.send("InputTouchPlugin.RotateCWEvent", this.touch);
    },

    onRotateCCWInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "rotateccw";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.RotateEvent", this.touch);
		TundraSDK.framework.events.send("InputTouchPlugin.RotateCCWEvent", this.touch);
    },

    onShakeInternal : function(event, obj)
    {
		this.readTouchEvent(event, obj);
		this.touch.type = "shake";

		TundraSDK.framework.events.send("InputTouchPlugin.TouchEvent", this.touch);
        TundraSDK.framework.events.send("InputTouchPlugin.ShakeEvent", this.touch);
    },

	readTouchEvent : function(event, obj)
	{

		event.preventDefault();
		obj.originalEvent.preventDefault();

		this.touch.type = obj.description;
		this.touch.originaltype = obj.description;

        // Target element
        if (event.target !== undefined && event.target !== null)
        {
            this.touch.targetNodeName = event.target.localName;
            this.touch.targetId = event.target.id;
        }
        else
        {
            this.touch.targetNodeName = "";
            this.touch.targetId = "";
        }

		// Original jQuery event
        this.touch.originalEvent = obj.originalEvent;

        // Relative movement
        if (this.touch.startx != null)
            this.touch.relativeX = this.touch.originalEvent.pageX - this.touch.startx;
        if (this.touch.starty != null)
            this.touch.relativeY = this.touch.originalEvent.pageY - this.touch.starty;

		//Touch position
		this.touch.startx = obj.delta[0].startX;
		this.touch.starty = obj.delta[0].startY;

		//Touch moved amount
		this.touch.moved = obj.delta[0].moved;
	}
});

InputTouchPlugin.register();

return InputTouchPlugin;

}); // require js
