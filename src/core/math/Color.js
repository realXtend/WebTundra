
define([
        "lib/classy",
        "lib/three"
    ], function(Class, THREE) {

/**
    Color object that holds red, green, blue and alpha values.
    Range for the color components is [0,1].

    @class Color
    @constructor
    @param {Number} [r=0] Red.
    @param {Number} [g=0] Green.
    @param {Number} [b=0] Blue.
    @param {Number} [a=0] Alpha.
*/
var Color = Class.$extend(
{
    __init__ : function(r, g, b, a)
    {
        /**
            Red
            @property r
            @type Number
        */
        this.r = r || 0;
        /**
            Green
            @property g
            @type Number
        */
        this.g = g || 0;
        /**
            Blue
            @property b
            @type Number
        */
        this.b = b || 0;
        /**
            Alpha
            @property a
            @type Number
        */
        this.a = a || 0;
    },

    __classvars__ :
    {
        /**
            Constructs a color from string. Supports rgb(x,x,x) and #xxxxxx.
            @static
            @method fromString
            @param {String} str
            @return {Color}
        */
        fromString : function(str)
        {
            // rgb(255,0,0)
            if (/^rgb\((\d+), ?(\d+), ?(\d+)\)$/i.test(str))
            {
                var parts = /^rgb\((\d+), ?(\d+), ?(\d+)\)$/i.exec(str);
                var r = parseInt(parts[1]);
                var g = parseInt(parts[2]);
                var b = parseInt(parts[3]);

                // [0,255] to [0,1]
                if (r > 1.0) r =  Math.min(255, r) / 255;
                if (g > 1.0) g =  Math.min(255, g) / 255;
                if (b > 1.0) b =  Math.min(255, b) / 255;
                return new Color(r, g, b);
            }
            // #ff0000
            else if ( /^\#([0-9a-f]{6})$/i.test(str))
            {
                var parts = /^\#([0-9a-f]{6})$/i.exec(str);
                return Color.fromHex(parseInt(parts[1], 16));
            }
            else
                console.error("[Color]: fromString() string format not supported:", str);
            return null;
        },

        /**
            Constructs a color from hex value.
            @static
            @method fromHex
            @param {Number} hex
            @return {Color}
        */
        fromHex : function(hex)
        {
            hex = Math.floor(hex);
            var r = ( hex >> 16 & 255 ) / 255;
            var g = ( hex >> 8 & 255 ) / 255;
            var b = ( hex & 255 ) / 255;
            return new Color(r, g, b);
        }
    },

    /**
        Returns a clone of this color.
        @method clone
        @return {Color}
    */
    clone : function()
    {
        return new Color(this.r, this.g, this.b, this.a);
    },

    setRGBA : function(_r, _g, _b, _a)
    {
        this.r = _r || this.r;
        this.g = _g || this.g;
        this.b = _b || this.b;
        this.a = _a || this.a;
    },

    /**
        Returns this color as THREE.Color. Note: Three.Color does not have the alpha color component.
        @method toThreeColor
        @return {THREE.Color}
    */
    toThreeColor : function()
    {
        var threeColor = new THREE.Color();
        threeColor.setRGB(this.r, this.g, this.b);
        return threeColor;
    },

    toHex : function()
    {

    },

    /**
        Returns this Color as a string for logging purpouses.
        @method toString
        @return {String} The Color as a string.
    */
    toString: function()
    {
        return "rgba(" + this.r + ", " + this.g + ", " + this.b + ", " + this.a + ")";
    }
});

return Color;

}); // require js
