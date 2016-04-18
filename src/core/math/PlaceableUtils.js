
define([
        "lib/classy",
        "lib/three",
        "lib/Tween",
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/math/MathUtils",
        "view/threejs/TransformEditor",
    ], function(Class, THREE, TWEEN, Tundra, TundraLogging, MathUtils, TransformEditor) {

/**
    @namespace
    @global
*/
var PlaceableUtils = {};

// @todo Hook into placeable/entity removed signals to stop animating.

PlaceableUtils.Animator = Class.$extend(
/** @lends PlaceableUtils.Animator.prototype */
{
    /**
        @constructs
    */
    __init__ : function()
    {
        this.log = TundraLogging.getLogger("PlaceableUtils.Animator");
        this.schedule = [];
    },

    /**
        Resets and stop all animation state.
    */
    reset : function()
    {
        this.stop(true);
    },

    /**
        Returns a sheduled/playing animation
        @param {EC_Placeable|String}
        @return {Object}
    */
    getScheduled : function(param)
    {
        var key = param;
        if (typeof key !== "string" && param.typeName === "Placeable")
            key = param.parentEntity.id + "." + param.id;
        if (typeof key !== "string")
        {
            this.log.error("getScheduled: Invalid parameter:", param);
            return undefined;
        }
        for (var i = this.schedule.length - 1; i >= 0; i--) {
            if (this.schedule[i].key === param)
                return this.schedule[i];
        };
        return undefined
    },

    /**
        Converts subset of easing strings into a TWEEN.Easing.

        @param {String} easing
        @param {Boolean} isPlaying If animation is a continuation (already playing) or starting from beginning.
        @return {TWEEN.Easing}
    */
    getEasing : function(easing, isPlaying)
    {
        if (typeof easing === "function")
            return easing;
        if (typeof easing === "string")
        {
            var lower = easing.toLowerCase();
            if (lower === "linear")
                return TWEEN.Easing.Linear.None;
            else if (lower === "quadratic")
                return (!isPlaying ? TWEEN.Easing.Quadratic.InOut : TWEEN.Easing.Quadratic.Out);
            else if (lower === "bounce")
                return (!isPlaying ? TWEEN.Easing.Bounce.InOut : TWEEN.Easing.Bounce.Out)
            else if (lower === "cubic")
                return (!isPlaying ? TWEEN.Easing.Cubic.InOut : TWEEN.Easing.Cubic.Out)
        }
        return (!isPlaying ? TWEEN.Easing.Cubic.InOut : TWEEN.Easing.Cubic.Out)
    },

    /**
        Animate position

        @param {EC_Placeable} placeable
        @param {Object} options
        @param {Object|THREE.Vector3} [options.from] - Source position. If left out, the current position will be retrieved from 'placeable'
        @param {Object|THREE.Vector3} options.to - Destination position.
        @param {number} [options.duration=1000] - Duration of the animation, default is 1 second (1000 miliseconds).
        @param {string|TWEEN.Easing} [options.easing] - Easing function. Can be a TWEEN.Easing function, or one of "linear", "quadratic", "bounce" and "cubic"
        @return {TWEEN.Tween}
    */
    position : function(placeable, options)
    {
        options = options || {};

        if (placeable.typeName !== "Placeable")
        {
            this.log.error("position: First parameter needs to be a Placeable component");
            return null;
        }
        else if (placeable.parentEntity == null)
        {
            this.log.error("position: Placeable component is not parented.");
            return null;
        }
        else if (options.to === undefined || typeof options.to.z !== "number")
        {
            this.log.error("position: Option 'to' must be a Vector3 like object.");
            return null;
        }
        options.from = options.from || placeable.worldPosition();

        var key = placeable.parentEntity.id + "." + placeable.id + ".pos";

        // Stop existing
        var wasPlaying = this._stopByKey(key);

        // Start
        options.easing   = this.getEasing(options.easing, wasPlaying);
        options.duration = options.duration || 1000;

        placeable._animatingPosition = true;

        var sheduled = { key : key, placeable : placeable, animator : this };
        sheduled.stop = function() {
            if (this.animator && this.key)
            {
                this.animator._stopByKey(this.key);
                return;
            }
            if (this.placeable)
                this.placeable._animatingPosition = false;
        };

        sheduled.animation = new TWEEN.Tween({ x : options.from.x, y : options.from.y, z : options.from.z, placeable : placeable, sheduled : sheduled, t : 0.0 })
            .easing(options.easing)
            .to({ x : options.to.x, y : options.to.y, z : options.to.z, t : 1.0 }, options.duration)
            .onUpdate(function() {
                if (this.placeable && this.placeable.parentEntity)
                {
                    // Check
                    if (typeof this.sheduled.animation._shouldStop === "function")
                    {
                        if (this.sheduled.animation._shouldStop.apply(this) === true)
                            return this.sheduled.animation.stop();
                    }
                    // Update placeable
                    this.placeable.setPosition(this.x, this.y, this.z);
                    // Custom update callback
                    if (typeof this.sheduled.animation._onUpdate === "function")
                        this.sheduled.animation._onUpdate.apply(this);
                }
            })
            .onComplete(function() {
                this.sheduled.stop();
                if (typeof this.sheduled.animation._onComplete === "function")
                    this.sheduled.animation._onComplete.apply(this);
            });

        this.schedule.push(sheduled);
        sheduled.animation.start();

        return sheduled.animation;
    },

    /**
        Animate rotation.

        @param {EC_Placeable} placeable
        @param {Object} options
        @param {Object|THREE.Vector3} [options.from] - Source rotation. If left out, the current rotation will be retrieved from 'placeable'
        @param {Object|THREE.Vector3} options.to - Destination rotation.
        @param {number} [options.duration=1000] - Duration of the animation, default is 1 second (1000 miliseconds).
        @param {string|TWEEN.Easing} [options.easing] - Easing function. Can be a TWEEN.Easing function, or one of "linear", "quadratic", "bounce" and "cubic"
        @return {TWEEN.Tween}
    */
    rotation : function(placeable, options)
    {
        options = options || {};

        if (placeable.typeName !== "Placeable")
        {
            this.log.error("rotation: First parameter needs to be a Placeable component");
            return null;
        }
        else if (placeable.parentEntity == null)
        {
            this.log.error("rotation: Placeable component is not parented.");
            return null;
        }
        else if (options.to === undefined || typeof options.to.z !== "number")
        {
            this.log.error("rotation: Option 'to' must be a Vector3 like object.");
            return null;
        }

        options.from = options.from || placeable.rotation();

        var key = placeable.parentEntity.id + "." + placeable.id + ".rot";

        // Stop existing
        var wasPlaying = this._stopByKey(key);

        // Start
        options.easing   = this.getEasing(options.easing, wasPlaying);
        options.duration = options.duration || 1000;

        placeable._animatingRotation = true;

        var sheduled = { key : key, placeable : placeable, animator : this };
        sheduled.stop = function() {
            if (this.animator && this.key)
            {
                this.animator._stopByKey(this.key);
                return;
            }
            if (this.placeable)
                this.placeable._animatingRotation = false;
        };

        sheduled.animation = new TWEEN.Tween({ x : options.from.x, y : options.from.y, z : options.from.z, placeable : placeable, sheduled : sheduled })
            .easing(options.easing)
            .to({ x : options.to.x, y : options.to.y, z : options.to.z }, options.duration)
            .onUpdate(function() {
                if (this.placeable && this.placeable.parentEntity)
                    this.placeable.setRotation(this.x, this.y, this.z);
            })
            .onComplete(function() {
                this.sheduled.stop();
            });

        this.schedule.push(sheduled);
        sheduled.animation.start();

        // TODO: Quaternions also
        // var fromQuat = new THREE.Quaternion().copy(options.from);
        // var toQuat = new THREE.Quaternion().copy(options.to);
        // var orientation = new THREE.Quaternion();

        // sheduled.animation = new TWEEN.Tween({ t : 0.0, placeable : placeable, sheduled : sheduled})
        //     .easing(options.easing)
        //     .to({ t : 1.0 }, options.duration)
        //     .onUpdate(function() {
        //         if (this.placeable && this.placeable.parentEntity)
        //         {
        //             THREE.Quaternion.slerp(fromQuat, toQuat, orientation, this.t);
        //             this.placeable.setWorldOrientation(orientation);
        //         }
        //     })
        //     .onComplete(function() {
        //         this.sheduled.stop();
        //     });

        // this.schedule.push(sheduled);
        // sheduled.animation.start();

        return sheduled.animation;

    },

    /**
        Animate setVisibilityScaling

        @param {EC_Placeable} placeable
        @param {Boolean} visible
        @param {Object} options
    */
    setVisibilityScaling : function(placeable, visible, options)
    {
        options = options || {};

        if (placeable.typeName !== "Placeable")
        {
            this.log.error("setVisibilityScaling: First parameter needs to be a Placeable component");
            return null;
        }
        else if (placeable.parentEntity == null)
        {
            this.log.error("setVisibilityScaling: Placeable component is not parented.");
            return null;
        }
        options.from = options.from || (!visible ? placeable.transform.scale : 0);
        options.to   = options.to   || (visible ? 1 : 0);

        var key = placeable.parentEntity.id + "." + placeable.id + ".scale";

        // Stop existing
        var wasPlaying = this._stopByKey(key);

        if (!visible && !placeable.visible)
            return;

        var animFrom = {
            x : (typeof options.from === "number" ? options.from : options.from.x),
            y : (typeof options.from === "number" ? options.from : options.from.y),
            z : (typeof options.from === "number" ? options.from : options.from.z),

            placeable : placeable,
            visible   : visible
        };

        var animTo = {
            x : (typeof options.to === "number" ? options.to : options.to.x),
            y : (typeof options.to === "number" ? options.to : options.to.y),
            z : (typeof options.to === "number" ? options.to : options.to.z)
        };

        // Start
        options.easing   = this.getEasing(options.easing, wasPlaying);
        options.duration = options.duration || 1000;

        placeable._animatingVisibility = true;
        placeable._animatingVisibilityTo = visible;
        placeable._animatingScale = true;

        placeable.setScale(animFrom.x, animFrom.y, animFrom.z);
        placeable.visible = true;

        if (placeable.parentEntity.billboard)
        {
            placeable.parentEntity.billboard.setOverrideScale(animFrom.x, animFrom.y);
            placeable.parentEntity.billboard.show(false);
        }

        var sheduled = { key : key, placeable : placeable, animator : this };
        sheduled.stop = function() {
            if (this.animator && this.key)
            {
                this.animator._stopByKey(this.key);
                return;
            }
            if (this.placeable)
            {
                this.placeable._animatingVisibility = false;
                this.placeable._animatingVisibilityTo = undefined;
                this.placeable._animatingScale = false;
            }
        };
        animFrom.sheduled = sheduled;

        sheduled.animation = new TWEEN.Tween(animFrom)
            .easing(options.easing)
            .to(animTo, options.duration)
            .onUpdate(function() {
                if (this.placeable && this.placeable.parentEntity)
                {
                    // Tween sometimes gives tiny Xe13 values, clamp to zero
                    // so transform scale zero checks wont log warnings.
                    if (this.x < 0 || MathUtils.isZero(this.x))
                        this.x = 0;
                    if (this.y < 0 || MathUtils.isZero(this.y))
                        this.y = 0;
                    if (this.z < 0 || MathUtils.isZero(this.z))
                        this.z = 0;

                    this.placeable.setScale(this.x, this.y, this.z);

                    // Update sprite size, it wont be scaled by the three parent node
                    if (this.placeable.parentEntity.billboard)
                        this.placeable.parentEntity.billboard.setOverrideScale(this.x, this.y);
                }
            })
            .onComplete(function(obj) {
                if (this.placeable && this.placeable.parentEntity)
                {
                    this.placeable.visible = this.visible;
                    if (this.placeable.parentEntity.billboard)
                        this.placeable.parentEntity.billboard.setVisible(this.visible);
                }
                this.sheduled.stop();
            });

        this.schedule.push(sheduled);
        sheduled.animation.start();

        return sheduled.animation;
    },

    /**
        Stop animations.
        @param {EC_Placeable|Boolean} [placeable] If defined, only this components or the string key animation is stopped. If 'true' stops all animations.
    */
    stop : function(param)
    {
        var stopped = false;

        // Stop one
        if (typeof param === "string" || typeof param === "object")
        {
            if (typeof param !== "string" && param.typeName === "Placeable")
            {
                // Stop all for a particular Placeable
                var key = param.parentEntity.id + "." + param.id;
                if (this._stopByKey(key + ".pos"))
                    stopped = true;
                if (this._stopByKey(key + ".scale"))
                    stopped = true;
                return stopped;
            }
            if (typeof param !== "string")
            {
                this.log.error("stop: Invalid parameter:", param);
                return false;
            }
            return this._stopByKey(param);
        }
        // Stop all. Must pass 'true' to avoid accidental usage.
        else if (typeof param === "boolean" && param === true)
        {
            while (this.schedule.length > 0)
            {
                if (this.schedule[0].key)
                    this._stopByKey(this.schedule[0].key);
                else
                    this.schedule.splice(0,1);
            };
            this.schedule = [];
            stopped = true;
        }
        else
            this.log.error("stop: Invalid parameter:", param);

        return stopped;
    },

    _stopByKey : function(key)
    {
        var wasPlaying = false;
        for (var i = this.schedule.length - 1; i >= 0; i--)
        {
            if (this.schedule[i].key === key)
            {
                found = true;

                var sheduled = this.schedule.splice(i,1)[0];
                sheduled.key = undefined;
                sheduled.stop();

                if (sheduled.animation)
                {
                    if (!wasPlaying)
                        wasPlaying = sheduled.animation.isPlaying();
                    sheduled.animation.stop();
                }
            }
        }
        return wasPlaying;
    }
});

PlaceableUtils._transformEditor = null;

Object.defineProperties(PlaceableUtils, {
    Gizmo : {
        get : function()
        {
            if (!this._transformEditor)
                this._transformEditor = new TransformEditor();
            return this._transformEditor;
        }
    }
});

Tundra.Classes.PlaceableUtils = PlaceableUtils;

return PlaceableUtils;

}); // require js
