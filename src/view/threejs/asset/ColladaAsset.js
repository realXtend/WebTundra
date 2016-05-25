
define([
        "lib/three",
        "core/framework/Tundra",
        "core/asset/IAsset",
        "view/threejs/collada/WebTundraColladaWrapper"
    ], function(THREE, Tundra, IAsset, WebTundraColladaWrapper) {

/**
    Represents a Ogre rendering engine mesh asset. This asset is processed and Three.js rendering engine meshes are generated.
    @class ColladaAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var ColladaAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "ColladaAsset");
        this.requiresCloning = true;
        this.mesh = undefined;
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

    deserializeFromData : function(data, dataType, transfer)
    {
        try
        {
            var loader = new WebTundraColladaWrapper.Loader;
            loader.parse(data, function(result)
            {
                this.mesh = result.scene;
                WebTundraColladaWrapper.KeyFrameAnimationHandler.load(result.animations, true);
                this._emitLoaded();
            }.bind(this), transfer.proxyRef || transfer.ref);
        }
        catch(e)
        {
            return false;
        };
    }
});

return ColladaAsset;

}); // require js
