
define([
        "lib/classy",
        "lib/three",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(Class, THREE, TundraSDK, TundraLogging) {

/**
    Transform object that contains position, rotation and scale.

    @class Transform
    @constructor
    @param {Three.Vector3} [pos=THREE.Vector3(0,0,0)] Position.
    @param {Three.Vector3} [rot=THREE.Vector3(0,0,0)] Rotation in degrees.
    @param {Three.Vector3} [scale=THREE.Vector3(1,1,1)] Scale.
*/
var Transform = Class.$extend(
{
    __init__ : function(pos, rot, scale)
    {
        this.log = TundraLogging.getLogger("Transform");

        if (pos !== undefined && !(pos instanceof THREE.Vector3))
            this.log.warn("Constructor 'pos' parameter is not a THREE.Vector3", pos);
        if (rot !== undefined && !(pos instanceof THREE.Vector3))
            this.log.warn("Constructor 'rot' parameter is not a THREE.Vector3", rot);
        if (scale !== undefined && !(pos instanceof THREE.Vector3))
            this.log.warn("Constructor 'scale' parameter is not a THREE.Vector3", scale);

        // "Private" internal data. Actual access from 'pos', 'rot' and 'scale'.
        this._pos = (pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(0,0,0));
        this._rot = (rot instanceof THREE.Vector3 ? rot : new THREE.Vector3(0,0,0));
        this._scale = (scale instanceof THREE.Vector3 ? scale : new THREE.Vector3(1,1,1));

        // Automatic euler/quaternion updates when our Tundra angle rotation is changed.
        this._rotEuler = new THREE.Euler(THREE.Math.degToRad(this._rot.x),
            THREE.Math.degToRad(this._rot.y), THREE.Math.degToRad(this._rot.z),
            "ZYX" // This is important for Quaternions to be correctly produced from our euler.
        );

        /**
            Position
            @property pos
            @type THREE.Vector3
        */
        /**
            Specifies the rotation of this transform in *degrees*, using the Euler XYZ convention.
            @property rot
            @type THREE.Vector3
        */
        /**
            Scale
            @property scale
            @type THREE.Vector3
        */
        Object.defineProperties(this, {
            "pos" : {
                get : function ()      { return this._pos; },
                set : function (value) { this.setPosition(value); }
            },
            "rot" : {
                get : function ()      { return this._rot; },
                set : function (value) { this.setRotation(value); }
            },
            "scale" : {
                get : function ()      { return this._scale; },
                set : function (value) { this.setScale(value); }
            }
        });
    },

    /**
        Adjusts this transforms orientation so its looking at the passed in position.
        @method lookAt
        @param {THREE.Vector3} eye
        @param {THREE.Vector3} target
    */
    lookAt : function(eye, target)
    {
        if (this._orientationMatrix === undefined)
            this._orientationMatrix = new THREE.Matrix4();
        this._orientationMatrix.makeTranslation(0,0,0);
        this._orientationMatrix.lookAt(eye, target, TundraSDK.framework.renderer.axisY);

        this.setRotation(new THREE.Quaternion().setFromRotationMatrix(this._orientationMatrix));
    },

    /**
        Returns orientation of this Transform as a quaternion.
        @method orientation
        @return {THREE.Quaternion} Orientation.
    */
    orientation : function()
    {
        this._updateEuler();

        var quat = new THREE.Quaternion();
        quat.setFromEuler(this._rotEuler, false);
        return quat;
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
        @method euler
        @return {THREE.Euler} Orientation.
    */
    euler : function()
    {
        this._updateEuler();
        return this._rotEuler.clone();
    },

    /**
        Set position.
        @method setPosition
        @param {THREE.Vector3} vector Position vector.
    */
    /**
        Set position.
        @method setPosition
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
        else
            this.log.error("setPosition must be called with a single Three.Vector3 or x,y,z with type of number.", x, y, z);
    },

    /**
        Set rotation.
        @method setRotation
        @param {THREE.Vector3} vector Rotation vector in angles.
    */
    /**
        Set rotation.
        @method setRotation
        @param {THREE.Quaternion} quaternion Rotation quaternion.
    */
    /**
        Set rotation.
        @method setRotation
        @param {THREE.Euler} euler Rotation in radians.
    */
    /**
        Set rotation.
        @method setRotation
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
        else
            this.log.error("setRotation must be called with a single Three.Vector3, THREE.Quaternion or x,y,z with type of number.", x, y, z);
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
        else
            this.log.error("setScale must be called with a single Three.Vector3 or x,y,z with type of number.", x, y, z);
        return false;
    },

    /**
        Returns a clone of this transform.
        @method clone
        @return {Transform} Transform.
    */
    clone : function()
    {
        return new Transform(this.pos.clone(), this.rot.clone(), this.scale.clone());
    },

    /**
        Returns this Transform as a string for logging purposes.
        @method toString
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
    }
});

return Transform;

}); // require js
