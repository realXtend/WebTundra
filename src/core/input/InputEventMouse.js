
define([
        "core/framework/Tundra",
        "core/input/IInputEvent"
    ], function(Tundra, IInputEvent)
{

var InputEventMouse = IInputEvent.$extend(
/** @lends InputEventMouse.prototype */
{
    /**
        Input mouse event.

        @todo Currently we are not storing all held buttons. Only one can be true at a time.
        Additionally release event does not inform what button(s) what released

        @constructs
        @extends IInputEvent
    */
    __init__ : function()
    {
        this.$super("InputEventMouse");

        /*
            How much a button press to release event has translated
            the X and Y axis as pixels. Zero if not a button release event.
            @type {Object}
        */
        this.translated  = { x : 0, y : 0 };
        this._pressPos   = { x : 0, y : 0 };
        this.buttons     = {};
        this.prevButtons = {};

        this.clearButtons();

        // Property booleans for backwards compatibility
        Object.defineProperties(this, {
            leftDown : {
                get : function ()      { return this.isButtonDown(InputEventMouse.Button.Left); },
                set : function (value) { this.setButton(InputEventMouse.Button.Left, value); }
            },
            rightDown : {
                get : function ()      { return this.isButtonDown(InputEventMouse.Button.Right); },
                set : function (value) { this.setButton(InputEventMouse.Button.Right, value); }
            },
            middleDown : {
                get : function ()      { return this.isButtonDown(InputEventMouse.Button.Middle); },
                set : function (value) { this.setButton(InputEventMouse.Button.Middle, value); }
            }
        });
    },

    __classvars__ :
    {
        /**
            @static
            @var {Object}
        */
        Type :
        {
            move        : 1,
            press       : 2,
            release     : 3,
            wheel       : 4,
            dblclick    : 5
        },

        /**
            @static
            @var {Object}
        */
        Button :
        {
            NoButton : 0x00000000,
            Left     : 0x00000001,
            Right    : 0x00000002,
            Middle   : 0x00000004,
            X1       : 0x00000008,
            X2       : 0x00000010
        }
    },

    /**
        @return {String}
    */
    toString : function()
    {
        var str = this.name + "{ " + this.basePropertiesToString();
        var pressed = [];
        var names = Object.keys(InputEventMouse.Button);
        for (var i = 0; i < names.length; i++)
        {
            var id = InputEventMouse.Button[names[i]];
            if (this.buttons[id] === true)
                pressed.push(names[i]);
        }
        if (pressed.length > 0)
            str += " buttons:" + pressed.join("|");
        return str + " }";
    },

    setType : function(type)
    {
        this.type = type;
        this.typeId = (typeof InputEventMouse.Type[type] === "number" ? InputEventMouse.Type[type] : IInputEvent.Type.Unknown);
    },

    clearButtons : function()
    {
        var names = Object.keys(InputEventMouse.Button);
        for (var i = 0; i < names.length; i++)
        {
            var id = InputEventMouse.Button[names[i]];
            this.buttons[id] = false;
            this.prevButtons[id] = false;
        }
    },

    /// IInputEvent override
    setOriginalEvent : function(e, type)
    {
        this.$super(e, type); // Call base impl

        if (type === "press")
        {
            this._pressPos.x = e.pageX;
            this._pressPos.y = e.pageY;
        }
        else if (type === "release")
        {
            this.translated.x = e.pageX - this._pressPos.x;
            this.translated.y = e.pageY - this._pressPos.y;
        }
        else
        {
            this.translated.y = this.translated.x = 0;
        }
    },

    readButtonsFromEvent : function(e, type)
    {
         $.extend(this.prevButtons, this.buttons);

        /* Seems that jQuery mouse events does not handle firefox
           correctly for e.which so do it manually.
           Welcome to cross browser web dev. */
        if (Tundra.browser.isFirefox)
            this.setButtons((e.buttons === 1), (e.buttons === 2), (e.buttons === 3));
        else
            this.setButtons((e.which === 1), (e.which === 3), (e.which === 2));
    },

    setButtons : function(left, right, middle)
    {
        this.setButton(InputEventMouse.Button.Left, left);
        this.setButton(InputEventMouse.Button.Right, right);
        this.setButton(InputEventMouse.Button.Middle, middle);
    },

    setButton : function(id, down)
    {
        this.buttons[id] = (typeof down === "boolean" ? down : false);
    },

    /**
        @return {Boolean}
    */
    isAnyButtonDown : function()
    {
        return (this.buttons[InputEventMouse.Button.Left] || this.buttons[InputEventMouse.Button.Right] || this.buttons[InputEventMouse.Button.Middle] ||
                this.buttons[InputEventMouse.Button.X1]   || this.buttons[InputEventMouse.Button.X2]);
    },

    /**
        @param {Number|String} id
        @return {Boolean}
    */
    wasButtonDown : function(id)
    {
        return this._buttonDown(id, this.prevButtons);
    },

    /**
        @param {Number|String} id
        @return {Boolean}
    */
    wasAnyButtonDown : function()
    {
        return (this.prevButtons[InputEventMouse.Button.Left] || this.prevButtons[InputEventMouse.Button.Right] || this.prevButtons[InputEventMouse.Button.Middle] ||
                this.prevButtons[InputEventMouse.Button.X1]   || this.prevButtons[InputEventMouse.Button.X2]);
    },

    /**
        @param {Number} [x=0] Maximum translation on the x-axis that will still return true.
        @param {Number} [y=0} Maximum translation on the y-axis that will still return true. If x is defined and y is not, x will be applied to y-axis check as well.
        @return {Boolean}
    */
    hasTranslated : function(x, y)
    {
        return (Math.abs(this.translated.x) > (typeof x === "number" ? x : 0) ||
                Math.abs(this.translated.y) > (typeof y === "number" ? y : typeof x === "number" ? x : 0));
    },

    /**
        @param {Number|String} id
        @return {Boolean}
    */
    isButtonDown : function(id)
    {
        return this._buttonDown(id, this.buttons);
    },

    _buttonDown : function(id, buttons)
    {
        if (typeof id === "string")
        {
            var nameLower = id.toLowerCase();
            if (nameLower === "left")
                id = InputEventMouse.Button.Left;
            else if (nameLower === "right")
                id = InputEventMouse.Button.Right;
            else if (nameLower === "middle")
                id = InputEventMouse.Button.Middle;
            else if (nameLower === "x1")
                id = InputEventMouse.Button.X1;
            else if (nameLower === "x2")
                id = InputEventMouse.Button.X2;
            else
            {
                this.log.error("is/wasButtonDown: Invalid identifier '" + id + "'");
                return false;
            }
        }
        var value = buttons[id];
        if (typeof value !== "boolean")
        {
            this.log.error("is/wasButtonDown: Invalid identifier '" + id + "'");
            return false;
        }
        return value;
    }
});

return InputEventMouse;

}); // require js
