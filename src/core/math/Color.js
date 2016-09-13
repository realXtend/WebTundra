
define([
        "lib/classy",
        "lib/three",
        "core/math/MathUtils"
    ], function(Class, THREE, MathUtils) {

var Color = Class.$extend(
/** @lends Color.prototype */
{
    /**
        Color object that holds red, green, blue and alpha values.
        Range for the color components is [0,1], but the range is not enforced currently.

        @constructs
        @param {Number} [r=0] Red.
        @param {Number} [g=0] Green.
        @param {Number} [b=0] Blue.
        @param {Number} [a=1] Alpha.
    */
    __init__ : function(r, g, b, a)
    {
        /**
            Red
            @var {Number}
        */
        this.r = (typeof r == "number" ? r : 0);
        /**
            Green
            @var {Number}
        */
        this.g = (typeof g == "number" ? g : 0);
        /**
            Blue
            @var {Number}
        */
        this.b = (typeof b == "number" ? b : 0);
        /**
            Alpha
            @var {Number}
        */
        this.a = (typeof a == "number" ? a : 1);
    },

    __classvars__ :
    {
        // Convenience shortcuts for common colors.
        /**
            Convenience function for getting red color
            @static
            @memberof Color
            @return {Color}
        */
        red     : function() { return new Color(1, 0, 0, 1); },
        /**
            Convenience function for getting green color
            @static
            @memberof Color
            @return {Color}
        */
        green   : function() { return new Color(0, 1, 0, 1); },
        /**
            Convenience function for getting blue color
            @static
            @memberof Color
            @return {Color}
        */
        blue    : function() { return new Color(0, 0, 1, 1); },
        /**
            Convenience function for getting white color
            @static
            @memberof Color
            @return {Color}
        */
        white   : function() { return new Color(1, 1, 1, 1); },
        /**
            Convenience function for getting black color
            @static
            @memberof Color
            @return {Color}
        */
        black   : function() { return new Color(0, 0, 0, 1); },
        /**
            Convenience function for getting yellow color
            @static
            @memberof Color
            @return {Color}
        */
        yellow  : function() { return new Color(1, 1, 0, 1); },
        /**
            Convenience function for getting cyan color
            @static
            @memberof Color
            @return {Color}
        */
        cyan    : function() { return new Color(0, 1, 1, 1); },
        /**
            Convenience function for getting magenta color
            @static
            @memberof Color
            @return {Color}
        */
        magenta : function() { return new Color(1, 0, 1, 1); },
        /**
            Convenience function for getting gray color
            @static
            @memberof Color
            @return {Color}
        */
        gray    : function() { return new Color(0.5, 0.5, 0.5, 1); },

        /**
            Constructs a color from string. Supports "rgb(x,x,x)" and "#xxxxxx" and Tundra's color string formats.

            @static
            @memberof Color
            @param {String} str
            @return {Color}
        */
        fromString : function(str)
        {
            // @note This will also capture below case of "rgb{a}(255,0,0{,a})"
            // @todo: overly engineered?
            if (MathUtils.RegExpFloats.test(str) && str.indexOf("#") == -1) // Tundra/MGL formats
            {
                var values = str.match(MathUtils.RegExpFloats);
                var color = new Color();
                /* @todo Up-to-date MGL uses now NaN for failure; would like to to change to use that also at some point? */
                if (values.length > 0) color.r = MathUtils.parseFloat(values[0]);
                if (MathUtils.isNaN(color.r)) color.r = 0;
                if (values.length > 1) color.g = MathUtils.parseFloat(values[1]);
                if (MathUtils.isNaN(color.g)) color.g = 0;
                if (values.length > 2) color.b = MathUtils.parseFloat(values[2]);
                if (MathUtils.isNaN(color.b)) color.b = 0;
                if (values.length > 3) // alpha optional
                {
                    color.a = MathUtils.parseFloat(values[3]);
                    if (MathUtils.isNaN(color.a)) color.a = 0;
                }

                // [0,255] to [0,1]
                if (color.r > 1) color.r = Math.min(255, color.r) / 255;
                if (color.g > 1) color.g = Math.min(255, color.g) / 255;
                if (color.b > 1) color.b = Math.min(255, color.b) / 255;
                if (color.a > 1) color.a = Math.min(255, color.b) / 255;

                return color;
            }
            else if (/^rgb\((\d+), ?(\d+), ?(\d+)\)$/i.test(str)) // rgb(255,0,0)
            {
                var numbers = /^rgb\((\d+), ?(\d+), ?(\d+)\)$/i.exec(str);
                var r = parseInt(numbers[1]);
                var g = parseInt(numbers[2]);
                var b = parseInt(numbers[3]);

                // [0,255] to [0,1]
                if (r > 1.0) r = Math.min(255, r) / 255;
                if (g > 1.0) g = Math.min(255, g) / 255;
                if (b > 1.0) b = Math.min(255, b) / 255;
                return new Color(r, g, b);
            }
            else if ( /^\#([0-9a-f]{6})$/i.test(str)) // #ff0000
            {
                var parts = /^\#([0-9a-f]{6})$/i.exec(str);
                return Color.fromRgb(parseInt(parts[1], 16));
            }
            else
                console.error("[Color]: fromString() string format not supported:", str);
            return null;
        },

        /**
            Constructs a color from RGB uint/hex number value.

            @static
            @memberof Color
            @param {Number} uint number value
            @return {Color}
        */
        fromRgb : function(hex)
        {
            hex = Math.floor(hex);
            var r = ( hex >> 16 & 255 ) / 255;
            var g = ( hex >> 8 & 255 ) / 255;
            var b = ( hex & 255 ) / 255;
            return new Color(r, g, b);
        },

        /**
            Constructs a color from RGB hex number value.

            @static
            @memberof Color
            @param {Number} hex number value
            @return {Color}
        */
        fromHex : function(hex) { return Color.fromRgb(hex); },

        /**
            Constructs a color from RGBA uint/hex number value.

            @static
            @memberof Color
            @param {Number} uint number value
            @return {Color}
        */
        fromRgba : function(hex)
        {
            hex = Math.floor(hex);
            var r = ( hex >> 24 & 255 ) / 255;
            var g = ( hex >> 16 & 255 ) / 255;
            var b = ( hex >> 8 & 255 ) / 255;
            var a = ( hex & 255 ) / 255;
            return new Color(r, g, b, a);
        },

        /** Linearly interpolates between color a and color b.

            @static
            @memberof Color
            @param {Color} a
            @param {Color} b
            @return {Color} Color a as interpolated. */
        lerp : function(a, b, t)
        {
            return a.lerp(b, t);
        }
    },

    /**
        Returns a clone of this color.

        @return {Color}
    */
    clone : function()
    {
        return new Color(this.r, this.g, this.b, this.a);
    },

    /**
        Sets each of the color component individually.
        @param {Number} [r]
        @param {Number} [g]
        @param {Number} [b]
        @param {Number} [a]
    */
    set : function(r, g, b, a)
    {
        this.r = (typeof r == "number" ? r : this.r);
        this.g = (typeof g == "number" ? g : this.g);
        this.b = (typeof b == "number" ? b : this.b);
        this.a = (typeof a == "number" ? a : this.a);
    },
    setRGBA : function(r, g, b, a) { this.set(r, g, b, a); },

    /**
        Copies values from other color to this.

        @param {Number} color Another color.
        @return {!this}
    */
    copy : function(color)
    {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
        return this;
    },

    /**
        Returns this color as THREE.Color. Note: Three.Color does not have the alpha color component.

        @return {THREE.Color}
    */
    toThreeColor : function()
    {
        var threeColor = new THREE.Color();
        threeColor.setRGB(this.r, this.g, this.b);
        return threeColor;
    },

    /**
        Returns this color as THREE.Vector4.

        @return {THREE.Vector4}
    */
    toVector4 : function()
    {
        return new THREE.Vector4(this.r, this.g, this.b, this.a);
    },

    /**
        Returns color RGBA packed as a number, with A component in the lowest 8 bits.

        @return {Number}
        @todo Would toUInt(), toNumber(), or toNumberRgb() be better name?
    */
    toRgba : function()
    {
        var ret = this.toRgb();
        var a = MathUtils.clamp(Math.floor(this.a * 255), 0, 255);
        return (ret << 8) ^ a;
    },

    /**
        Returns color RGB of packed as a number, with B component in the lowest 8 bits.
        If asObject is true, returns RGBA object with value range of 0-255.

        @param {Boolean} asObject If true returns a Object with r,g,b,a keys instead of a single Number.
        @return {Number|Object}
        @todo Would toUInt(), toNumber(), or toNumberRgb() be better name?
    */
    toRgb: function(asObject)
    {
        var r = MathUtils.clamp(Math.floor(this.r * 255), 0, 255);
        var g = MathUtils.clamp(Math.floor(this.g * 255), 0, 255);
        var b = MathUtils.clamp(Math.floor(this.b * 255), 0, 255);
        var a = MathUtils.clamp(Math.floor(this.a * 255), 0, 255);
        if (asObject !== true)
            return (r << 16) ^ (g << 8) ^ b;
        return { r : r, g : g, b : b, a : a };
    },

    /**
        Returns color hex value

        @return {Number}
    */
    toHex : function() { return this.toRgb(); },

    /**
        Return string hex value as two-digit hex for each color #RRGGBB

        @return {String}
    */
    toHexString : function()
    {
        var rgb = this.toRgb(true);
        rgb.r = rgb.r.toString(16);
        rgb.g = rgb.g.toString(16);
        rgb.b = rgb.b.toString(16);

        var rgbKeys = Object.keys(rgb);
        for (var i = 0; i < rgbKeys.length; ++i)
        {
            var key = rgbKeys[i];
            if (rgb[key].length === 1)
                rgb[key] = "0" + rgb[key];
        }

        return "#" + rgb.r + rgb.g + rgb.b;
    },

    /**
        Returns this Color as a string for logging purposes.

        @param {Boolean} [rgba=false] If true 0-255 range is used instead of float 0-1.
        @return {String} The Color as a string.
    */
    toString: function(rgba)
    {
        if (rgba === true)
        {
            var r = MathUtils.clamp(Math.floor(this.r * 255), 0, 255);
            var g = MathUtils.clamp(Math.floor(this.g * 255), 0, 255);
            var b = MathUtils.clamp(Math.floor(this.b * 255), 0, 255);
            var a = MathUtils.clamp(Math.floor(this.a * 255), 0, 255);
            return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
        }
        return "rgba(" + this.r + ", " + this.g + ", " + this.b + ", " + this.a + ")";
    },

    /**
        @return {String} "r g b a"
    */
    serializetoString : function()
    {
        return this.r + " " + this.g + " " + this.b + " " + this.a;
    },

    /**
        Does this color equal another color with the given epsilon (optional).
        @param {Color} other
        @param {Number} [epsilon]
        @return {Boolean}
    */
    equals : function(other, epsilon)
    {
        return MathUtils.equal(this.r, other.r, epsilon) && MathUtils.equal(this.g, other.g, epsilon) &&
            MathUtils.equal(this.b, other.b, epsilon) && MathUtils.equal(this.a, other.a, epsilon);
    },

    /** @todo Add toHexString functions (at least RGB, maybe RGBA too). */

    /**
        Adds another color to this.

        @param {Number} color Another color.
        @return {!this}
    */
    add : function(color)
    {
        this.r += color.r;
        this.g += color.g;
        this.b += color.b;
        this.a += color.a;
        return this;
    },

    /**
        Adds scalar to components of this color.

        @param {Number} s Scalar.
        @return {!this}
    */
    addScalar : function(s)
    {
        this.r += s;
        this.g += s;
        this.b += s;
        this.a += s;
        return this;
    },

    /**
        Multiplies this color by another color.

        @param {Number} color Another color.
        @return {!this}
    */
    multiply : function(color)
    {
        this.r *= color.r;
        this.g *= color.g;
        this.b *= color.b;
        this.a *= color.a;
        return this;
    },

    /**
        Multiplies components of this color by a scalar.

        @param {Number} s Scalar.
        @return {!this}
    */
    multiplyScalar : function (s)
    {
        this.r *= s;
        this.g *= s;
        this.b *= s;
        this.a *= s;
        return this;
    },

    /**
        Linearly interpolates this color towards color b.

        @param {Color} b Destination color.
        @param {Number} t Time in range [0, 1].
        @return {!this}
    */
    lerp : function(b, t)
    {
        this.r = MathUtils.lerp(this.r, b.r, t);
        this.g = MathUtils.lerp(this.g, b.g, t);
        this.b = MathUtils.lerp(this.b, b.b, t);
        this.a = MathUtils.lerp(this.a, b.a, t);
        return this;
    },

    /**
        Clamps components of this color to range [floor, ceil].

        @param {Color} b
        @return {!this}
    */
    clamp : function(floor, ceil)
    {
        this.r = MathUtils.clamp(this.r, floor, ceil);
        this.g = MathUtils.clamp(this.g, floor, ceil);
        this.b = MathUtils.clamp(this.b, floor, ceil);
        this.a = MathUtils.clamp(this.a, floor, ceil);
        return this;
    },

    /**
        Clamps components of this color to valid range [0, 1].

        @return {!this}
    */
    clamp01 : function()
    {
        return this.clamp(0, 1);
    },

    /**
        Sets value from string.

        @param {String} The Transform as a string.
        @return {Boolean}
    */
    fromString : function(str)
    {
        // rgb{a}(x,x,x) #xxxxxx
        if (str.indexOf("#") !== -1 || str.indexOf("(") !== -1)
        {
            var color = Color.fromString(str);
            if (color)
            {
                this.copy(color);
                return true;
            }
            return false;
        }
        // Raw string with separators
        var parts = MathUtils.splitToFloats(str);
        var ok = (parts.length >= 3);
        if (ok)
        {
            this.set(MathUtils.parseFloat(parts[0]), MathUtils.parseFloat(parts[1]), MathUtils.parseFloat(parts[2]));
            if (parts.length >= 4)
                this.a = MathUtils.parseFloat(parts[3]);

            if (this.r > 1) this.r = Math.min(255, this.r) / 255;
            if (this.g > 1) this.g = Math.min(255, this.g) / 255;
            if (this.b > 1) this.b = Math.min(255, this.b) / 255;
            if (this.a > 1) this.a = Math.min(255, this.b) / 255;
        }
        return ok;
    },
});

return Color;

}); // require js
