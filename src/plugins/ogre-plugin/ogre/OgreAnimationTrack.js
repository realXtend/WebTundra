
define([
        "lib/classy",
    ], function(Class) {

var OgreAnimationTrack = Class.$extend(
{
    __init__ : function(bone)
    {
        this.bone = bone;

        this.keyFrames = [];
    },

    addKeyFrame : function(ogreKeyFrame)
    {
        ogreKeyFrame.bone = this.bone;
        this.keyFrames.push(ogreKeyFrame);
    }
});

return OgreAnimationTrack;

}); // require js
