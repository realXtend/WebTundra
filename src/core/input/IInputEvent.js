
define([
        "lib/classy",
        "core/framework/TundraLogging",
    ], function(Class, TundraLogging)
{

var IInputEvent = Class.$extend(
/** @lends IInputEvent.prototype */
{
    /**
        Input event interface.

        @constructs
        @param {String} name
    */
    __init__ : function(name)
    {
        if (typeof name !== "string")
        {
            console.error("IInputEvent cannot be constructed without a name. Given:", name);
            return;
        }
        this.log = TundraLogging.getLogger(name);

        /*
            Event name.
            @var {String}
        */
        this.name = name;
        /*
            Event type.
            @var {String}
        */
        this.type = "";
        /*
            Event type id.
            @var {Number}
        */
        this.typeId = IInputEvent.Type.Unknown;
        /*
            Event absolute position on the X axis.
            @var {Number}
        */
        this.x = null;
        /*
            Event absolute position on the Y axis.
            @var {Number}
        */
        this.y = null;
        /*
            Event absolute position on the Z axis. Only used for 3D input devices/sensors.
            @var {Number}
        */
        this.z = null;
        /*
            Event relative movement on the X axis since the last event.
            @var {Number}
        */
        this.relativeX = 0;
        /*
            Event relative movement on the Y axis since the last event.
            @var {Number}
        */
        this.relativeY = 0;
        /*
            Event relative movement on the Z axis since the last event.
            Used for eg. mouse wheel if a 2D input device.
            @var {Number}
        */
        this.relativeZ = 0;
        /*
            Target DOM element that the event occurred on.
            @var {Object}
        */
        this.target = null;
        /*
            HTML element id that the event occurred on.
            @var {String}
        */
        this.targetId = "";
        /*
            HTML node name e.g. "canvas" or "div".
            You can check for "canvas" to know the event occurred
            on top of the 3D rendering and not on a UI element.
            @var {String}
        */
        this.targetNodeName = "";
        /*
            Original event that was used to construct this input event.
            @var {Object}
        */
        this.originalEvent = null;

        // Internal reference to prevert default if differs or not in originalEvent.
        this._preventDefaultFunction = null;
    },

    __classvars__ :
    {
        Type :
        {
            Unknown : -1
        }
    },

    toString : function()
    {
        return "InputEvent{ " + this.basePropertiesToString() + " }";
    },

    clear : function()
    {
        this.clearPosition();
    },

    basePropertiesToString : function()
    {
        return "typeId:" + this.typeId +
            " type:" + this.type +
            " x:" + this.x +
            " y:" + this.y +
            " relativeX:" + this.relativeX +
            " relativeY:" + this.relativeY +
            " relativeZ:" + this.relativeZ +

            " target:" + this.targetNodeName + (this.targetId !== "" ? "#" + this.targetId : "") +
            " originalEvent:" + (this.originalEvent != null ? "valid" :"null");
    },

    /**
        Suppresses the orginal event via preventDefault() and stopPropagation() if applicaple.

        @param {Boolean} [preventDefault=true] If preventDefault() should be invoked.
        @param {Boolean} [stopPropagation=true] If stopPropagation() should be invoked.
        @return {Boolean} True if original event was valid and successfully suppressed default and/or propagation.
    */
    suppress : function(preventDefault, stopPropagation)
    {
        var success = false;

        if (typeof this.originalEvent === "object")
        {
            preventDefault = (typeof preventDefault === "boolean" ? preventDefault : true);
            if (preventDefault)
            {
                if (typeof this._preventDefaultFunction === "function")
                {
                    this._preventDefaultFunction();
                    success = true;

                    /* A custom prevent default has been set. If preventPropagation is not defined
                       default it to false. We will assume this custom prevention handler also
                       takes care of propagation. */
                    if (typeof preventPropagation !== "boolean")
                        preventPropagation = false;
                }
                else if (typeof this.originalEvent.preventDefault === "function")
                {
                    this.originalEvent.preventDefault();
                    success = true;
                }
            }

            preventPropagation = (typeof preventPropagation === "boolean" ? preventPropagation : true);
            if (preventPropagation && typeof this.originalEvent.stopPropagation === "function")
            {
                this.originalEvent.stopPropagation();
                success = true;
            }
        }
        return success;
    },

    /**
        Returns if provided element is the target of this input event.
        You can pass in a DOM Element, jQuery element or a element id/node name string.

        @param {Element|jQuery|jQuery.Element|String} Any number of parameters are accepted, eg. isTarget("div", "h1").
        @return {Boolean}
    */
    isTarget : function()
    {
        var result = false;
        for (var i = 0; i < arguments.length; i++)
        {
            var element = arguments[i];
            if (typeof element === "string")
                result = (element === this.targetId || element === this.targetNodeName);
            else if (element instanceof Element)
                result = (element.id === this.targetId && element.localName === this.targetNodeName);
            else if (typeof element === "object" && typeof element.jquery === "string" && typeof element.get === "function")
            {
                if (element.length > 0)
                    result = this.isTarget(element.get(0));
                else
                    this.log.error("isTarget: Passed an empty jQuery selector:", element.selector);
            }
            else
                this.log.error("isTarget: Invalid element parameter:", element);

            if (result === true)
                return result;
        }
        return result;
    },

    /**
        Sets original event and tries to read target id and node name from it.

        @param {Object} event Original event.
        @return {Boolean} True if id and/or node name was read from the event.
    */
    setOriginalEvent : function(e, type)
    {
        this.originalEvent = e;

        /* Generic target element read. Override this function if
           your event is not read properly with this. */
        if (typeof e.target === "object")
        {
            var hasId = (typeof e.target.id === "string");
            var hasNodeName = (typeof e.target.localName === "string");
            this.targetId = (hasId ? e.target.id : "");
            this.targetNodeName = (hasNodeName ? e.target.localName : "");
            this.target = e.target;
            return (hasId || hasNodeName);
        }
        else
        {
            this.targetNodeName = "";
            this.targetId = "";
            this.target = null;
            return false;
        }
    },

    /**
        Clears absolute and relative position to null. This makes
        automatic relative change tracking work correctly. Needed
        if there are no "contant" feed of events, eg. touch events.
        And eg. mouse should not require this as we always get move
        events.
    */
    clearPosition : function()
    {
        this.setPositionAxis("x", null);
        this.setPositionAxis("y", null);
        this.setPositionAxis("z", null);
    },

    /**
        Clears relative position to be zero. Can be useful
        for reseting 'end' events to not have any movement.
    */
    clearRelativePosition : function()
    {
        this.relativeX = this.relativeY = this.relativeZ = 0;
    },

    /**
        Set x, y, z absolute and update relativeX, relativeY, relativeZ.
        Non 'number' values will result in a null axist and zero relative axis.

        @param {Number|undefined} x
        @param {Number|undefined} y
        @param {Number|undefined} z
    */
    setPosition : function(x, y, z)
    {
        this.setPositionAxis("x", x);
        this.setPositionAxis("y", y);
        this.setPositionAxis("z", z);
    },

    /**
        Set axis absolute and update relative value.
        Non 'number' values will result in a null axist and zero relative axis.

        @param {String} axis Value must be "x", "y" or "z".
        @param {Number|undefined} value
    */
    setPositionAxis: function(axis, value)
    {
        var relativeAxis = "relative" + axis.toUpperCase();
        if (typeof value === "number")
        {
            this[relativeAxis] = (typeof this[axis] === "number" ? value - this[axis] : 0);
            this[axis] = value;
        }
        else
        {
            this[relativeAxis] = 0;
            this[axis] = null;
        }
    }
});

return IInputEvent;

}); // require js
