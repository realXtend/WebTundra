
define([
        "lib/classy",
    ], function(Class) {

var OgreSkeleton = Class.$extend(
{
    __init__ : function(name)
    {
        this.name = name;
        this.bones = {};
        this.bonesFlat = [];
        this.animations = {};
        this.animationsFlat = [];
    },

    __classvars__ :
    {
        MAX_NUM_BONES : 256,

        BlendMode :
        {
            AVERAGE    : 0,
            CUMULATIVE : 1
        }
    },

    getBone : function(id)
    {
        if (typeof id === "number")
            return this.bones[id];
        else if (typeof id === "string")
        {
            for (var iterId in this.bones)
                if (this.bones[iterId].name === id)
                    return this.bones[iterId];
        }
        return null;
    },

    addBone : function(ogreBone)
    {
        this.bones[ogreBone.id] = ogreBone;
        this.bonesFlat.push(ogreBone);
    },

    parentBone : function(childId, parentId)
    {
        this.bones[childId].parentId = parentId;
        this.bones[childId].parent = this.getBone(parentId);
    },

    addAnimation : function(ogreAnimation)
    {
        this.animations[ogreAnimation.name] = ogreAnimation;
        this.animationsFlat.push(ogreAnimation);
    }
});

return OgreSkeleton;

}); // require js
