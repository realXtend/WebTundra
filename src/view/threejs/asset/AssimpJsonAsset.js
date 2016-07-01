
define([
        "lib/three",
        "lib/three/assimp/AssimpJSONLoader",
        "core/framework/Tundra",
        "core/asset/IAsset"
    ], function(THREE, FBXLoader, Tundra, IAsset) {

/**
    Represents a Ogre rendering engine mesh asset. This asset is processed and Three.js rendering engine meshes are generated.
    @class AssimpJsonAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var AssimpJsonAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "AssimpJsonAsset");
        this.requiresCloning = true;
        this.mesh = undefined;
    },

    _cloneImpl : function(newAssetName)
    {
        // Clone the three.js Object3D so that they get their own transform etc.
        // but don't clone the geometry, just reference to the existing geometry.
        // The unloading mechanism will check when the geometry uuid is no longer used and
        // is safe to unload.

        var meshAsset = new AssimpJsonAsset(newAssetName);
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
            var metadata = data.__metadata__;
            if (metadata)
            {
                if (metadata.format !== 'assimp2json') {

                    this.log.error("Not an assimp file format:", metadata.format);
                    return false;
                }

                else if (metadata.version < 100 && metadata.version >= 200)
                {
                    this.log.error("Unsupported assimp version:", metadata.version);
                    return false;
                }
            }

            var loader = new THREE.AssimpJSONLoader();
            loader.texturePath = this.baseRef.substring(0, this.baseRef.length - 1);
            this.mesh = loader.parse(data);

            this._emitLoaded();
            console.log("Assimp: deserializeFromData:", this.mesh);
        }
        catch(e)
        {
            this.log.error("Could not load assimp asset:", e);
            return false;
        };
    },

    unload: function()
    {
        if (this.requiresCloning && this.isCloneSource)
            return;

        if (this.mesh && this.mesh.parent)
            this.mesh.parent.remove(this.mesh);
    }
});

return AssimpJsonAsset;

}); // require js
