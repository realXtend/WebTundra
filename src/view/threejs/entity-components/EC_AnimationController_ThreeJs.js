
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/frame/FrameLimiter",
        "entity-components/EC_AnimationController"
    ], function(Class, Tundra, FrameLimiter, EC_AnimationController) {

/* Adapted from <threejs>/examples/js/BlendCharacter.js 
   from author Michael Guerrero / http://realitymeltdown.com */

var AnimationBlender = Class.$extend(
{
    __init__ : function()
    {
        this.schedule = [];
        this.sub = Tundra.frame.onUpdate(this, this.onUpdate);
    },

    __classvars__ :
    {
        WeightZero  : 0,
        WeightOne   : 1
    },

    reset : function()
    {
        this.stop();

        Tundra.events.unsubscribe(this.sub);
    },

    getScheduled : function(name)
    {
        for (var i = 0; i < this.schedule.length; i++)
            if (this.schedule[i].animation.name === name)
                return this.schedule[i];
        return null;
    },

    _schedule : function(anim, start, end, duration)
    {
        var sheduled = this.getScheduled(anim.name);
        if (sheduled == null)
        {
            sheduled =
            {
                animation : anim,
                start     : start
            };
            this.schedule.push(sheduled);
        }
        // Updating currently sheduled, continue where it is now
        else
            sheduled.start = anim.weight;

        sheduled.end       = end;
        sheduled.duration  = duration;
        sheduled.t         = 0.0;

        // If not looping, the duration cant be longer than the animation duration. Even with this
        // check it can clip as current time is probably not at zero.
        if (anim.loop === false && anim.data !== undefined && sheduled.duration > anim.data.length)
            sheduled.duration = anim.data.length;
    },

    crossfade : function(fromAnimation, toAnimation, duration)
    {
        duration = (typeof duration === "number" ? duration : 0.5);

        // Shedule from animation if valid and currently playing
        if (fromAnimation !== null && fromAnimation !== undefined && fromAnimation.isPlaying === true)
            this._schedule(fromAnimation, fromAnimation.weight, AnimationBlender.WeightZero, duration)
        this._schedule(toAnimation, AnimationBlender.WeightZero, AnimationBlender.WeightOne, duration)
    },

    stop : function(name)
    {
        if (typeof name === "string")
        {
            for (var i = 0; i < this.schedule.length; i++)
            {
                if (this.schedule[i].animation.name === name)
                {
                    this.schedule[i].animation.stop();
                    this.schedule.splice(i,1);
                    break;
                }
            }
        }
        else
        {
            for (var i = 0; i < this.schedule.length; i++)
                this.schedule[i].animation.stop();
            this.schedule = [];
        }
    },

    onUpdate : function(frametime)
    {
        for (var i = this.schedule.length - 1; i >= 0; i--)
        {
            var data = this.schedule[i];
            data.t += frametime;

            // Complete
            if (data.t >= data.duration)
            {
                this.schedule.splice(i,1);

                data.animation.weight = data.end;
                if (data.animation.weight <= 0)
                    data.animation.stop();
            }
            // Advance
            else
            {
                data.animation.weight = data.start + (data.end - data.start) * data.t / data.duration;
            }
        };
    }
});

/**
    AnimationController component implementation for the three.js render system.

    @class EC_AnimationController_ThreeJs
    @extends EC_AnimationController
    @constructor
*/
var EC_AnimationController_ThreeJs = EC_AnimationController.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.updateSkeleton = new FrameLimiter(1/30);
        this.updateSkeleton.sub = null;

        this.blender = new AnimationBlender();
        this.currentAnimation = null;

        this.skeletonHelper = null;
        this.subs = {};
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset : function()
    {
        this.removeSkeletonHelper();
        this.unsub(true);

        this.blender.reset();
    },

    playAnimation : function(name, loop, speed, fadein)
    {
        loop = (typeof loop === "boolean" ? loop : false);
        speed = (typeof speed === "number" ? speed : 1.0);

        var skeletonAsset = this.getSkeletonAsset();
        if (skeletonAsset == null)
        {
            this.log.warn("playAnimation could not find valid skeleton from Mesh component in Entity '" + (this.parentEntity ? this.parentEntity.toString() : "") + "'");
            return;
        }
        var animation = skeletonAsset.getAnimation(name);
        if (animation != null)
        {
            // @todo Magic hack for three.js -> our (Ogre) anim speed. Probably due to timescales being sec vs. msec?
            animation.timeScale = 0.0008 * speed;
            animation.loop = loop;

            if (typeof fadein === "number")
                this.blender.crossfade(this.currentAnimation, animation, fadein)
            else if (this.currentAnimation != null)
                this.currentAnimation.stop();
            animation.play();

            this.currentAnimation = animation;
        }
        else
            this.log.error("Could not find animation", name, "for playback in", skeletonAsset.originalName(), ". See EC_AnimationController.getAvailableAnimations().");
    },

    getAvailableAnimations : function()
    {
        var skeletonAsset = this.getSkeletonAsset();
        if (skeletonAsset != null)
            return skeletonAsset.getAvailableAnimations();
        return [];
    },

    getSkeletonAsset : function()
    {
        if (this.parentEntity != null && this.parentEntity.mesh != null && this.parentEntity.mesh.skeletonAsset != null)
            return this.parentEntity.mesh.skeletonAsset;
        return null;
    },

    hookSkeletonCreated : function()
    {
        if (this.parentEntity == null)
        {
            this.log.error("Parent Entity is not present!");
            return;
        }
        if (this.parentEntity.mesh == null)
        {
            if (this.subs["onComponentCreated"] === undefined)
                this.subs["onComponentCreated"] = this.parentEntity.onComponentCreated(this, this.onComponentCreated);
            return;       
        }
        else
            this.unsub("onComponentCreated");
        if (this.parentEntity.mesh.skeletonAsset == null)
        {
            if (this.subs["onSkeletonLoaded"] === undefined)
                this.subs["onSkeletonLoaded"] = this.parentEntity.mesh.onSkeletonLoaded(this, this.onSkeletonLoaded);
            return;       
        }
        else
            this.unsub("onSkeletonLoaded");

        if (this.drawDebug === true)
            this.createSkeletonHelper();
    },

    unsub : function(name)
    {
        if (typeof name === "string")
        {
            var sub = this.subs[name];
            if (sub !== undefined)
            {
                Tundra.events.unsubscribe(sub);
                this.subs[name] = undefined;
            }
        }
        else if (typeof name === "boolean" && name === true)
        {
            var subkeys = Object.keys(this.subs);
            for (var i = 0; i < subkeys.length; i++)
                Tundra.events.unsubscribe(this.subs[subkeys[i]]);
            this.subs = {};
        }
    },

    onComponentCreated : function(ent, comp)
    {
        if (comp.typeName === "Mesh")
            this.hookSkeletonCreated();
    },

    onSkeletonLoaded : function(ent, meshComp, asset)
    {
        this.hookSkeletonCreated();
    },

    createSkeletonHelper : function()
    {
        // Created and parented, nothing to do.
        if (this.skeletonHelper != null && this.skeletonHelper.parent != null)
            return;

        var skeletonAsset = this.getSkeletonAsset();
        if (skeletonAsset == null)
        {
            this.hookSkeletonCreated();
            return;
        }
        if (skeletonAsset.skin == null)
        {
            this.log.error("OgreSkeletonAsset.skin not defined but asset is loaded!");
            return;
        }

        if (this.skeletonHelper == null)
        {
            this.skeletonHelper = new THREE.SkeletonHelper(skeletonAsset.getSkeletonParent());
            this.skeletonHelper.material.linewidth = 3;
        }
        if (this.skeletonHelper.parent == null)
            skeletonAsset.getSkeletonParent().add(this.skeletonHelper);

        if (this.updateSkeleton.sub == null)
            this.updateSkeleton.sub = Tundra.frame.onUpdate(this, this.onUpdate);

        this.unsub(true);
    },

    removeSkeletonHelper : function()
    {
        this.unsub(true);

        if (this.updateSkeleton.sub != null)
        {
            Tundra.events.unsubscribe(this.updateSkeleton.sub);
            this.updateSkeleton.sub = null;
        }

        if (this.skeletonHelper == null)
            return;

        var parent = this.skeletonHelper.parent;
        if (parent != null)
            parent.remove(this.skeletonHelper);

        if (this.skeletonHelper.geometry != null)
            this.skeletonHelper.geometry.dispose();
        this.skeletonHelper = null;
    },

    update : function()
    {
        if (this.drawDebug === true)
            this.createSkeletonHelper();
        else
            this.removeSkeletonHelper();
    },

    onUpdate : function(frametime)
    {
        if (this.skeletonHelper != null && this.updateSkeleton.shouldUpdate(frametime))
            this.skeletonHelper.update();
    },

    attributeChanged : function(index, name, value)
    {
        if (index === 1)
            this.update();
    }
});

return EC_AnimationController_ThreeJs;

}); // require js
