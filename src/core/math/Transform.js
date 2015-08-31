
define([
        "lib/classy",
        "lib/three",
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        "core/math/MathUtils"
    ], function(Class, THREE, Tundra, TundraLogging, CoreStringUtils, MathUtils) {

var Transform = Class.$extend(
/** @lends Transform.prototype */
{
    /**
        Transform object that contains position, rotation and scale.

        @constructs
        @param {THREE.Vector3} [pos=THREE.Vector3(0,0,0)] Position.
        @param {THREE.Vector3} [rot=THREE.Vector3(0,0,0)] Rotation in degrees.
        @param {THREE.Vector3} [scale=THREE.Vector3(1,1,1)] Scale.
    */
    __init__ : function(pos, rot, scale)
    {
        if (pos !== undefined && !(pos instanceof THREE.Vector3))
            TundraLogging.getLogger("Transform").warn("Constructor 'pos' parameter is not a THREE.Vector3", pos);
        if (rot !== undefined && !(rot instanceof THREE.Vector3))
            TundraLogging.getLogger("Transform").warn("Constructor 'rot' parameter is not a THREE.Vector3", rot);
        if (scale !== undefined && !(scale instanceof THREE.Vector3))
            TundraLogging.getLogger("Transform").warn("Constructor 'scale' parameter is not a THREE.Vector3", scale);

        // "Private" internal data. Actual access from 'pos', 'rot' and 'scale'.
        this._pos = (pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(0,0,0));
        this._rot = (rot instanceof THREE.Vector3 ? rot : new THREE.Vector3(0,0,0));
        this._scale = (scale instanceof THREE.Vector3 ? scale : new THREE.Vector3(1,1,1));

        // Automatic euler/quaternion updates when our Tundra angle rotation is changed.
        this._rotEuler = new THREE.Euler(THREE.Math.degToRad(this._rot.x),
            THREE.Math.degToRad(this._rot.y), THREE.Math.degToRad(this._rot.z),
            "ZYX" // This is important for Quaternions to be correctly produced from our euler.
        );

        Object.defineProperties(this, {
            /**
                Position
                @var {THREE.Vector3}
                @memberof Transform.prototype
            */
            pos : {
                get : function ()      { return this._pos; },
                set : function (value) { this.setPosition(value); }
            },
            /**
                Specifies the rotation of this transform in <b>degrees</b>, using the Euler XYZ convention.
                @var {THREE.Vector3}
                @memberof Transform.prototype
            */
            rot : {
                get : function ()      { return this._rot; },
                set : function (value) { this.setRotation(value); }
            },
            /**
                Scale
                @var {THREE.Vector3}
                @memberof Transform.prototype
            */
            scale : {
                get : function ()      { return this._scale; },
                set : function (value) { this.setScale(value); }
            }
        });
    },

    /**
        Resets scale to 1,1,1 and pos/rot to 0,0,0.
    */
    reset : function()
    {
        this.setScale(1,1,1);
        this.setPosition(0,0,0);
        this.setRotation(0,0,0);
    },

    /**
        Copy values from another transform
        @param {Transform} transform
    */
    copy : function(transform)
    {
        this._pos.copy(transform._pos);
        this._rot.copy(transform._rot);
        this._scale.copy(transform._scale);
    },

    /**
        Decomposes to a Transform or separate pos, rot and scale.
        @param {Transform|THREE.Vector3} [pos]
        @param {THREE.Vector3} [rot]
        @param {THREE.Vector3} [scale]
    */
    decompose : function(pos, rot, scale)
    {
        if (pos instanceof Transform)
        {
            pos._pos.copy(this._pos);
            pos._rot.copy(this._rot);
            pos._scale.copy(this._scale);
        }
        else
        {
            if (pos instanceof THREE.Vector3)
                pos.copy(this._pos);
            if (rot instanceof THREE.Vector3)
                rot.copy(this._rot);
            if (scale instanceof THREE.Vector3)
                scale.copy(this._scale);
        }
    },

    /**
        Applies this Transforms position, rotation and scale to target
        @param {THREE.Object3D} target
    */
    apply : function(object3D)
    {
        object3D.position.copy(this._pos);
        this.copyOrientationTo(object3D.quaternion);
        object3D.scale.copy(this._scale);

        object3D.updateMatrix();
        object3D.updateMatrixWorld(true);
    },

    /**
        Adjusts this transforms orientation so its looking at the passed in position.
        @param {THREE.Vector3} eye
        @param {THREE.Vector3} target
    */
    lookAt : function(eye, target)
    {
        this.setRotation(this.lookAtQuaternion(eye, target));
    },

    /**
        Returns quaternion to look at the passed in position.
        @param {THREE.Vector3} eye
        @param {THREE.Vector3} target
    */
    lookAtQuaternion : function(eye, target)
    {
        if (this._orientationMatrix === undefined)
            this._orientationMatrix = new THREE.Matrix4();
        this._orientationMatrix.makeTranslation(0,0,0);
        this._orientationMatrix.lookAt(eye, target, Tundra.renderer.axisY);

        return new THREE.Quaternion().setFromRotationMatrix(this._orientationMatrix);
    },

    /**
        Returns orientation of this Transform as a quaternion.
        Creates a new Quaternion object, see copyOrientationTo.
        @param {THREE.Quaternion} [targetQuat] Optional target quaternion. Saves newing up a new quat for each query.
        @return {THREE.Quaternion} Orientation.
    */
    orientation : function(targetQuat)
    {
        this._updateEuler();

        if (targetQuat !== undefined && targetQuat instanceof THREE.Quaternion)
        {
            targetQuat.setFromEuler(this._rotEuler, false);
            return targetQuat;
        }
        else
        {
            var quat = new THREE.Quaternion();
            quat.setFromEuler(this._rotEuler, false);
            return quat;
        }
    },

    quaternion : function()
    {
        return this.orientation();
    },

    /**
        Copies this orientation to destination `THREE.Quaternion`,
        unline `orientation()` this function does not create new objects.
        @param {THREE.Quaternion} Destination
    */
    copyOrientationTo : function(dest)
    {
        this._updateEuler();

        dest.setFromEuler(this._rotEuler, false);
    },

    _updateEuler : function()
    {
        this._rotEuler.set(
            THREE.Math.degToRad(this._rot.x % 360.0),
            THREE.Math.degToRad(this._rot.y % 360.0),
            THREE.Math.degToRad(this._rot.z % 360.0)
        );
    },

    /**
        Returns orientation of this Transform as euler angle.
        @return {THREE.Euler} Orientation.
    */
    euler : function()
    {
        this._updateEuler();
        return this._rotEuler.clone();
    },

    /**
        Set position.
        @param {THREE.Vector3} vector Position vector.
    */
    /**
        Set position.
        @param {Number} x
        @param {Number} y
        @param {Number} z
    */
    setPosition : function(x, y, z)
    {
        if (x instanceof THREE.Vector3)
        {
            this._pos.copy(x);
        }
        else if (typeof x === "number" && typeof y === "number" && typeof z === "number")
        {
            this._pos.x = x;
            this._pos.y = y;
            this._pos.z = z;
        }
        else if (typeof x === "object" && typeof x.x === "number" && typeof x.y === "number" && typeof x.z === "number")
        {
            this._pos.x = x.x;
            this._pos.y = x.y;
            this._pos.z = x.z;
        }
        else
            TundraLogging.getLogger("Transform").error("setPosition must be called with a single Three.Vector3 or x,y,z with type of number.", x, y, z);
    },

    /**
        Set rotation.
        @param {THREE.Vector3} vector Rotation vector in angles.
    */
    /**
        Set rotation.
        @param {THREE.Quaternion} quaternion Rotation quaternion.
    */
    /**
        Set rotation.
        @param {THREE.Euler} euler Rotation in radians.
    */
    /**
        Set rotation.
        @param {Number} x X-axis degrees.
        @param {Number} y Y-axis degrees.
        @param {Number} z Z-axis degrees.
    */
    setRotation : function(x, y, z)
    {
        if (x instanceof THREE.Vector3)
            this._rot.copy(x);
        else if (x instanceof THREE.Quaternion)
        {
            /// @todo Is this now incorrect as this._rotEuler order is "ZYX"?
            this._rotEuler.setFromQuaternion(x.normalize(), undefined, false);
            this._rot.x = THREE.Math.radToDeg(this._rotEuler.x) % 360.0;
            this._rot.y = THREE.Math.radToDeg(this._rotEuler.y) % 360.0;
            this._rot.z = THREE.Math.radToDeg(this._rotEuler.z) % 360.0;
        }
        else if (x instanceof THREE.Euler)
        {
            this._rot.x = THREE.Math.radToDeg(x.x) % 360.0;
            this._rot.y = THREE.Math.radToDeg(x.y) % 360.0;
            this._rot.z = THREE.Math.radToDeg(x.z) % 360.0;
        }
        else if (typeof x === "number" && typeof y === "number" && typeof z === "number")
        {
            this._rot.x = x;
            this._rot.y = y;
            this._rot.z = z;
        }
        else if (typeof x === "object" && typeof x.x === "number" && typeof x.y === "number" && typeof x.z === "number")
        {
            this._rot.x = x.x;
            this._rot.y = x.y;
            this._rot.z = x.z;
        }
        else
            TundraLogging.getLogger("Transform").error("setRotation must be called with a single Three.Vector3, THREE.Quaternion or x,y,z with type of number.", x, y, z);
    },

    setScale : function(x, y, z)
    {
        if (x instanceof THREE.Vector3)
        {
            this._scale.copy(x);
        }
        else if (typeof x === "number" && typeof y === "number" && typeof z === "number")
        {
            this._scale.x = x;
            this._scale.y = y;
            this._scale.z = z;
        }
        else if (typeof x === "object" && typeof x.x === "number" && typeof x.y === "number" && typeof x.z === "number")
        {
            this._scale.x = x.x;
            this._scale.y = x.y;
            this._scale.z = x.z;
        }
        else
            TundraLogging.getLogger("Transform").error("setScale must be called with a single Three.Vector3 or x,y,z with type of number.", x, y, z);
        return false;
    },

    /**
        Returns a clone of this transform.
        @return {Transform} Transform.
    */
    clone : function()
    {
        return new Transform(this.pos.clone(), this.rot.clone(), this.scale.clone());
    },

    /**
        Sets value from string.

        @param {String} The Transform as a string.
        @return {Boolean}
    */
    fromString : function(str)
    {
        var parts = MathUtils.splitToFloats(str);
        if (parts.length >= 3)
            this.setPosition(MathUtils.parseFloat(parts[0]), MathUtils.parseFloat(parts[1]), MathUtils.parseFloat(parts[2]));
        if (parts.length >= 6)
            this.setRotation(MathUtils.parseFloat(parts[3]), MathUtils.parseFloat(parts[4]), MathUtils.parseFloat(parts[5]));
        if (parts.length >= 9)
            this.setScale(MathUtils.parseFloat(parts[6]), MathUtils.parseFloat(parts[7]), MathUtils.parseFloat(parts[8]));
        return (parts.length >= 3);
    },

    /**
        Returns this Transform as a string for logging purposes.
        @return {String} The Transform as a string.
    */
    toString : function(compressed)
    {
        if (compressed === undefined)
            compressed = false;
        var str = this.pos.x +   " " + this.pos.y +   " " + this.pos.z + " | " +
                  this.rot.x +   " " + this.rot.y +   " " + this.rot.z + " | " +
                  this.scale.x + " " + this.scale.y + " " + this.scale.z;
        if (!compressed)
            str = "Transform(" + str + ")";
        return str;
    },

    formatParts : function(decimals)
    {
        if (typeof decimals !== "number")
            decimals = 6;

        var parts = [ this._pos.x.toFixed(decimals), this._pos.y.toFixed(decimals), this._pos.z.toFixed(decimals),
                      this._rot.x.toFixed(decimals), this._rot.y.toFixed(decimals), this._rot.z.toFixed(decimals),
                      this._scale.x.toFixed(decimals), this._scale.y.toFixed(decimals), this._scale.z.toFixed(decimals) ];

        // Trim x.00000 zeros from right side
        for (var i = 0; i < parts.length; i++)
        {
            var part = parts[i];
            part = CoreStringUtils.trimStringRight(part, "0");
            if (CoreStringUtils.endsWith(part, "."))
                part = part.substring(0, part.length-1);
            parts[i] = part;

        };
        return parts;
    }
});

return Transform;

}); // require js
