
define([
        "lib/three",
        "core/framework/Tundra",
        "view/threejs/asset/AnimationProviderAsset",
        "view/threejs/collada/WebTundraColladaWrapper",
        "view/threejs/collada/ColladaThreeJsUtils"
    ], function(THREE, Tundra, AnimationProviderAsset, WebTundraColladaWrapper, ColladaThreeJsUtils) {

/**
    Represents a Ogre rendering engine mesh asset. This asset is processed and Three.js rendering engine meshes are generated.
    @class ColladaAsset
    @extends AnimationProviderAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var ColladaAsset = AnimationProviderAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "ColladaAsset", AnimationProviderAsset.Type.SkinnedMesh);
        this.requiresCloning = true;
        this.mesh = undefined;
        this.skin = undefined;
        this.animations = [];
    },

    _cloneImpl : function(newAssetName)
    {
        // Clone the three.js Object3D so that they get their own transform etc.
        // but don't clone the geometry, just reference to the existing geometry.
        // The unloading mechanism will check when the geometry uuid is no longer used and
        // is safe to unload.

        var meshAsset = new ColladaAsset(newAssetName);
        meshAsset.mesh = this.mesh.clone();
        return meshAsset;
    },

    numSubmeshes: function()
    {
        return (this.isLoaded() ? this.mesh.children.length : 0);
    },

    getSubmesh: function(index)
    {
        return (this.isLoaded() ? this.mesh.children[index] : undefined);
    },

    isLoaded : function()
    {
        return (this.mesh !== undefined);
    },

    isAttached: function()
    {
        return Object.keys(this.animationHierarchy).length > 0;
    },

    getBoneParent : function()
    {
        return (this.skin ? this.skin : (this.isLoaded() ? this.mesh : null));
    },

    deserializeFromData : function(data, dataType, transfer)
    {
        try
        {
            var loader = new WebTundraColladaWrapper.Loader;
            loader.parse(data, function(result)
            {
                this.mesh = result.scene;
                this.skin = Array.isArray(result.skins) ? result.skins[0] : undefined;
                if (this.skin)
                {
                    this.animationType = AnimationProviderAsset.Type.SkinnedMesh;
                    this.animationHierarchy = ColladaThreeJsUtils.loadSkinnedMeshAnimations(this.skin);
                }
                else
                {
                    this.animationType = AnimationProviderAsset.Type.KeyFrame;
                    this.animationHierarchy = ColladaThreeJsUtils.loadKeyFrameAnimations(result.animations);
                }

                this._emitLoaded();
            }.bind(this), transfer.proxyRef || transfer.ref);
        }
        catch(e)
        {
            this.log.error("Could not load collada asset:", e);
            return false;
        };
    },

    unload: function()
    {
        if (this.requiresCloning && this.isCloneSource)
            return;

        if (this.mesh && this.mesh.parent)
            this.mesh.parent.remove(this.mesh);

        if (this.mesh && this.mesh.parent)
            this.mesh.parent.remove(this.mesh);
    }
});

return ColladaAsset;

}); // require js
