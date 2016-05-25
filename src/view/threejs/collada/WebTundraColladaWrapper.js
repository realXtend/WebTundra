
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
        animations      : [],

        load : function(animations, startAfterLoad)
        {
            startAfterLoad = startAfterLoad || false;

            for (var i = 0, len = animations.length; i < len; ++i)
            {
                var animation = animations[i];
                var keyFrameAnim = new THREE.KeyFrameAnimation(animation);
                keyFrameAnim.timeScale = 1;
                this.animations.push(keyFrameAnim);
            }

            if (startAfterLoad)
                this.start();
        },

        playAnimation: function(name)
        {

        },

        start: function()
        {
            if (this.animations.length < 1)
                return;

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
        },

        update: function(frametime)
        {
            if (this.animations.length < 1)
                return;

            for (var i = 0, len = this.animations.length; i < len; ++i)
                this.animations[i].update(frametime);
        }
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
