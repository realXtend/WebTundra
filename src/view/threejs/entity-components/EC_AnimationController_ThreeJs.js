
define([
        "core/framework/TundraSDK",
        "entity-components/EC_AnimationController"
    ], function(TundraSDK, EC_AnimationController) {

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
    },
    
    __classvars__ :
    {
        implementationName : "three.js"
    },

    getAvailableAnimations : function()
    {
        var animationNames = [];
        if (this.parentEntity == null)
            return animationNames;

        if (this.parentEntity.mesh != null && this.parentEntity.mesh.skeletonAsset != null)
            animationNames = this.parentEntity.mesh.skeletonAsset.getAvailableAnimations();
        return animationNames;
    },

    playAnimation : function(name, loop, speed)
    {
        if (this.parentEntity == null)
            return;

        if (this.parentEntity.mesh != null && this.parentEntity.mesh.skeletonAsset != null)
            this.parentEntity.mesh.skeletonAsset.playAnimation(name, loop, speed);
        else
            this.log.warn("playAnimation could not find valid skeleton from EC_Mesh.");
    }
});

return EC_AnimationController_ThreeJs;

}); // require js
