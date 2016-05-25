
define([
        "lib/classy",
    ], function(Class) {

var OgreAnimation = Class.$extend(
{
    __init__ : function(name, length)
    {
        this.name = name;
        this.length = length;

        this.tracks = [];
    },

    addTrack : function(ogreAnimationTrack)
    {
        this.tracks.push(ogreAnimationTrack);
    }
});

return OgreAnimation;

}); // require js
