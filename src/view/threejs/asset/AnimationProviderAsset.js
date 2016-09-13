
define([
        "core/framework/Tundra",
        "core/asset/IAsset"
    ], function(Tundra, IAsset) {

var AnimationProviderAsset = IAsset.$extend(
/** @lends AnimationProviderAsset.prototype */
{
    __classvars__ :
    {
        /**
            @static
            @readonly
            @memberof AnimationProviderAsset
            @enum {Number}
        */
        Type:
        {
            SkinnedMesh: 0,
            KeyFrame: 1
        }
    },

    /**
        Animation provider asset interface

        @extends IAsset
        @constructs
        @param {String} name Unique name of the asset, usually this is the asset reference.
        @param {String} type Asset type.
    */
    __init__ : function(name, type, animationType)
    {
        this.$super(name, type);
        this.providesAnimations = true;
        this.animationHierarchy = {};
        this.animationType = animationType;
    },

    /**
        Returns available animation names for this skeleton.
        @return {Array} List of strings.
    */
    getAvailableAnimations : function()
    {
        return Object.keys(this.animationHierarchy);
    },

    /**
        Returns if animation is available in this skeleton.
        @return {Boolean}
    */
    hasAnimation : function(name)
    {
        return (this.animationHierarchy[name] !== undefined);
    },

    getAnimation : function(name)
    {
        if (!this.isAttached())
        {
            this.log.error("Cannot get animation, skeleton", this.name, "not attached.");
            return null;
        }

        var animation = this.animationHierarchy[name];
        if (animation === undefined)
        {
            this.log.error("Could not find animation", name, "for playback in", this.name, ". See getAvailableAnimations() for available animation names.");
            return null;
        }
        return animation;
    }
});

return AnimationProviderAsset;

}); // require js
