
define([
        "lib/three",
        "lib/three/OBJLoader",
        "core/framework/TundraSDK",
        "core/asset/IAsset"
    ], function(THREE, OBJLoader, TundraSDK, IAsset) {

/**
    Represents a OBJ mesh asset. This asset is processed and Three.js rendering engine meshes are generated.

    @class ObjMeshAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var ObjMeshAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "ObjMeshAsset");

        this.requiresCloning = true;
        /**
            THREE.Object3D scene node where all the submeshes with the actual geometry are parented to.
            @property mesh
            @type THREE.Object3D
        */
        this.mesh = undefined;
    },

    __classvars__ :
    {
        Loader : new THREE.OBJLoader()
    },

    isLoaded : function()
    {
        return (this.mesh !== undefined && this.mesh.children.length > 0);
    },

    unload : function()
    {
        // If this is the source of cloning don't unload it.
        // This would break the mesh if refs with it are added back during runtime.
        if (this.requiresCloning && this.isCloneSource)
            return;

        var numSubmeshes = this.numSubmeshes();
        if (this.logging && this.mesh != null && numSubmeshes > 0)
            this.log.debug("unload", this.name);

        if (this.mesh != null && this.mesh.parent != null)
            this.mesh.parent.remove(this.mesh);

        for (var i = 0; i < numSubmeshes; i++)
        {
            if (this.logging) console.log("  submesh " + i);
            var submesh = this.getSubmesh(i);
            if (submesh.geometry != null)
            {
                if (this.logging) console.log("    geometry");
                if (this.isGeometryInUse(submesh.geometry) === false)
                    submesh.geometry.dispose();
                else if (this.logging)
                    this.log.debug("      Still in use, not unloading");
                submesh.geometry = null;
            }
            submesh.material = null;
            submesh = null;
        }
        if (this.mesh != null)
            this.mesh.children = [];
        this.mesh = undefined;
    },

    isGeometryInUse : function(geom)
    {
        if (geom.uuid === undefined)
            return false;

        /// @todo This is probaly very slow. Figure out a faster way to do this.
        /// We could do internal bookkeeping on how many with this UUID have been created.
        var used = false;
        TundraSDK.framework.renderer.scene.traverse(function(node) {
            // We are only interested in things that are using a geometry.
            if (used === true || node == null || node.geometry === undefined ||
                (!(node.geometry instanceof THREE.BufferGeometry) && !(node.geometry instanceof THREE.Geometry)))
                return;

            if (node.geometry.uuid === geom.uuid)
                used = true;
        });
        return used;
    },

    _cloneImpl : function(newAssetName)
    {
        // Clone the three.js Object3D so that they get their own transform etc.
        // but don't clone the geometry, just reference to the existing geometry.
        // The unloading mechanism will check when the geometry uuid is no longer used and
        // is safe to unload.

        var meshAsset = new ObjMeshAsset(newAssetName);
        meshAsset.mesh = TundraSDK.framework.renderer.createSceneNode();
        for (var i=0, len=this.numSubmeshes(); i<len; ++i)
        {
            var existingSubmesh = this.getSubmesh(i);
            var clonedSubmesh = null;

            if (existingSubmesh instanceof THREE.SkinnedMesh)
                clonedSubmesh = new THREE.SkinnedMesh(existingSubmesh.geometry, TundraSDK.framework.renderer.materialWhite, false);
            else
                clonedSubmesh = new THREE.Mesh(existingSubmesh.geometry, TundraSDK.framework.renderer.materialWhite);

            clonedSubmesh.name = meshAsset.name + "_submesh_" + i;
            clonedSubmesh.tundraSubmeshIndex = existingSubmesh.tundraSubmeshIndex;

            meshAsset.mesh.add(clonedSubmesh);
        }
        return meshAsset;
    },

    getSubmesh : function(index)
    {
        return (this.isLoaded() ? this.mesh.children[index] : null);
    },

    numSubmeshes : function()
    {
        return (this.isLoaded() ? this.mesh.children.length : 0);
    },

    deserializeFromData : function(data, dataType)
    {
        try
        {
            this.mesh = ObjMeshAsset.Loader.parse(data);
        }
        catch(e)
        {
            this.log.error("Failed to load OBJ mesh", this.name, e.toString());
            this.mesh = undefined;
        }

        if (this.mesh === undefined || this.mesh === null)
            this.mesh = TundraSDK.framework.renderer.createSceneNode();

        // Placeable will update the matrix when changes occur.
        this.mesh.name = this.name;
        this.mesh.matrixAutoUpdate = false;

        for (var i = 0; i < this.mesh.children.length; i++)
        {
            this.mesh.children[i].tundraSubmeshIndex = i;
            this.mesh.children[i].name = this.name + "_submesh_" + i;
        }

        return this.isLoaded();
    }
});

return ObjMeshAsset;

}); // require js
