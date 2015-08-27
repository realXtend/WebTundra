
define([
        "lib/classy",
        "lib/three",
        "core/framework/Tundra"
    ], function(Class, THREE, Tundra) {

var MathUtils = Class.$extend(
/** @lends MathUtils.prototype */
{
    /**
        Math utilities
        @constructs
    */
    __init__: function()
    {
        // Immutable properties
        Object.defineProperties(this,
        {
            Zero : {
                enumerable : false,
                writable   : false,
                value      : 0
            },
            One : {
                enumerable : false,
                writable   : false,
                value      : 1
            },
            DefaultEpsilon : {
                enumerable : false,
                writable   : false,
                value      : 1e-6
            },
            TypeOfNumber : {
                enumerable : false,
                writable   : false,
                value      : (typeof 0)
            },
            SubComponents : {
                enumerable : false,
                writable   : false,
                value      : [ "x", "y", "z", "w" ]
            },
            RegExpFloats : {
                enumerable : false,
                writable   : false,
                value      : /[+\-]?((?:[1-9]\d*|0)(?:\.\d*)?|\.\d+)([eE][+-]?\d+)?/g
            }
        });
    },

    // Number / Global utility selection //////////////////////////////////////

    /* Number.x variations are not supported by IE and Safari.
       Fallback to global window object versions (not as robust)
       and to polyfills if not available in window.

       Read more about the advantages of using Number instead of globals:
       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number */

    /** @function
        @return {Boolean} */
    isNaN     : (Number.isNaN       || window.isNaN),
    /** @function
        @return {Boolean} */
    isFinite  : (Number.isFinite    || window.isFinite),
    /** @function
        @return {Boolean} */
    isInteger : (Number.isInteger   || function(val) {
        return (this.isNumber(nVal) &&
              this.isFinite(val) &&
              val > -9007199254740992 &&
              val <  9007199254740992 &&
              Math.floor(val) === val);
    }),
    /** @function
        @return {Number} */
    parseFloat : (Number.parseFloat || window.parseFloat),
    /** @function
        @return {Number} */
    parseInt   : (Number.parseInt   || window.parseInt),

    /**
        @param {Number} val
        @return {Boolean}
    */
    isNumber : function(val)
    {
        return (typeof val === this.TypeOfNumber && !this.isNaN(val));
    },

    /**
        Returns if value is power of two. All floating point numbers will return false.

        @param {Number} val
        @return {Boolean}
    */
    isPow2 : function(val)
    {
        return (val & val-1) === 0;
    },

    // Interpolation //////////////////////////////////////////////////////////

    /**
        Linear interpolation of a towards b at time t.

        @param {Number} a The first endpoint to lerp between.
        @param {Number} b The second endpoint to lerp between.
        @param {Number} t A value between [0,1].
        @return {Number}
    */
    lerp : function(a, b, t)
    {
        return (a + t * (b - a));
    },

    // Ranges /////////////////////////////////////////////////////////////////

    /** Clamps the given input value to range [floor, ceil].

        @param {Number} val Value to clamp
        @param {Number} floor
        @param {Number} ceil
        @return {Number}
    */
    clamp : function(val, floor, ceil)
    {
        if (this.isNaN(val))
            return floor;
        return (val <= ceil ? (val >= floor ? val : floor) : ceil);
    },

    /** Clamps the given input value to range [0, 1].

        @param {Number} val Value to clamp
        @return {Number}
    */
    clamp01 : function(val, floor, ceil)
    {
        return this.clamp(val, 0, 1);
    },

    /** Clamps the given vector to range [floor, ceil] on all axises.
        @note THREE.Vector3.clamp/clampScalar exist but they operate on vectors.

        @param {THREE.Vector3} val Vector to clamp
        @param {Number} floor
        @param {Number} ceil
        @return {THREE.Vector3} Function modifies the given vector and returns it.
        Use THREE.Vector3.clone if you don't want the original to be modified.
    */
    clampVector3 : function(val, floor, ceil)
    {
        return val.set(
            this.clamp(val.x, floor, ceil),
            this.clamp(val.y, floor, ceil),
            this.clamp(val.z, floor, ceil)
        );
    },

    /** Returns random number [-1, 1]

        @return {Number}
    */
    symmetricRandom : function()
    {
        return 2 * Math.random() - 1;
    },

    // Equality ///////////////////////////////////////////////////////////////

    /**
        @param {Number} a
        @param {Number} b
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    equal : function(a, b, epsilon)
    {
        if (this.isNaN(a) || this.isNaN(b))
            return false;
        /* @note This function could be made generic
           with typeof and instanceof checks. But specialized
           versions are there for vector/quat because they can
           be used in tight loops, where typeof checks would slow
           them down and might not let the best JIT optimizations to hit. */
        return (Math.abs(a-b) <= (epsilon || this.DefaultEpsilon));
    },

    /**
        @param {THREE.Vector2} a
        @param {THREE.Vector2} b
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    equalVector2 : function(v1, v2, epsilon)
    {
        return (this.equal(v1.x, v2.x, epsilon) &&
                this.equal(v1.y, v2.y, epsilon));
    },

    /**
        @param {THREE.Vector3} a
        @param {THREE.Vector3} b
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    equalVector3 : function(v1, v2, epsilon)
    {
        return (this.equal(v1.x, v2.x, epsilon) &&
                this.equal(v1.y, v2.y, epsilon) &&
                this.equal(v1.z, v2.z, epsilon));
    },

    /**
        @param {THREE.Vector4} a
        @param {THREE.Vector4} b
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    equalVector4 : function(v1, v2, epsilon)
    {
        return (this.equalVector3(v1, v2, epsilon) &&
                this.equal(v1.w, v2.w, epsilon));
    },

    /**
        @param {THREE.Quaternion} a
        @param {THREE.Quaternion} b
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    equalQuaternion : function(q1, q2, epsilon)
    {
        return this.equalVector4(q1, q2, epsilon);
    },

    //  Zero equality /////////////////////////////////////////////////////////

    /**
        @param {Number} val Value to check.
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    isZero : function(val, epsilon)
    {
        return this.equal(val, this.Zero, epsilon);
    },

    /**
        @param {THREE.Vector2} v Vector to check.
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    isZeroVector2 : function(v, epsilon)
    {
        return (this.isZero(v.x, epsilon) &&
                this.isZero(v.y, epsilon));
    },

    /**
        @param {THREE.Vector3} v Vector to check.
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    isZeroVector3 : function(v, epsilon)
    {
        return (this.isZero(v.x, epsilon) &&
                this.isZero(v.y, epsilon) &&
                this.isZero(v.z, epsilon));
    },

    /**
        @param {THREE.Vector4} v Vector to check.
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    isZeroVector4 : function(v, epsilon)
    {
        return (this.isZeroVector3(v, epsilon) &&
                this.isZero(v.w, epsilon));
    },

    /**
        Note that zero Quaternion is defined as x=0 y=0 z=0 w=1.

        @param {THREE.Quaternion} q Quaternion to check.
        @param {Number} [epsilon=1e-6]
        @return {Boolean}
    */
    isZeroQuaternion : function(q, epsilon)
    {
        return (this.isZeroVector3(q, epsilon) &&
                this.equal(q.w, this.One, epsilon));
    },

    // Finite checks //////////////////////////////////////////////////////////

    /**
        @param {THREE.Vector2} v Vector to check.
        @return {Boolean}
    */
    isFiniteVector2 : function(v)
    {
        return (this.isFinite(v.x) &&
                this.isFinite(v.y));
    },

    /**
        @param {THREE.Vector3} v Vector to check.
        @return {Boolean}
    */
    isFiniteVector3 : function(v)
    {
        return (this.isFinite(v.x) &&
                this.isFinite(v.y) &&
                this.isFinite(v.z));
    },

    /**
        @param {THREE.Vector4} v Vector to check.
        @return {Boolean}
    */
    isFiniteVector4 : function(v)
    {
        return (this.isFiniteVector3(v) &&
                this.isFinite(v.w));
    },

    /**
        @param {THREE.Quaternion} v Quaternion to check.
        @return {Boolean}
    */
    isFiniteQuaternion : function(q)
    {
        return this.isFiniteVector4(q);
    },

    /**
        @param {THREE.Box3} v Box to check.
        @return {Boolean}
    */
    isFiniteBox3 : function(box)
    {
        return (this.isFiniteVector3(box.min) && this.isFiniteVector3(box.max));
    },

    // Radians and degrees ////////////////////////////////////////////////////

    /**
        @param {Number} val Radians
        @return {Number} Degrees
    */
    radToDeg : function(val)
    {
        return THREE.Math.radToDeg(val);
    },

    /**
        @param {Number} val Degrees
        @return {Number} Radians
    */
    degToRad : function(val)
    {
        return THREE.Math.degToRad(val);
    },

    /**
        @param {String} v Source vector
        @return {THREE.Vector3}
    */
    radToDegVector3 : function(v)
    {
        return (new THREE.Vector3(this.radToDeg(v.x), this.radToDeg(v.y), this.radToDeg(v.z)));
    },

    /**
        @param {String} v Source vector
        @return {THREE.Vector3}
    */
    degToRadVector3 : function(v)
    {
        return (new THREE.Vector3(this.degToRad(v.x), this.degToRad(v.y), this.degToRad(v.z)));
    },

    /**
        Parses floats from a string to any object that has x, y, z and w properties.
        All of the properties are optional, meaning is suitable for Vector2, Vector3, Vector4 and Quaternion.
        On failure of parsing a sub component its value will be set to zero.
        Note that all the sub components are set even if they are undefined in dest object.

        @param {String} str String to parse.
        @param {Object} dest
    */
    parseFloatsTo : function(str, dest)
    {
        if (typeof str !== "string" || dest === undefined || dest === null || typeof dest !== "object")
            return;

        // Regex from http://stackoverflow.com/questions/17885850/how-to-parse-a-string-containing-text-for-a-number-float-in-javascript
        var values = str.match(this.RegExpFloats);
        if (!values)
            return;
        for(var i=0; i<4; ++i)
        {
            if (values.length <= i)
                break;
            var val = this.parseFloat(values[i]);
            /// @todo Up-to-date MGL uses now NaN for failure; would like to to change to use that also at some point?
            if (this.isNaN(val)) val = 0;
            // dest[x|y|z|w]
            dest[this.SubComponents[i]] = val;
        }
    },

    /**
        Rounds a float to number of given decimals.

        @param {number} number Number to be rounded.
        @param {decimals} Number of decimals.
    */
    round : function(number, decimals)
    {
        return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },

    /**
        Rounds a Vector2 to number of given decimals.

        @param {vector} vector Vector2 to be rounded.
        @param {decimals} Number of decimals.
    */
    roundVector2 : function(vector, decimals)
    {
        return new THREE.Vector2(this.round(vector.x, decimals), this.round(vector.y, decimals));
    },

    /**
        Rounds a Vector3 to number of given decimals.

        @param {vector} vector Vector3 to be rounded.
        @param {decimals} Number of decimals.
    */
    roundVector3 : function(vector, decimals)
    {
        return new THREE.Vector3(this.round(vector.x, decimals), this.round(vector.y, decimals), this.round(vector.z, decimals));
    },

    /**
        Rounds a Vector4 to number of given decimals.

        @param {vector} vector Vector4 to be rounded.
        @param {decimals} Number of decimals.
    */
    roundVector4 : function(vector, decimals)
    {
        return new THREE.Vector4(this.round(vector.x, decimals), this.round(vector.y, decimals), this.round(vector.z, decimals), this.round(vector.w, decimals));
    },

    /**
        Split and convert a string to a floats (parseFloat).

        @param {String} str
        @param {String} [separator] If not defined common separators are auto detected.
        @return {Array.<Number>}
    */
    splitToFloats : function(str, sep)
    {
        if (typeof sep !== "string" || sep === "")
        {
            if (str.indexOf(",") !== -1)
                sep = ",";
            else if (str.indexOf(";") !== -1)
                sep = ";";
            else if (str.indexOf(" ") !== -1)
                sep = " ";
            sep = (str.indexOf(",") !== -1 ? "," : (str.indexOf(" ") ? " " : undefined));
        }
        if (typeof sep !== "string" || sep === "")
        {
            console.warn("MathUtils.splitToFloats: Failed to find common separator from '" + str + "'");
            return [];
        }
        if (typeof str !== "string" || str === "")
        {
            console.warn("MathUtils.splitToFloats: Invalid input string '" + str + "'");
            return [];
        }
        var parts = str.split(sep);
        for (var i = 0; i < parts.length; i++)
        {
            var num = this.parseFloat(parts[i])
            if (!this.isNumber(num))
            {
                // Still assign NaN to let calling code decide what to do
                console.warn("MathUtils.splitToFloats: Failed to parse float from '" + parts[i] + "', assigning NaN to index", i);
                parts[i] = NaN;
            }
            else
                parts[i] = num;
        }
        return parts;
    },

    /**
        Split and convert a string to a integers (parseInt).

        @param {String} str
        @param {String} [separator] If not defined common separators are auto detected.
        @return {Array.<Number>}
    */
    splitToIntegers : function(str, sep)
    {
        if (typeof sep !== "string" || sep === "")
        {
            if (str.indexOf(",") !== -1)
                sep = ",";
            else if (str.indexOf(";") !== -1)
                sep = ";";
            else if (str.indexOf(" ") !== -1)
                sep = " ";
            sep = (str.indexOf(",") !== -1 ? "," : (str.indexOf(" ") ? " " : undefined));
        }
        if (typeof sep !== "string" || sep === "")
        {
            console.warn("MathUtils.splitToIntegers: Failed to find common separator from '" + str + "'");
            return [];
        }
        if (typeof str !== "string" || str === "")
        {
            console.warn("MathUtils.splitToIntegers: Invalid input string '" + str + "'");
            return [];
        }
        var parts = str.split(sep);
        for (var i = 0; i < parts.length; i++)
        {
            var num = this.parseInt(parts[i])
            if (!this.isNumber(num))
            {
                // Still assign NaN to let calling code decide what to do
                console.warn("MathUtils.splitToIntegers: Failed to parse int from '" + parts[i] + "', assigning NaN to index", i);
                parts[i] = NaN;
            }
            else
                parts[i] = num;
        }
        return parts;
    }
});

// Extend three.js classes

// @note equals is already implemented in three.js but it does not support epsilon. Replace with out implementation
(function(threeMathUtilsInstance)
{
    THREE.Vector2.prototype.equals          = function(b, epsilon) { return threeMathUtilsInstance.equalVector2(this, b, epsilon); };
    THREE.Vector3.prototype.equals          = function(b, epsilon) { return threeMathUtilsInstance.equalVector3(this, b, epsilon); };
    THREE.Vector4.prototype.equals          = function(b, epsilon) { return threeMathUtilsInstance.equalVector4(this, b, epsilon); };
    THREE.Quaternion.prototype.equals       = function(b, epsilon) { return threeMathUtilsInstance.equalQuaternion(this, b, epsilon); };

    THREE.Vector2.prototype.isZero          = function(epsilon) { return threeMathUtilsInstance.isZeroVector2(this, epsilon); };
    THREE.Vector3.prototype.isZero          = function(epsilon) { return threeMathUtilsInstance.isZeroVector3(this, epsilon); };
    THREE.Vector4.prototype.isZero          = function(epsilon) { return threeMathUtilsInstance.isZeroVector4(this, epsilon); };
    THREE.Quaternion.prototype.isZero       = function(epsilon) { return threeMathUtilsInstance.isZeroQuaternion(this, epsilon); };

    THREE.Vector2.prototype.isFinite        = function()        { return threeMathUtilsInstance.isFiniteVector2(this); };
    THREE.Vector3.prototype.isFinite        = function()        { return threeMathUtilsInstance.isFiniteVector3(this); };
    THREE.Vector4.prototype.isFinite        = function()        { return threeMathUtilsInstance.isFiniteVector4(this); };
    THREE.Quaternion.prototype.isFinite     = function()        { return threeMathUtilsInstance.isFiniteQuaternion(this); };
    THREE.Box3.prototype.isFinite           = function()        { return threeMathUtilsInstance.isFiniteBox3(this); };

    THREE.Box3.prototype.isDegenerate       = function()        { return (this.min.x > this.max.x || this.min.y > this.max.y || this.min.z > this.max.z); };

    THREE.Vector2.fromString                = function(str)     { var v = new THREE.Vector2();    threeMathUtilsInstance.parseFloatsTo(str, v); return v; };
    THREE.Vector3.fromString                = function(str)     { var v = new THREE.Vector3();    threeMathUtilsInstance.parseFloatsTo(str, v); return v; };
    THREE.Vector4.fromString                = function(str)     { var v = new THREE.Vector4();    threeMathUtilsInstance.parseFloatsTo(str, v); return v; };
    THREE.Quaternion.fromString             = function(str)     { var q = new THREE.Quaternion(); threeMathUtilsInstance.parseFloatsTo(str, q); return q; };

    THREE.Vector2.prototype.setFromString      = function(str)  { threeMathUtilsInstance.parseFloatsTo(str, this); };
    THREE.Vector3.prototype.setFromString      = function(str)  { threeMathUtilsInstance.parseFloatsTo(str, this); };
    THREE.Vector4.prototype.setFromString      = function(str)  { threeMathUtilsInstance.parseFloatsTo(str, this); };
    THREE.Quaternion.prototype.setFromString   = function(str)  { threeMathUtilsInstance.parseFloatsTo(str, this); };

    THREE.Box2.prototype.toString           = function()        { return "(min: " + this.min + " max: " + this.max + ")"; };
    THREE.Box3.prototype.toString           = function()        { return "(min: " + this.min + " max: " + this.max + ")"; };
    THREE.Color.prototype.toString          = function()        { return "(" + this.r + ", " + this.g + ", " + this.b + ")"; };
    THREE.Euler.prototype.toString          = function()        { return "(" + this.x + ", " + this.y + ", " + this.z + " " + this.order + ")"; };
    THREE.Vector2.prototype.toString        = function()        { return "(" + this.x + ", " + this.y + ")"; };
    THREE.Vector3.prototype.toString        = function()        { return "(" + this.x + ", " + this.y + ", " + this.z + ")"; };
    THREE.Vector4.prototype.toString        = function()        { return "(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")"; };
    THREE.Quaternion.prototype.toString     = function()        { return "(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")"; };
    THREE.Matrix3.prototype.toString        = function()        { var m = this.elements;
                                                                  return "(" + m[0] + ", " + m[3] + ", " + m[6] + ") " +
                                                                         "(" + m[1] + ", " + m[4] + ", " + m[7] + ") " +
                                                                         "(" + m[2] + ", " + m[5] + ", " + m[8] + ")"; };
    THREE.Matrix4.prototype.toString        = function()        { var m = this.elements;
                                                                  return "(" + m[0] + ", " + m[4] + ", " + m[8 ] + ", " + m[12] + ") " +
                                                                         "(" + m[1] + ", " + m[5] + ", " + m[9 ] + ", " + m[13] + ") " +
                                                                         "(" + m[2] + ", " + m[6] + ", " + m[10] + " ," + m[14] + ") " +
                                                                         "(" + m[3] + ", " + m[7] + ", " + m[11] + " ," + m[15] + ")"; };

    THREE.Plane.prototype.toString          = function()        { return "Plane(Normal:(" + this.normal.x + ", " + this.normal.y + ", " + this.normal.z + ") d:" + this.constant + ")"; };

    /* @todo
    THREE.Frustum.prototype.toString        = function()        { "Frustum(%s pos:(%.2f, %.2f, %.2f) front:(%.2f, %.2f, %.2f), up:(%.2f, %.2f, %.2f), near: %.2f, far: %.2f, %s: %.2f, %s: %.2f)" };
    THREE.Ray.prototype.toString            = function()        { "Ray(pos:(%.2f, %.2f, %.2f) dir:(%.2f, %.2f, %.2f))" };
    THREE.Sphere.prototype.toString         = function()        { "Sphere(pos:(%.2f, %.2f, %.2f) r:%.2f)" };
    THREE.Triangle.prototype.toString       = function()        { "Triangle(a:(%.2f, %.2f, %.2f) b:(%.2f, %.2f, %.2f) c:(%.2f, %.2f, %.2f))" };
    */
})(new MathUtils());

Tundra.Classes.MathUtils = MathUtils;

window.MathUtils = new MathUtils();
return window.MathUtils;

}); // require js
