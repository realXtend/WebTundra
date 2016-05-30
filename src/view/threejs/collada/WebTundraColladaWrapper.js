
define([
        "lib/classy",
        "lib/three",
        "lib/three/collada/Animation",
        "lib/three/collada/AnimationHandler",
        "lib/three/collada/KeyFrameAnimation",
        "lib/three/collada/ColladaLoader"
    ], function(Class, THREE) {

var KeyFrameAnimationHandler = Class.$extend(
{
    __classvars__ :
    {
        instances : [],

        update: function(frametime)
        {
            for (var i = 0, len = this.instances.length; i < len; ++i)
                this.instances[i].update(frametime);
        }
    },

    __init__ : function()
    {
        this.animations = [];
        this.progress = 0;
        this.isPlaying = false;
        this.loop = false;
        this.speed = 1.0;
        this.length = 0.0;
        KeyFrameAnimationHandler.instances.push(this);
    },

    load : function(animations)
    {
        for (var i = 0, len = animations.length; i < len; ++i)
        {
            var animation = animations[i];
            var keyFrameAnim = new THREE.KeyFrameAnimation(animation);
            keyFrameAnim.timeScale = 1;
            this.length = (animation.length > this.length ? animation.length : this.length);
            this.animations.push(keyFrameAnim);
        }
    },

    play: function(loop, speed)
    {
        if (this.animations.length < 1)
            return;

        this.loop = loop || false;
        this.speed = speed || 1.0;
        this.stop();

        for (var i = 0, len = this.animations.length; i < len; ++i )
        {
            var animation = this.animations[i];
            for (var h = 0, hl = animation.hierarchy.length; h < hl; h++)
            {
                var keys = animation.data.hierarchy[h].keys;
                var sids = animation.data.hierarchy[h].sids;
                var obj = animation.hierarchy[h];
                if (keys.length && sids)
                {
                    for (var s = 0; s < sids.length; s++)
                    {
                        var sid = sids[s];
                        var next = animation.getNextKeyWith(sid, h, 0);
                        if (next)
                            next.apply(sid);
                    }

                    obj.matrixAutoUpdate = false;
                    animation.data.hierarchy[h].node.updateMatrix();
                    obj.matrixWorldNeedsUpdate = true;
                }
            }

            animation.loop = false;
            animation.play();
        }

        this.progress = 0;
        this.isPlaying = true;
    },

    stop: function()
    {
        this.isPlaying = false;
        this.progress = 0;

        for (var i = 0, len = this.animations.length; i < len; ++i)
            this.animations[i].stop();
    },

    update: function(frametime)
    {
        if (!this.isPlaying)
            return;

        if (this.progress > 0 && this.progress < this.length)
        {
            for (var i = 0, len = this.animations.length; i < len; ++i)
                this.animations[i].update(frametime * this.speed);
        }
        else if (this.progress >= this.length)
        {
            this.stop();
            if (this.loop)
                this.play(this.loop, this.speed);
        }

        this.progress += frametime * this.speed;
    }
});

var WebTundraColladaWrapper = {
    Animation                   : THREE.Animation,
    AnimationHandler            : THREE.AnimationHandler,
    KeyFrameAnimation           : THREE.KeyFrameAnimation,
    KeyFrameAnimationHandler    : KeyFrameAnimationHandler,
    Loader                      : THREE.ColladaLoader
};

return WebTundraColladaWrapper;

}); // require js
