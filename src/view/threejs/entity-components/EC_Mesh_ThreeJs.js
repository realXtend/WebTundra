
define([
        "lib/three",
        "core/framework/TundraSDK",
        "core/framework/CoreStringUtils",
        "core/scene/Scene",
        "entity-components/EC_Mesh",
        "core/scene/Attribute",
        "core/math/Transform",
        "core/asset/AssetTransfer",
        "core/asset/IAsset"
    ], function(THREE, TundraSDK, CoreStringUtils, Scene, EC_Mesh,
                Attribute, Transform, AssetTransfer, IAsset) {

/**
    Mesh component implementation for the three.js render system.

    @class EC_Mesh_ThreeJs
    @extends EC_Mesh
    @constructor
*/
var EC_Mesh_ThreeJs = EC_Mesh.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.meshAsset = null;
        this.skeletonAsset = null;
        this.materialAssets = [];

        this.meshRequested = false;
        this.skeletonRequested = false;
        this.materialsRequested = false;

        this._loadsEmitted = {
            mesh : false
        };
    },

    __classvars__ :
    {
        implementationName : "three.js"
    },

    reset : function()
    {
        TundraSDK.framework.events.remove("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded");
        TundraSDK.framework.events.remove("EC_Mesh." + this.parentEntity.id + "." + this.id + ".SkeletonLoaded");
        TundraSDK.framework.events.remove("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialLoaded");

        this.resetMesh();
        this.resetMaterials();

        if (this._componentAddedSub !== undefined)
        {
            TundraSDK.framework.events.unsubscribe(this._componentAddedSub);
            this._componentAddedSub = undefined;
        }
    },

    attributeChanged : function(index, name, value)
    {
        // nodeTransformation
        if (index === 0)
        {
            this.update();
        }
        // meshRef
        else if (index === 1)
        {
            this.resetMesh();
            this.update();
        }
        // skeletonRef
        else if (index === 2)
        {
            this.update();
        }
        // materialRefs
        else if (index === 3)
        {
            this.resetMaterials();
            this.update();
        }
        // drawDistance
        else if (index === 4)
        {
        }
        // castShadows
        else if (index === 5)
        {
            if (this.meshAsset == null)
                return;

            for (var i=0, num=this.meshAsset.numSubmeshes(); i<num; ++i)
            {
                var submesh = this.meshAsset.getSubmesh(i);
                if (submesh === undefined || submesh === null)
                    continue;
                submesh.castShadow = value;
            }
        }
    },

    update : function()
    {
        // Request mesh
        if (this.meshAsset == null && !this.meshRequested)
        {
            var meshRef = this.attributes.meshRef.get();
            if (meshRef != null && meshRef != "")
            {
                // Support force requesting three.js meshes with correct type
                var forcedType = undefined;
                if (CoreStringUtils.endsWith(meshRef, ".json", true) || CoreStringUtils.endsWith(meshRef, ".js", true))
                    forcedType = "ThreeJsonMesh";

                this.meshRequested = true;
                var transfer = TundraSDK.framework.asset.requestAsset(meshRef, forcedType);
                if (transfer != null)
                    transfer.onCompleted(this, this._meshAssetLoaded);
            }
        }

        // Request materials
        if (this.materialAssets.length === 0 && !this.materialsRequested)
        {
            var materialRefs = this.attributes.materialRefs.get();
            for (var i=0; i<materialRefs.length; i++)
            {
                this.materialsRequested = true;

                var materialRef = materialRefs[i];
                if (typeof materialRef === "string" && materialRef !== "")
                {
                    // Don't request materials that are already set
                    var submesh = (this.meshAsset != null ? this.meshAsset.getSubmesh(i) : undefined);
                    if (submesh != undefined && submesh.material != null && submesh.material.name === materialRef)
                        continue;

                    var transfer = TundraSDK.framework.asset.requestAsset(materialRef);
                    if (transfer != null)
                    {
                        transfer.onCompleted(this, this._materialAssetLoaded, i);
                        transfer.onFailed(this, this._materialAssetFailed, i);
                        this.materialAssets[i] = transfer;
                    }
                }
            }
        }

        // Mesh still loading?
        if (this.meshAsset == null || !this.meshAsset.isLoaded())
            return;

        // Materials still loading?
        if (this.allMaterialsLoaded())
        {
            // Request skeleton only after mesh and materials are loaded.
            // OgreSkeletonAsset will be modifying both when applied to them.
            if (this.skeletonAsset == null && !this.skeletonRequested)
            {
                var skeletonRef = this.attributes.skeletonRef.get();
                if (skeletonRef != null && skeletonRef != "")
                {
                    this.skeletonRequested = true;
                    var transfer = TundraSDK.framework.asset.requestAsset(skeletonRef);
                    if (transfer != null)
                    {
                        transfer.onCompleted(this, this._skeletonAssetLoaded);
                        return;
                    }
                }
            }

            // Apply materials
            var materialRefs = this.attributes.materialRefs.get();
            var numSubmeshes = this.meshAsset.numSubmeshes();
            for (var i=0; i<numSubmeshes; ++i)
            {
                // Target submesh
                var submesh = this.meshAsset.getSubmesh(i);
                if (submesh === undefined || submesh === null)
                    continue;

                // Check if this submesh already has the material ref
                var materialRef = materialRefs[i];
                if (submesh.material != null && submesh.material.name === materialRef)
                    continue;

                // Set loaded material, error material or empty material.
                var materialAsset = this.materialAssets[i];
                if (materialAsset instanceof IAsset || materialAsset instanceof THREE.Material)
                    submesh.material = (materialAsset instanceof IAsset ? materialAsset.material : materialAsset);
                else
                    submesh.material = TundraSDK.framework.renderer.materialWhite;

                submesh.receiveShadow = (submesh.material.hasTundraShadowShader !== undefined && submesh.material.hasTundraShadowShader === true);
                submesh.castShadow = this.castShadows;
            }
            if (this.materialAssets.length > numSubmeshes)
            {
                this.log.warnC("Too many materials for target mesh " + this.meshAsset.name + ". Materials: " +
                    this.materialAssets.length + " Submeshes: " + numSubmeshes + " In entity: " + this.parentEntity.id + " " +
                        this.parentEntity.name);
            }
        }

        // Parent this meshes scene node to EC_Placeable scene node
        if (this.meshAsset.mesh.parent == null)
        {
            if (this.parentEntity.placeable != null)
                this._onParentEntityComponentCreated(this.parentEntity, this.parentEntity.placeable);
            else
                this._componentAddedSub = this.parentEntity.onComponentCreated(this, this._onParentEntityComponentCreated);
        }

        TundraSDK.framework.renderer.updateSceneNode(this.meshAsset.mesh, this.nodeTransformation);

        // Attach skeleton to mesh
        if (this.skeletonAsset != null)
            this.skeletonAsset.attach(this.meshAsset);
    },

    _onParentEntityComponentCreated : function(entity, component)
    {
        if (component != null && component.typeName === "EC_Placeable")
        {
            if (this._componentAddedSub !== undefined)
            {
                TundraSDK.framework.events.unsubscribe(this._componentAddedSub);
                this._componentAddedSub = undefined;
            }

            if (component.sceneNode != null)
                this._onParentPlaceableNodeCreated(component, component.sceneNode);
            else
                this._placeableNodeCreatedSub = component.onSceneNodeCreated(this, this._onParentPlaceableNodeCreated);
        }
    },

    _onParentPlaceableNodeCreated : function(placeable, sceneNode)
    {
        if (this._placeableNodeCreatedSub !== undefined)
        {
            TundraSDK.framework.events.unsubscribe(this._placeableNodeCreatedSub);
            this._placeableNodeCreatedSub = undefined;
        }

        if (this.meshAsset != null && this.meshAsset.mesh != null)
        {
            var parentWasNull = (this.meshAsset.mesh.parent == null);
            placeable.addChild(this.meshAsset.mesh)

            if (parentWasNull && this._loadsEmitted.mesh === false)
            {
                this._loadsEmitted.mesh = true;
                TundraSDK.framework.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded", this.parentEntity, this, this.meshAsset);
            }
        }
        else
            this.log.error("Mesh not ready but placeable is?!")
    },

    resetMesh : function()
    {
        if (this.meshAsset != null)
        {
            var placeable = this.parentEntity.getComponent("EC_Placeable");
            if (placeable != null && placeable.sceneNode != null)
                placeable.sceneNode.remove(this.meshAsset.mesh);

            // Meshes are instantiated per object/usage so its safe to unload this instance here.
            this.meshAsset.unload();
        }
        this.meshAsset = null;
        this.meshRequested = false;
    },

    resetMaterials : function()
    {
        // We cannot unload the material asset as they are not loaded per object/usage.
        // If we unload here, all the other meshes that use this material will break.
        /*for (i=0; i<this.materialAssets.length; i++)
        {
            var material = this.materialAssets[i];
            if (material != null && typeof material !== "string")
                material.unload();
            material = null;
        }*/
        this.materialAssets = [];
        this.materialsRequested = false;
    },

    /**
        Set mesh reference.
        @method setMesh
        @param {String} meshRef Mesh reference.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    setMesh : function(meshRef, change)
    {
        if (typeof meshRef !== "string")
        {
            this.log.errorC("setMesh must be called with a string ref, called with:", meshRef);
            return false;
        }
        return this.attributes.meshRef.set(meshRef, change);
    },

    /**
        Set material reference.
        @method setMaterial
        @param {String} material Material reference.
        @param {Number} index Material index.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    setMaterial : function(material, index, change)
    {
        if (typeof material === "string" && typeof index === "number")
        {
            var materials = this.attributes.materialRefs.get(); // No need to getClone() here.
            for (var i = materials.length; i < index; ++i)
                materials.push("");
            materials[index] = material;
            return this.attributes.materialRefs.set(materials, change);
        }

        this.log.errorC("setMaterial must be called single string ref and material index as the second parameter, called with:", material, index);
        return false;
    },

    /**
        Set material references.
        @method setMaterials
        @param {Array} materials Material reference list.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    setMaterials : function(materials, change)
    {
        if (Array.isArray(materials))
            return this.attributes.materialRefs.set(materials, change);

        this.log.errorC("setMaterials must be called with Array parameter, called with:", materials);
        return false
    },

    /**
        Registers a callback for when a new mesh has been loaded.
        @example
            ent.mesh.onMeshLoaded(null, function(parentEntity, meshComponent, asset) {
                console.log("Mesh loaded", asset.name);
            });

        @method onMeshLoaded
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMeshLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onMeshLoaded, parent entity not set!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded", context, callback);
    },

    /**
        Registers a callback for when a new skeleton has been loaded.
        @example
            ent.mesh.onSkeletonLoaded(null, function(parentEntity, meshComponent, asset) {
                console.log("Skeleton loaded", asset.name);
            });

        @method onSkeletonLoaded
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onSkeletonLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onSkeletonLoaded, parent entity not set!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".SkeletonLoaded", context, callback);
    },

    /**
        Registers a callback for when a new material has been loaded.
        Material dependency textures are guaranteed to be loaded when fired.
        @example
            ent.mesh.onMaterialLoaded(null, function(parentEntity, meshComponent, index, asset) {
                console.log("Material loaded", asset.name, "to index", index);
            });

        @method onMaterialLoaded
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onMaterialLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onMaterialLoaded, parent entity not set!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialLoaded", context, callback);
    },

    _meshAssetLoaded : function(asset)
    {
        if (!this.hasParentEntity())
            return;

        this.meshAsset = asset;
        if (this.meshAsset.mesh != null)
        {
            this.meshAsset.mesh.tundraEntityId = this.parentEntity.id;
            for (var i = 0, numSubmeshes = this.meshAsset.numSubmeshes(); i < numSubmeshes; i++)
            {
                var submesh = this.meshAsset.getSubmesh(i);
                if (submesh != null)
                    submesh.tundraEntityId = this.parentEntity.id;
            }
        }
        this.update();

        if (this.meshAsset.mesh.parent != null && this._loadsEmitted.mesh === false)
        {
            this._loadsEmitted.mesh = true;
            TundraSDK.framework.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded", this.parentEntity, this, this.meshAsset);
        }
    },

    _skeletonAssetLoaded : function (asset, metadata)
    {
        if (!this.hasParentEntity())
            return;

        this.skeletonAsset = asset;
        this.update();

        TundraSDK.framework.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".SkeletonLoaded", this.parentEntity, this, this.skeletonAsset);
    },

    _materialAssetLoaded : function(asset, index)
    {
        if (!this.hasParentEntity())
            return;

        // Store material name for later load steps.
        if (asset !== undefined && index !== undefined)
            this.materialAssets[index] = asset;

        if (!this.allMaterialsLoaded())
            return;
        this.update();

        for (var i = 0; i < this.materialAssets.length; ++i)
        {
            var material = this.materialAssets[i];
            if (material instanceof IAsset && material.isLoaded())
                TundraSDK.framework.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialLoaded", this.parentEntity, this, i, material);
        }
    },

    _materialAssetFailed : function(transfer, reason, index)
    {
        this._materialAssetLoaded(TundraSDK.framework.renderer.materialLoadError, index);
    },

    /**
        Returns if all materials have been loaded.
        @method allMaterialsLoaded
        @return {Boolean}
    */
    allMaterialsLoaded : function()
    {
        for (var i = 0; i < this.materialAssets.length; ++i)
        {
            var material = this.materialAssets[i];
            if (material === undefined || material === null)
                continue;
            if (material instanceof THREE.Material)
                continue;

            if (material instanceof AssetTransfer)
                return false;
            if (!(material instanceof IAsset))
                return false;
        }
        return true;
    },

    /**
        Returns number of materials currently loading.
        @method numMaterialsLoading
        @return {Number}
    */
    numMaterialsLoading : function()
    {
        var pending = 0;
        for (var i = 0; i < this.materialAssets.length; ++i)
        {
            var material = this.materialAssets[i];
            if (material === undefined || material === null)
                continue;
            if (material instanceof AssetTransfer)
                pending++;
            if (material instanceof IAsset && !material.isLoaded())
                pending++;
        }
        return pending;
    }
});

return EC_Mesh_ThreeJs;

}); // require js
