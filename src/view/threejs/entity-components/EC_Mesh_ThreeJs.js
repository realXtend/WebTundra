
define([
        "lib/three",
        "core/framework/Tundra",
        "core/framework/CoreStringUtils",
        "core/scene/Scene",
        "entity-components/EC_Mesh",
        "core/scene/Attribute",
        "core/math/Transform",
        "core/asset/AssetTransfer",
        "core/asset/IAsset",
        "core/data/DataSerializer"
    ], function(THREE, Tundra, CoreStringUtils, Scene, EC_Mesh,
                Attribute, Transform, AssetTransfer, IAsset, DataSerializer) {

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

        this.attachements = [];
        this.attachementsMeta = {};

        this._loadsEmitted = {
            mesh : false
        };
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset : function()
    {
        Tundra.events.remove("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded");
        Tundra.events.remove("EC_Mesh." + this.parentEntity.id + "." + this.id + ".SkeletonLoaded");
        Tundra.events.remove("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialLoaded");

        this.resetMesh();
        this.resetMaterials();

        this.attachements = [];
        this.attachementsMeta = {};

        if (this._componentAddedSub !== undefined)
        {
            Tundra.events.unsubscribe(this._componentAddedSub);
            this._componentAddedSub = undefined;
        }
    },

    attributeChanged : function(index, name, value)
    {
        // nodeTransformation
        if (index === 0)
        {
            if (this.meshAsset && this.meshAsset.isLoaded())
                Tundra.renderer.updateSceneNode(this.meshAsset.mesh, this.nodeTransformation);
            else
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
            this.materialsRequested = false;
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

    /**
        Get root scene node for this mesh.
        @method getSceneNode
        @return {THREE.Object3D|null} Root scene node for all submeshes.
    */
    getSceneNode : function()
    {
        return (this.meshAsset != null ? this.meshAsset.getSceneNode() : null);
    },

    /**
        Get submesh.
        @method getSubmesh
        @return {THREE.Mesh|null} Submesh.
    */
    getSubmesh : function(index)
    {
        return (this.meshAsset != null ? this.meshAsset.getSubmesh(index) : null);
    },

    /**
        Get number of submeshes.
        @method numSubmeshes
        @return {Number} Number of submeshes.
    */
    numSubmeshes : function()
    {
        return (this.meshAsset != null ? this.meshAsset.numSubmeshes() : 0);
    },

    /**
        Get bounding box for this mesh.
        @method getBoundingBox
        @return {THREE.Box3} Bounding box.
    */
    getBoundingBox : function()
    {
        var box = new THREE.Box3();
        if (this.numSubmeshes() > 0)
            box.set(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));

        for (var i=0,len=this.numSubmeshes(); i<len; i++)
        {
            var sm = this.getSubmesh(i);
            if (sm != null && sm.geometry != null)
            {
                if (sm.geometry.boundingBox == null)
                    sm.geometry.computeBoundingBox();
                box.union(sm.geometry.boundingBox);
            }
        }
        return box;
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
                var forcedType = this._determineType(meshRef);

                this.meshRequested = true;
                var transfer = Tundra.asset.requestAsset(meshRef, forcedType);
                if (transfer != null)
                    transfer.onCompleted(this, this._meshAssetLoaded);
            }
        }

        // Request materials
        if (!this.materialsRequested)
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

                    // Add more file suffix checks here if more formats are implemented.
                    // Forcing to "OgreMaterial" is to make URL that dont have a .material suffix work.
                    var forcedType = "OgreMaterial";
                    if (CoreStringUtils.endsWith(materialRef, ".mtl", true))
                        forcedType = undefined;

                    // @note/todo Forcing to OgreMaterial might be problematic in the future if we support other formats!
                    var transfer = Tundra.asset.requestAsset(materialRef, forcedType);
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
                    var transfer = Tundra.asset.requestAsset(skeletonRef);
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

                // Find a loader material eg. mtl library
                if (materialAsset === undefined && materialRef === undefined)
                {
                    for (var iLoader = 0; iLoader < this.materialAssets.length; iLoader++)
                    {
                        var loader = this.materialAssets[iLoader];
                        if (loader instanceof IAsset && typeof loader.createMaterial === "function")
                            materialAsset = loader;
                    }
                }

                if (materialAsset instanceof IAsset && materialAsset.material instanceof THREE.Material)
                    submesh.material = materialAsset.material;
                else if (materialAsset instanceof IAsset && typeof materialAsset.createMaterial === "function")
                    submesh.material = materialAsset.createMaterial(submesh);
                else if (materialAsset instanceof THREE.Material)
                    submesh.material = materialAsset;
                else if (!submesh.material)
                    submesh.material = Tundra.renderer.materialWhite;

                submesh.receiveShadow = (submesh.material != null && submesh.material.hasTundraShadowShader !== undefined && submesh.material.hasTundraShadowShader === true);
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
        if (this.meshAsset.mesh && !this.meshAsset.mesh.parent)
        {
            if (this.parentEntity.placeable != null)
                this._onParentEntityComponentCreated(this.parentEntity, this.parentEntity.placeable);
            else
                this._componentAddedSub = this.parentEntity.onComponentCreated(this, this._onParentEntityComponentCreated);
        }
        if (this.meshAsset.mesh)
            Tundra.renderer.updateSceneNode(this.meshAsset.mesh, this.nodeTransformation);

        // Attach skeleton to mesh
        if (this.skeletonAsset != null)
            this.skeletonAsset.attach(this.meshAsset);

        // Attachements
        if (this.skeletonRef === "" || this.skeletonAsset != null)
            this.attachAttachements();
    },

    _determineType: function(meshRef)
    {
        if (CoreStringUtils.endsWith(meshRef, ".assimp.json", true))
            return "AssimpJson";

        if (CoreStringUtils.endsWith(meshRef, ".json", true) || CoreStringUtils.endsWith(meshRef, ".js", true))
            return "ThreeJsonMesh";

        return undefined;
    },

    _onParentEntityComponentCreated : function(entity, component)
    {
        if (component != null && component.typeName === "Placeable")
        {
            if (this._componentAddedSub !== undefined)
            {
                Tundra.events.unsubscribe(this._componentAddedSub);
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
            Tundra.events.unsubscribe(this._placeableNodeCreatedSub);
            this._placeableNodeCreatedSub = undefined;
        }

        if (this.meshAsset != null && this.meshAsset.mesh != null)
        {
            var parentWasNull = (this.meshAsset.mesh.parent == null);
            placeable.addChild(this.meshAsset.mesh)

            if (parentWasNull && this._loadsEmitted.mesh === false)
            {
                this._loadsEmitted.mesh = true;
                Tundra.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded", this.parentEntity, this, this.meshAsset);
            }
        }
        else
            this.log.error("Mesh not ready but placeable is?!")
    },

    attachAttachements : function()
    {
        if (this.meshRef !== "" && this.meshAsset == null)
        {
            this.log.warn("attachAttachements: Mesh", this.meshRef, "not ready yet!");
            return;
        }
        else if (this.skeletonRef !== "" && this.skeletonAsset == null)
        {
            this.log.warn("attachAttachements: Skeleton", this.skeletonRef, "not ready yet!");
            return;
        }

        // Attach
        var verticesToHide = [];
        var verticeLists = [];
        for (var i = 0; i < this.attachements.length; i++)
        {
            var attachement = this.attachements[i];
            if (attachement.attach(this.meshAsset, this.skeletonAsset) && attachement.verticesToHide.length > 0)
            {
                verticesToHide = verticesToHide.concat(attachement.verticesToHide);
            }
        }

        // Attachements can require hiding parts of the parent mesh to remove artifacts.
        if (verticesToHide.length === 0)
            return;

        // Remove duplicates, making it a set
        for (var di = 0; di < verticesToHide.length; di++)
        {
            if (verticesToHide[di] === undefined)
                break;
            for (var di2 = di+1; di2 < verticesToHide.length; di2++)
            {
                if (verticesToHide[di] === verticesToHide[di2])
                {
                    verticesToHide.splice(di2, 1);
                    di2--;
                }
            }
        }

        // Check if this same vertice set has been already requested
        // and the geometry is already in place.
        var hideVertices = true;
        if (Array.isArray(this.attachementsMeta.vertices))
        {
            hideVertices = false;
            for (var vi=0, vilen=this.attachementsMeta.vertices.length; vi<vilen; vi++)
            {
                if (this.attachementsMeta.vertices[vi] !== verticesToHide[vi])
                {
                    hideVertices = true;
                    break;
                }
            }
        }
        if (!hideVertices)
            return;

        /* @todo This code probably has some mem leaks if avatars keep on login/logout for a long time
           that might become a problem. Implement intelligent unloading of meshes and geometry in this.attachementsMeta */
        this.attachementsMeta.vertices = verticesToHide;

        /* From Tundra EC_Avatar::HideVertices
           "Under current system, it seems vertices should only be hidden from first submesh"
           Remember that we have probably shuffled around the vertice indexes during shared geometry etc. conversions
           so this is very helful. */

        var firstSubmesh = this.meshAsset.getSubmesh(0);
        if (firstSubmesh == null)
            return;

        // Store the original geometry so it can be restored
        if (this.attachementsMeta.geometryOriginal === undefined)
            this.attachementsMeta.geometryOriginal = firstSubmesh.geometry;
        if (this.attachementsMeta.submeshOriginal === undefined)
            this.attachementsMeta.submeshOriginal = firstSubmesh;

        // Dispose any geometry we made last time
        if (this.attachementsMeta.geometry !== undefined)
            this.attachementsMeta.geometry.dispose();

        this.attachementsMeta.geometry = this.attachementsMeta.geometryOriginal.clone();

        var indexBuffer = this.attachementsMeta.geometry.attributes.index.array;
        //var t = performance.now();

        // Remove vertices that need to be hidden
        //var used = [];
        var stdIndexArray = Array.prototype.slice.call(indexBuffer);
        var preLen = stdIndexArray.length;
        for (var ii=0, len=stdIndexArray.length; ii<len; ii+=3)
        {
            var vi1 = verticesToHide.indexOf(stdIndexArray[ii]);
            var vi2 = (vi1 !== -1 ? verticesToHide.indexOf(stdIndexArray[ii + 1]) : -1);
            var vi3 = (vi2 !== -1 ? verticesToHide.indexOf(stdIndexArray[ii + 2]) : -1);
            if (vi3 !== -1)
            {
                stdIndexArray.splice(ii, 3);
                //used.push(verticesToHide[vi1]); used.push(verticesToHide[vi2]); used.push(verticesToHide[vi3]);
                len -= 3;
                ii -= 3;
            }
        }
        /*for (var u = 0; u < verticesToHide.length; u++)
        {
            if (used.indexOf(verticesToHide[u]) === -1)
            {
                console.warn("NOT USED", verticesToHide[u], "at", u);
            }
        }*/

        // Write new index buffer
        var is32bit = this.attachementsMeta.geometryOriginal.attributes.index.is32bit;
        var newIndexBuffer = new DataSerializer(stdIndexArray.length, (is32bit === true ? DataSerializer.ArrayType.Uint32 : DataSerializer.ArrayType.Uint16));
        for (var ii=0, len=stdIndexArray.length; ii<len; ++ii)
        {
            if (!is32bit)
                newIndexBuffer.writeU16(stdIndexArray[ii]);
            else
                newIndexBuffer.writeU32(stdIndexArray[ii]);
        }

        //console.debug(this.meshAsset.name, (performance.now()-t) + " msec", stdIndexArray.length, "diff", (preLen-stdIndexArray.length));

        // Set new index buffer and mark it needs to be rebinded/created
        this.attachementsMeta.geometry.attributes.index.array = newIndexBuffer.array;

        // Rewrite drawcalls as we now have less indexes
        this.attachementsMeta.geometry.drawcalls = [];
        this.attachementsMeta.geometry.addDrawCall(0, newIndexBuffer.array.length);
        this.attachementsMeta.geometry.offsets = this.attachementsMeta.geometry.drawcalls; // stupid three.js legacy linking

        // Remove old submesh
        var parent = firstSubmesh.parent;
        parent.remove(firstSubmesh);

        // Create new submesh with geometry
        this.attachementsMeta.submesh = new THREE.SkinnedMesh(this.attachementsMeta.geometry, firstSubmesh.material, firstSubmesh.useVertexTexture);
        this.meshAsset.mesh.add(this.attachementsMeta.submesh);

        // Bind to skeleton
        this.attachementsMeta.submesh.bind(this.skeletonAsset.skeleton);
        this.skeletonAsset.skeleton.pose();
    },

    detachAttachements : function()
    {
        for (var i = 0; i < this.attachements.length; i++)
            this.attachements[i].detach();
    },

    resetMesh : function()
    {
        this.detachAttachements();

        if (this.meshAsset != null)
        {
            var placeable = this.parentEntity.getComponent("Placeable");
            if (placeable != null && placeable.sceneNode != null)
                placeable.sceneNode.remove(this.meshAsset.mesh);

            // Meshes are instantiated per object/usage so its safe to unload this instance here.
            this.meshAsset.unload();
        }
        this.meshAsset = null;
        this.meshRequested = false;
        this._loadsEmitted.mesh = false;
    },

    resetMaterials : function()
    {
        // Reset all materials back to default material
        if (this.meshAsset != null)
            this.meshAsset.resetMaterials();

        // We cannot unload the material asset as they are not loaded per object/usage.
        // If we unload here, all the other meshes that use this material will break.
        for (var i=0; i<this.materialAssets.length; i++)
        {
            var material = this.materialAssets[i];
            if (material != null && typeof material.unload === "function")
                material.unload();
            material = null;
        }
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
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onMeshLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onMeshLoaded, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded", context, callback);
    },

    /**
        Registers a callback for when a new skeleton has been loaded.
        @example
            ent.mesh.onSkeletonLoaded(null, function(parentEntity, meshComponent, asset) {
                console.log("Skeleton loaded", asset.name);
            });

        @method onSkeletonLoaded
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onSkeletonLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onSkeletonLoaded, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".SkeletonLoaded", context, callback);
    },

    /**
        Registers a callback for when a new material has been loaded.
        Material dependency textures are guaranteed to be loaded when fired.
        @example
            ent.mesh.onMaterialLoaded(null, function(parentEntity, meshComponent, index, asset) {
                console.log("Material loaded", asset.name, "to index", index);
            });

        @method onMaterialLoaded
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onMaterialLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onMaterialLoaded, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialLoaded", context, callback);
    },

    /**
        Registers a callback for when a all materials has been loaded. This may fire multiple times if materials are changed during runtime.
        Material dependency textures are guaranteed to be loaded when fired.

        @example
            ent.mesh.onMaterialsLoaded(null, function(parentEntity, meshComponent) {
                console.log("Materials loaded to", parentEntity.name);
            });

        @method onMaterialsLoaded
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onMaterialsLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onMaterialsLoaded, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialsLoaded", context, callback);
    },

    onAnimationsLoaded: function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onAnimationsLoaded, parent entity not set!");
            return null;
        }

        return Tundra.events.subscribe("EC_Mesh." + this.parentEntity.id + "." + this.id + ".AnimationsLoaded", context, callback);
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

        if (this.meshAsset.mesh.parent && this._loadsEmitted.mesh === false)
        {
            this._loadsEmitted.mesh = true;
            Tundra.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MeshLoaded", this.parentEntity, this, this.meshAsset);
        }

        if (this.meshAsset.providesAnimations === true)
            Tundra.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".AnimationsLoaded", this.parentEntity, this, this.meshAsset);
    },

    _skeletonAssetLoaded : function (asset, metadata)
    {
        if (!this.hasParentEntity())
            return;

        this.skeletonAsset = asset;
        this.update();

        Tundra.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".SkeletonLoaded", this.parentEntity, this, this.skeletonAsset);

        if (this.skeletonAsset.providesAnimations === true)
            Tundra.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".AnimationsLoaded", this.parentEntity, this, this.skeletonAsset);
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
                Tundra.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialLoaded", this.parentEntity, this, i, material);
        }

        Tundra.events.send("EC_Mesh." + this.parentEntity.id + "." + this.id + ".MaterialsLoaded", this.parentEntity, this);
    },

    _materialAssetFailed : function(transfer, reason, index)
    {
        this._materialAssetLoaded(Tundra.renderer.materialLoadError, index);
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
    },

    /**
        Sets attachemets for this mesh instance.

        @method setAttachements
        @return {Number}
    */
    setAttachements : function(attachements)
    {
        if (this.attachements.length > 0)
            this.detachAttachements();

        if (!Array.isArray(attachements))
        {
            this.attachements = [];
            return;
        }
        this.attachements = attachements;

        // Attach now if assets are loaded
        if (this.meshAsset != null && (this.skeletonRef === "" || this.skeletonAsset != null))
            this.attachAttachements();
    }
});

return EC_Mesh_ThreeJs;

}); // require js
