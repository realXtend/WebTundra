
define([
        "lib/hammer",
        "core/input/IInputEvent"
    ], function(Hammer, IInputEvent)
{

var InputEventTouch = IInputEvent.$extend(
/** @lends InputEventTouch.prototype */
{
    /**
        Input touch event.

        @extends IInputEvent
        @constructs
    */
    __init__ : function()
    {
        this.$super("InputEventTouch");

        Object.defineProperties(this,
        {
            /**
                True if event has more than one contact points.
                @var {Boolean}
                @memberof InputEventTouch.prototype
            */
            isMultiTouch : {
                get : function() { return (this.pointers.length > 1) }
            }
        });
        /**
            True when the first input.
            @var {Boolean}
        */
        this.isFirst = false;
        /**
            True when the final (last) input.
            @var {Boolean}
        */
        this.isFinal = false;
        /**
            Array with all pointers, including the
            ended pointers for end events.
            @var {Array}
        */
        this.pointers = [];
        /**
            Array with all new/moved/lost pointers.
            @var {Array}
        */
        this.changedPointers = [];
        /**
            Primary pointer type, can be 'touch', 'mouse', 'pen' or 'kinect'.
            @var {String}
        */
        this.pointerType = "";
        /**
            Event type, can be 'start', 'move', 'end' or 'cancel'.
            @var {String}
        */
        this.event = ""
        /**
            Event type id.
            @var {InputEventTouch.Event}
        */
        this.eventId = 0;
        /**
            Movement of the X axis.
            @var {Number
        */
        this.deltaX = 0;
        /**
            Movement of the Y axis.
            @var {Number}
        */
        this.deltaY = 0;
        /**
            Total time in msecs since the first input.
            @var {Number}
        */
        this.deltaTime = 0;
        /**
            Distance moved.
            @var {Number}
        */
        this.distance = 0;
        /**
            Angle moved.
            @var {Number}
        */
        this.angle = 0;
        /*
            Current velocity on the X axis, in px/msec.
            @var {Number}
        */
        this.velocityX = 0;
        /**
            Current velocity on the Y axis, in px/msec.
            @var {Number}
        */
        this.velocityY = 0;
        /**
            Current highest velocity of the X or Y axis, in px/msec.
            @var {Number}
        */
        this.velocity = 0;
        /**
            Direction moved.
            @var {InputEventTouch.Direction}
        */
        this.direction = 0;
        /**
            Direction moved from it's starting point.
            @var {InputEventTouch.Direction}
        */
        this.offsetDirection = 0;
        /**
            Scaling that has been done on multi-touch event.
            1 on a single touch.
            @var {Number}
        */
        this.scale = 1;
        /**
            Scaling that has been done since the last event on multi-touch event.
            0 on a single touch.
            @var {Number}
        */
        this.relativeScale = 0;
        /**
            Rotation that has been done on multi-touch.
            0 on a single touch.
            @var {Number}
        */
        this.rotation = 0;
        /**
            Rotation that has been done since the last event on multi-touch.
            0 on a single touch.
            @var {Number}
        */
        this.relativeRotation = 0;
        /**
            Center position for multi-touch. Average of all the contact points.
            For single touch the position of the touch.
            Uses clientX/Y, meaning the position is relative to the container
            and not the whole document.
            @var {Object} Has x and y number properties.

            @todo Same duplicate info as .x and .y. Move it IInputEvent once
            mouse uses clientX/Y so this can code logic can be unified.
        */
        this.center = { x : 0, y : 0 };

        // Internal.
        this._start = false;

        this._cache =
        {
            scale    : {},
            rotation : {}
        };
        this._clearCache();
    },

    __classvars__ :
    {
        /**
            @static
            @var {Object}
        */
        Type :
        {
            tap         : 1,
            doubletap   : 2,
            pan         : 3,
            swipe       : 4,
            press       : 5,
            pinch       : 6,
            rotate      : 7
        },

        /**
            @static
            @var {Object}
        */
        Event :
        {
            Start   : 1,
            Move    : 2,
            End     : 4,
            Cancel  : 8
        },

        /**
            @static
            @var {Object}
        */
        Direction :
        {
            None        : 1,
            Left        : 2,
            Right       : 4,
            Up          : 8,
            Down        : 16,
            Horizontal  : 6,
            Vertical    : 24,
            All         : 30
        },

        CommonHammerProperties :
        [
            "isFirst",
            "isFinal",
            "pointers",
            "changedPointers",
            "deltaX",
            "deltaY",
            "deltaTime",
            "distance",
            "angle",
            "velocityX",
            "velocityY",
            "velocity",
            "direction",
            "offsetDirection",
            "pointerType"
        ]
    },

    /// IInputEvent override
    clear : function()
    {
        this._start = true;
    },

    /**
        @return {String}
    */
    toString : function()
    {
        var str = this.name + "{ " + this.basePropertiesToString();
        return str + "\n    " + this.propertiesToString() + " }";
    },

    /**
        @return {String}
    */
    propertiesToString : function()
    {
        return "eventId:" + this.eventId +
            " event:" + this.event +
            " first:" + this.isFirst +
            " last:" + this.isFinal +
            " pointers:" + this.changedPointers.length + "/" + this.pointers.length + " " + this.pointerType +
            " delta:(" + this.deltaX + "," + this.deltaY + ")" +
            " deltaTime:" + this.deltaTime +
            " distance:" + this.distance +
            " angle:" + this.angle +
            " velocity:(" + this.velocityX + "," + this.velocityY + ")" +
            " direction:" + this.direction +
            " scale:" + this.scale +
            " relativeScale:" + this.relativeScale +
            " rotation:" + this.rotation +
            " relativeRotation:" + this.relativeRotation;
    },

    _copyProperties : function(src, properties)
    {
        for (var i = 0; i < properties.length; i++)
        {
           var prop = properties[i];
           this[prop] = src[prop];
        }
    },

    _clearCache : function(typeName)
    {
        if (typeof typeName !== "string")
        {
            var types = Object.keys(InputEventTouch.Type);
            for (var ti = 0; ti < types.length; ti++)
            {
                var typeName = types[ti];
                this._cache.scale[typeName] = 1;
                this._cache.rotation[typeName] = 0;
            }
        }
        else
        {
            this._cache.scale[typeName] = 1;
            this._cache.rotation[typeName] = 0;
        }
    },

    /// IInputEvent override
    setOriginalEvent : function(e)
    {
        this.$super(e.srcEvent); // Call base impl

        this._copyProperties(e, InputEventTouch.CommonHammerProperties);
        this._preventDefaultFunction = e.preventDefault;

        this.setType(e.type);
        this.setEvent(e.eventType);

        /// @todo This does not work for "pan2"! isFirst is always false
        if (this._start === true)
        {
            this.clearPosition();
            this.clearScaleAndRotation();
            this.isFirst = true;
            this._start = false;
        }

        // @todo Refactor this.center away when mouse events use clientX/Y.
        this.setPosition(e.center.x, e.center.y);
        this.center.x = e.center.x;
        this.center.y = e.center.y;

        this.setScale(e);
        this.setRotation(e);

        // Remove any relative movement, scaling and rotation from end/cancel events.
        if (this.eventId === Hammer.INPUT_END || this.eventId === Hammer.INPUT_CANCEL)
        {
            this.clearRelativePosition();
            this.clearRelativeScaleAndRotation();
        }
    },

    setType : function(type)
    {
        if (type === "pan2")
            type = "pan";

        this.type = type;
        this.typeId = (typeof InputEventTouch.Type[type] === "number" ? InputEventTouch.Type[type] : IInputEvent.Type.Unknown);
    },

    setEvent : function(eId)
    {
        switch(eId)
        {
            case Hammer.INPUT_START:
            {
                this.event = "start";
                this._start = true;
                break;
            }
            case Hammer.INPUT_MOVE:
            {
                this.event = "move";
                break;
            }
            case Hammer.INPUT_END:
            {
                this.event = "end";
                this.isFinal = true;
                break;
            }
            case Hammer.INPUT_CANCEL:
            {
                this.event = "cancel";
                this.isFinal = true;
                break;
            }
            default:
            {
                this.log.error("setEvent: Invalid event id:", eId)
                this.event = "";
                this.eventId = -1;
                this.clearPosition();
                this.clearRelativeScaleAndRotation();
                return;
            }
        }
        this.eventId = eId;
    },

    /// IInputEvent override
    setPosition : function(x, y)
    {
        /* We must reset the first events relative position changes.
           Otherwise our calculations based on hammer.js event center pos
           will have hammer.js movement threshold in it. */
        var xNull = (this.x === null);
        var yNull = (this.y === null);

        this.$super(x, y); // Call base impl

        if (xNull)
            this.relativeX = 0;
        if (yNull)
            this.relativeY = 0;
    },

    clearScaleAndRotation : function()
    {
        this.scale = 1;
        this.rotation = 0;
        this._clearCache(this.type);
    },

    clearRelativeScaleAndRotation : function()
    {
        this.relativeScale = 0
        this.relativeRotation = 0;
    },

    setScale : function(e)
    {
        var current = this._cache.scale[e.type];
        if (e.pointers.length > 1 && typeof current === "number")
            this.relativeScale = e.scale - current;
        else
            this.relativeScale = 0;
        this._cache.scale[e.type] = this.scale = e.scale
    },

    setRotation : function(e)
    {
        var current = this._cache.rotation[e.type];
        if (e.pointers.length > 1 && typeof current === "number")
            this.relativeRotation = e.rotation - current;
        else
            this.relativeRotation = 0;
        this._cache.rotation[e.type] = this.rotation = e.rotation;
    }
});

return InputEventTouch;

}); // require js
