
define([
        "lib/three",
        "core/framework/Tundra",
        "core/asset/IAsset",
        "view/threejs/gltf/WebTundraGltfWrapper"
    ], function(THREE, Tundra, IAsset, WebTundraGltfWrapper) {

/**
    Represents a Ogre rendering engine mesh asset. This asset is processed and Three.js rendering engine meshes are generated.
    @class GltfAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var GltfAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "GltfAsset");
        this.requiresCloning = true;
        this.mesh = undefined;
    },

    _cloneImpl : function(newAssetName)
    {
        // Clone the three.js Object3D so that they get their own transform etc.
        // but don't clone the geometry, just reference to the existing geometry.
        // The unloading mechanism will check when the geometry uuid is no longer used and
        // is safe to unload.

        var meshAsset = new GltfAsset(newAssetName);
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
            this.load(transfer.proxyRef || transfer.ref, function(result)
            {
                this.mesh = result.scene;
                this._emitLoaded();
            }.bind(this));
        }
        catch(e)
        {
            return false;
        };
    },

    load: function(ref, callback)
    {
        var loader = new WebTundraGltfWrapper.Loader;
        loader.load(ref, callback);
    }
});

return GltfAsset;

}); // require js
