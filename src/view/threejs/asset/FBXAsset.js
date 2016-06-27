
define([
        "lib/three",
        "lib/three/fbx/FBXLoader",
        "core/framework/Tundra",
        "view/threejs/asset/AnimationProviderAsset"
    ], function(THREE, FBXLoader, Tundra, AnimationProviderAsset) {

/**
    Represents a Ogre rendering engine mesh asset. This asset is processed and Three.js rendering engine meshes are generated.
    @class FBXAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var FBXAsset = AnimationProviderAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "FBXAsset", AnimationProviderAsset.Type.SkinnedMesh);
        this.requiresCloning = true;
        this.mesh = undefined;
    },

    _cloneImpl : function(newAssetName)
    {
        // Clone the three.js Object3D so that they get their own transform etc.
        // but don't clone the geometry, just reference to the existing geometry.
        // The unloading mechanism will check when the geometry uuid is no longer used and
        // is safe to unload.

        var meshAsset = new FBXAsset(newAssetName);
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

    getBoneParent : function()
    {
        return (this.skin ? this.skin : (this.isLoaded() ? this.mesh : null));
    },

    isAttached: function()
    {
        return Object.keys(this.animationHierarchy).length > 0;
    },

    deserializeFromData : function(data, dataType, transfer)
    {
        try
        {
            var loader = new THREE.FBXLoader();
            loader.textureBasePath = this.baseRef.substring(0, this.baseRef.length - 1);
            this.mesh = loader.parse(data);
            this.mesh.traverse(function(obj)
            {
                if (obj instanceof THREE.SkinnedMesh)
                {
                    this.skin = obj;

                    if (!!obj.geometry.animations || !!obj.geometry.morphAnimations)
                    {
                        var animations = obj.geometry.animations;
                        for (var i = 0, len = animations.length; i < len; ++i)
                            this.animationHierarchy[animations[i].name] = animations[i];
                    }
                }
            }.bind(this));

            this._emitLoaded();
            console.log("FBX: deserializeFromData:", this.mesh);
        }
        catch(e)
        {
            console.log("[FBXAsset]: Failed to deserialize FBX asset from data: ", e);
            return false;
        };
    }
});

return FBXAsset;

}); // require js
