
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/frame/FrameLimiter",
        "entity-components/EC_AnimationController"
    ], function(Class, Tundra, FrameLimiter, EC_AnimationController) {

var EC_AnimationController_ThreeJs = EC_AnimationController.$extend(
/** @lends EC_AnimationController_ThreeJs.prototype */
{
    /**
        AnimationController component implementation for the three.js render system.

        @class EC_AnimationController_ThreeJs
        @extends EC_AnimationController
        @constructs
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.mixer = null;
        this.currentAnimation = null;

        this.subs = {};
        this.onUpdateSubscription = undefined;

        this._toBeActivated = {};
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    unsub : function(name)
    {
        // by name
        if (typeof name === "string")
        {
            var sub = this.subs[name];
            if (sub !== undefined)
            {
                Tundra.events.unsubscribe(sub);
                this.subs[name] = undefined;
            }
        }
        // all
        else if (typeof name === "boolean" && name === true)
        {
            var subkeys = Object.keys(this.subs);
            for (var i = 0; i < subkeys.length; i++)
                Tundra.events.unsubscribe(this.subs[subkeys[i]]);
            this.subs = {};

            if (this.onUpdateSubscription)
            {
                this.onUpdateSubscription.reset();
                this.onUpdateSubscription = undefined;
            }
        }
    },

    reset : function()
    {
        this.unsub(true);
    },

    update : function()
    {
        // First create or recreate of EC_Mesh (component is nuked on av appearance change)
        this.unsub("onComponentCreated");
        this.subs.onComponentCreated = this.parentEntity.onComponentCreated(this, this.onComponentCreated);

        // Can't go further without mesh
        if (!this.parentEntity.mesh)
            return;

        // Get notified when animations are loaded (ref is changed).
        // This sub should not be cleared when it fires!
        this.unsub("onAnimationsLoaded");
        this.subs.onAnimationsLoaded = this.parentEntity.mesh.onAnimationsLoaded(this, this.onAnimationsLoaded);

        // If already loaded (above signal will never fire), exec now
        if (this.getSkeletonAsset())
            this._reloadMixer();
    },

    ///////////////////////////////////////////////////////////////////////

    onComponentCreated : function(ent, comp)
    {
        if (comp.typeName === "Mesh")
            this.update();
    },

    onAnimationsLoaded : function(ent, meshComp, asset)
    {
        this._reloadMixer();
    },

    onFrameUpdate : function(frametime)
    {
        if (this.mixer)
            this.mixer.update(frametime);
    },

    attributeChanged : function(index, name, value)
    {
        if (index === 0)
            this.playAnimation(value);

        // @todo Reimplement draw debug!
        //if (index === 1)
        //    this.update();
    },

    ///////////////////////////////////////////////////////////////////////

    _reloadMixer : function()
    {
        var skeletonAsset = this.getSkeletonAsset();
        if (!skeletonAsset || !skeletonAsset.isAttached())
            return;

        // Always create new mixer. The underlying skeleton might have changed.
        if (this.mixer)
            this.mixer.stopAllAction();
        if (this.currentAnimation)
        {
            this.currentAnimation.stop();
            this.currentAnimation = undefined;
        }

        this.mixer = new THREE.AnimationMixer(skeletonAsset.getBoneParent());

        if (!this.onUpdateSubscription)
            this.onUpdateSubscription = Tundra.frame.onUpdate(this, this.onFrameUpdate);

        // start the current animation
        if (this._toBeActivated.name)
            this.playAnimation(this._toBeActivated.name, this._toBeActivated.loop, this._toBeActivated.speed, this._toBeActivated.fadein);
    },

    playAnimation : function(name, loop, speed, fadein)
    {
        loop  = (typeof loop === "boolean" ? loop : false);
        speed = (typeof speed === "number" ? speed : 1.0);

        this._toBeActivated = {
            name   : name,
            loop   : loop,
            speed  : speed,
            fadein : fadein
        };

        // Mixer not yet ready, waiting for skeleton load.
        // This function will be auto called when mixer is ready with above _toBeActivated information.
        // This also restores current animation if skeleton is reloaded/changed.
        if (!this.mixer)
            return;

        var skeletonAsset = this.getSkeletonAsset();
        if (!skeletonAsset)
        {
            this.log.warn("playAnimation could not find valid skeleton from Mesh component in Entity '" + (this.parentEntity ? this.parentEntity.toString() : "") + "'");
            return;
        }

        var animation = skeletonAsset.getAnimation(name);
        if (animation != null)
        {
            if (skeletonAsset.animationType !== 0) // skinned mesh
                return;

            var animationAction = this.mixer.clipAction(animation);
            animationAction.timeScale = speed;
            animationAction.loop = (loop === false ? THREE.LoopOnce : THREE.LoopRepeat);

            this.mixer.stopAllAction();
            if (typeof fadein === "number" && this.currentAnimation)
            {
                var animationTime = this.currentAnimation.time;

                this.currentAnimation.play();
                this.currentAnimation.time = animationTime;
                animationAction.play();

                this.currentAnimation.crossFadeTo(animationAction, fadein, true);
            }
            else
            {
                if (this.currentAnimation != null)
                    this.currentAnimation.stop();
                animationAction.play();
            }

            this.currentAnimation = animationAction;
        }
        else
            this.log.error("Could not find animation", name, "for playback in", skeletonAsset.originalName(), " See EC_AnimationController.getAvailableAnimations().");
    },

    getAvailableAnimations : function()
    {
        var skeletonAsset = this.getSkeletonAsset();
        if (skeletonAsset)
            return skeletonAsset.getAvailableAnimations();
        return [];
    },

    getSkeletonAsset : function()
    {
        if (this.parentEntity && this.parentEntity.mesh && this.parentEntity.mesh.meshAsset && this.parentEntity.mesh.meshAsset.providesAnimations)
            return this.parentEntity.mesh.meshAsset;

        if (this.parentEntity && this.parentEntity.mesh && this.parentEntity.mesh.skeletonAsset && this.parentEntity.mesh.skeletonAsset.providesAnimations)
            return this.parentEntity.mesh.skeletonAsset;

        return null;
    }
});

return EC_AnimationController_ThreeJs;

}); // require js
