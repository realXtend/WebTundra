
define([
        "lib/three",
        "core/framework/Tundra",
        "core/asset/IAsset",
        "plugins/ogre-plugin/ogre/OgreThreeJsUtils",
        "plugins/ogre-plugin/ogre/OgreMeshSerializer",
        "plugins/ogre-plugin/ogre/OgreMesh"
    ], function(THREE, Tundra, IAsset,
                OgreThreeJsUtils,
                OgreMeshSerializer,
                OgreMesh) {

/**
    Represents a Ogre rendering engine mesh asset. This asset is processed and Three.js rendering engine meshes are generated.
    @class OgreMeshAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var OgreMeshAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "OgreMeshAsset");

        this.requiresCloning = true;
        /**
            THREE.Object3D scene node where all the submeshes with the actual geometry are parented to.
            @property mesh
            @type THREE.Object3D
        */
        this.mesh = Tundra.renderer.createSceneNode();
        this.mesh.name = this.name;
    },

    isLoaded : function()
    {
        return (this.mesh !== undefined && this.mesh.children.length > 0);
    },

    resetMaterials : function()
    {
        for (var i = 0, numSubmeshes = this.numSubmeshes(); i < numSubmeshes; i++)
        {
            var submesh = this.getSubmesh(i);
            if (submesh != null)
            {
                submesh.material = Tundra.renderer.materialWhite;
                submesh.material.needsUpdate = true;
            }
        }
    },

    unload : function()
    {
        // If this is the source of cloning don't unload it.
        // This would break the mesh if refs with it are added back during runtime.
        if (this.requiresCloning && this.isCloneSource)
            return;

        var numSubmeshes = this.numSubmeshes();
        if (this.logging && this.mesh != null && numSubmeshes > 0)
            console.log("OgreMeshAsset unload", this.name);

        // isGeometryInUse is not working quite well enough yet.
        // Reset material from mesh to they can be unloaded from memory,
        // materials/textures have similar detection logic on unload is they are in use.
        for (var i = 0; i<numSubmeshes; ++i)
        {
            //if (this.logging) console.log("  submesh " + i);
            var submesh = this.getSubmesh(i);
            if (submesh != null && submesh.material != null)
                submesh.material = Tundra.renderer.materialWhite;
        }

        if (this.mesh != null && this.mesh.parent != null)
            this.mesh.parent.remove(this.mesh);

        /// @todo Geometry unload below

        /* @todo and @note to self: Geometry unloading is skipped as all instances share
           a single geometry. We should implement proper way of knowing which is the last clone
           (attempted in below isGeometryInUse) and unload the geometry. */
        return;

        for (var i = 0; i<numSubmeshes; ++i)
        {
            //if (this.logging) console.log("  submesh " + i);
            var submesh = this.getSubmesh(i);
            if (submesh != null && submesh.parent != null)
                submesh.parent.remove(submesh);

            if (submesh != null && submesh.geometry != null)
            {
                //if (this.logging) console.log("    geometry");
                if (!this.isGeometryInUse(submesh.geometry))
                {
                    if (this.logging)
                        console.log("OgreMeshAsset unload", this.name, i);
                    submesh.geometry.dispose();

                    // Clear CPU side array
                    if (typeof submesh.geometry.attributes === "object")
                    {
                        var attrNames = Object.keys(submesh.geometry.attributes);
                        for (var ai = 0; ai < attrNames.length; ai++)
                        {
                            var attribute = submesh.geometry.attributes[attrNames[ai]];
                            if (attribute && attribute.array !== undefined)
                                delete attribute.array;
                        }
                        delete submesh.geometry.attributes;
                    }

                    submesh.geometry = null;
                }
                else if (this.logging)
                    console.log("      Still in use, not unloading");
            }
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
        Tundra.renderer.scene.traverse(function(node) {
            // We are only interested in things that are using a geometry.
            if (used === true || node == null || node.geometry === undefined ||
                (!(node.geometry instanceof THREE.BufferGeometry) && !(node.geometry instanceof THREE.Geometry)))
                return;

            if (node.geometry.uuid === geom.uuid)
                used = true;
        });
        return used;
    },

    getSceneNode : function()
    {
        return (this.isLoaded() ? this.mesh : null);
    },

    getSubmesh : function(index)
    {
        return (this.isLoaded() ? this.mesh.children[index] : null);
    },

    numSubmeshes : function()
    {
        return (this.isLoaded() ? this.mesh.children.length : 0);
    },

    canAttachSkeleton : function()
    {
        if (this.numSubmeshes() === 0)
            return false;

        for (var i=0, len=this.numSubmeshes(); i<len; ++i)
        {
            if (!(this.getSubmesh(i) instanceof THREE.SkinnedMesh))
                return false;
        }
        return true;
    },

    /// IAsset override.
    _cloneImpl : function(newAssetName)
    {
        /* Clone the three.js Object3D so that they get their own transform etc.
           but don't clone the geometry, just reference to the existing geometry.
           The unloading mechanism will check when the geometry uuid is no longer used and
           is safe to unload. */

        var meshAsset = new OgreMeshAsset(newAssetName);
        for (var i=0, len=this.numSubmeshes(); i<len; ++i)
        {
            var existingSubmesh = this.getSubmesh(i);

            // Attachements are THREE.Object3D. Bones are THREE.Bone. Skip them on cloning.
            if (!(existingSubmesh instanceof THREE.Mesh) && !(existingSubmesh instanceof THREE.SkinnedMesh))
                continue;

            var clonedSubmesh = null;
            if (existingSubmesh instanceof THREE.SkinnedMesh)
                clonedSubmesh = new THREE.SkinnedMesh(existingSubmesh.geometry, Tundra.renderer.materialWhite, false);
            else
                clonedSubmesh = new THREE.Mesh(existingSubmesh.geometry, Tundra.renderer.materialWhite);

            clonedSubmesh.name = meshAsset.name + "_submesh_" + i;
            clonedSubmesh.tundraSubmeshIndex = existingSubmesh.tundraSubmeshIndex;

            meshAsset.mesh.add(clonedSubmesh);
        }
        return meshAsset;
    },

    /**
        Clones the content of passed in OgreMeshAsset to this object. Executes a unload before cloning.
        @method cloneFrom
        @param {OgreMeshAsset} ogreMeshAsset
    */
    cloneFrom : function(ogreMeshAsset)
    {
        if (!(ogreMeshAsset instanceof OgreMeshAsset))
        {
            consoloe.log("ERROR: OgreMeshAsset.clone can only clone from another OgreMeshAsset instance.");
            return;
        }

        this.unload();

        this.type = ogreMeshAsset.type;
        this.requiresCloning = ogreMeshAsset.requiresCloning;

        this.mesh = Tundra.renderer.createSceneNode();
        this.mesh.name = ogreMeshAsset.name;

        var numSubmeshes = ogreMeshAsset.numSubmeshes();
        for (var i=0; i<numSubmeshes; ++i)
        {
            var existingSubmesh = ogreMeshAsset.getSubmesh(i);

            // Attachements are THREE.Object3D. Bones are THREE.Bone. Skip them on cloning.
            if (!(existingSubmesh instanceof THREE.Mesh) && !(existingSubmesh instanceof THREE.SkinnedMesh))
                continue;

            var clonedSubmesh = null;
            if (existingSubmesh instanceof THREE.SkinnedMesh)
                clonedSubmesh = new THREE.SkinnedMesh(this.cloneGeometry(existingSubmesh.geometry), Tundra.renderer.materialWhite, false);
            else
                clonedSubmesh = new THREE.Mesh(this.cloneGeometry(existingSubmesh.geometry), Tundra.renderer.materialWhite);

            clonedSubmesh.name = this.mesh.name + "_submesh_" + i;
            clonedSubmesh.tundraSubmeshIndex = existingSubmesh.tundraSubmeshIndex;

            this.mesh.add(clonedSubmesh);
        }
    },

    /**
        Clones a new geometry from instance of THREE.Geometry or THREE.BufferGeometry

        @method cloneGeometry
        @param {THREE.Geometry|THREE.BufferGeometry} src
        @return {THREE.Geometry|THREE.BufferGeometry}
    */
    cloneGeometry : function(src)
    {
        if (!(src instanceof THREE.Geometry) && !(src instanceof THREE.BufferGeometry))
        {
            Tundra.client.logError("[OgreMeshAsset]: cloneGeometry() called with incorrect 'src', must be THREE.Geometry|THREE.BufferGeometry.");
            return null;
        }

        var geometry = src.clone();

        if (src instanceof THREE.Geometry)
        {
            var i = 0;

            // Second UV layer that is not cloned by THREE.Geometry.clone()
            if (src.faceVertexUvs.length > 1)
            {
                geometry.faceVertexUvs[1] = [];

                var uvs = src.faceVertexUvs[1];
                var uv  = [], uvCopy = [];
                for (i = 0, il = uvs.length; i < il; i++)
                {
                    uv = uvs[i];
                    uvCopy = [];
                    for (var j = 0, jl = uv.length; j < jl; j++)
                        uvCopy.push(new THREE.Vector2(uv[j].x, uv[j].y));
                    geometry.faceVertexUvs[1].push(uvCopy);
                }
            }

            // Skinning information that is not cloned by THREE.Geometry.clone()
            if (src.skinWeights.length > 0)
            {
                for (i = 0; i < src.skinWeights.length; i++)
                    geometry.skinWeights.push(src.skinWeights[i].clone());
            }
            if (src.skinIndices.length > 0)
            {
                for (i = 0; i < src.skinIndices.length; i++)
                    geometry.skinIndices.push(src.skinIndices[i].clone());
            }
        }

        return geometry;
    },

    deserializeFromData : function(data, dataType, transfer)
    {
        var result = false;
        if (dataType === "arraybuffer")
            result = this.deserializeFromBinary(data);
        else
            result = this.deserializeFromXML(data);
        return result;
    },

    deserializeFromBinary : function(buffer)
    {
        var ogreMesh = new OgreMesh();
        var serializer = new OgreMeshSerializer({ logging : this.logging });
        var result = serializer.importMesh(buffer, ogreMesh);

        // Cleanup serializer
        serializer.reset();
        delete serializer;
        serializer = undefined;

        if (result === true)
            result = OgreThreeJsUtils.convertOgreMesh(ogreMesh, this.mesh, this.logging);

        // Cleanup mesh
        delete ogreMesh;
        ogreMesh = undefined;

        return result;
    },

    deserializeFromXML : function(data)
    {
        /*
        <geometry|sharedgeometry vertexcount="11648">
            <vertexbuffer positions="true" normals="true" texture_coord_dimensions_0="float2" texture_coord_dimensions_1="float4" texture_coords="2">
                <vertex>
                    <position x="-20.3488" y="9.08731" z="-0.999669" />
                    <normal x="-0.156874" y="0.987611" z="-0.003852" />
                    <texcoord u="0.25549" v="0.499215" />
                    <texcoord u="0.987234" v="0.156921" w="0.0273071" x="1" />
                </vertex>
            </vertexbuffer>
        <submeshes>
            <submesh material="moonsurface" usesharedvertices="true" use32bitindexes="false" operationtype="triangle_list">
                <faces count="5760">
                    <face v1="0" v2="1" v3="2" />
        */

        if (this.logging) console.log(this.name);

        var that = this;
        var time = this.logging ? Date.now() : null;
        var timeStart = this.logging ? Date.now() : null;

        var metadata =
        {
            positions          : false,
            normals            : false,
            textureCoords      : false,
            textureCoordCount  : 0,
            textureCoordsTypes : [],
            vextexCount        : 0
        };

        var dataElement = $(data);

        var geometryElementIter = dataElement.find("sharedgeometry");
        if (geometryElementIter == null || geometryElementIter.length <= 0)
        {
            geometryElementIter = dataElement.find("geometry");
            if (geometryElementIter == null || geometryElementIter.length <= 0)
            {
                Tundra.client.logError("[OgreMeshAsset]: Failed to find <sharedgeometry> or <geometry> from mesh data", true);
                return false;
            }
            if (geometryElementIter.length > 1)
                if (console.warn != null) console.warn("OgreMeshAsset: Support incomplete for non sharedgeometry multi-submesh meshes. Only first submesh will be parsed correctly!");
        }
        metadata.vertexCount = parseInt(geometryElementIter.attr("vertexcount"));
        if (metadata.vertexCount == null || isNaN(metadata.vertexCount))
            metadata.vertexCount = 0;
        if (this.logging) console.log("  >> XML reported vertex count: " + (metadata.vertexCount > 0 ? metadata.vertexCount : "undefined"));

        // Read data
        var vertices = new Array(metadata.vertexCount);
        var normals = new Array(metadata.vertexCount);
        var uvs = [[]];
        var globalBoneAssignments = [];
        var vertexIndex = 0;
        var i = 0;

        /* @todo Support meshes that dont have sharedgeometry properly. Now only first submesh if parsed. Remove above warning in this case.
        geometryElementIter.each(function()
        {
            var geometryElement = $(this);
        }
        */

        // Iterate all vertex buffers
        var vertexBuffers = geometryElementIter.find("vertexbuffer");
        vertexBuffers.each(function()
        {
            var bufferMetadata =
            {
                positions     : false,
                normals       : false,
                textureCoords : false
            };

            var vertexBuffer = $(this);
            var texCoordAttrb = vertexBuffer.attr("texture_coords");

            // Check what this buffer contain
            bufferMetadata.positions = (vertexBuffer.attr("positions") === "true" ? true : false);
            bufferMetadata.normals = (vertexBuffer.attr("normals") === "true" ? true : false);
            bufferMetadata.textureCoords = (texCoordAttrb != null && typeof texCoordAttrb !== 'undefined' && texCoordAttrb !== false);

            // Update the object wide metadata.
            if (bufferMetadata.positions && !metadata.positions)
                metadata.positions = true;
            if (bufferMetadata.normals && !metadata.normals)
                metadata.normals = true;
            if (bufferMetadata.textureCoords)
            {
                if (!metadata.textureCoords)
                {
                    metadata.textureCoords = true;
                    metadata.textureCoordCount = parseInt(texCoordAttrb);

                    if (isNaN(metadata.textureCoordCount))
                        metadata.textureCoordCount = 0;
                    for (i = 0; i < metadata.textureCoordCount; ++i)
                    {
                        metadata.textureCoordsTypes.push(vertexBuffer.attr("texture_coord_dimensions_" + i));
                        uvs[i] = [];
                    }
                }
                else if (metadata.textureCoordCount != parseInt(texCoordAttrb))
                    if (console.warn != null) console.warn("Found different amount of texture coords in multiple vertex buffers!");
            }

            // Parse position, normal and uv information
            vertexIndex = 0;
            var vextexes = vertexBuffer.find("vertex");
            vextexes.each(function()
            {
                var vertexElement = $(this);
                if (bufferMetadata.positions)
                {
                    var position = vertexElement.find("position");
                    vertices[vertexIndex] = new THREE.Vector3(parseFloat(position.attr("x")), parseFloat(position.attr("y")), parseFloat(position.attr("z")));
                }
                if (bufferMetadata.normals)
                {
                    var position = vertexElement.find("normal");
                    normals[vertexIndex] = new THREE.Vector3(parseFloat(position.attr("x")), parseFloat(position.attr("y")), parseFloat(position.attr("z")));
                }
                if (bufferMetadata.textureCoords)
                {
                    var uvLayerIndex = 0;
                    var uvCoordElements = vertexElement.find("texcoord");
                    uvCoordElements.each(function()
                    {
                        /// @todo Check what we should do for "float4" type on three.js
                        //var type = metadata.textureCoordsTypes[uvLayerIndex]; == "float4"
                        var uvElement = $(this);
                        uvs[uvLayerIndex][vertexIndex] = new THREE.Vector2(parseFloat(uvElement.attr("u")), parseFloat(uvElement.attr("v")));
                        uvLayerIndex++;
                    });
                }
                vertexIndex++;
            });

            // Null out processing data to help GC
            bufferMetadata = null;
            vertexBuffer = null;
            texCoordAttrb = null;
            vextexes = null;
        });

        if (this.logging)
        {
            console.log("    >> Vertex buffers read");
            console.log("    >> Normals: " + normals.length + " Vertices: " + vertices.length + " UVs: " + metadata.textureCoordCount);
            console.log("    >> " + (Date.now() - time) + " msec"); time = Date.now();
        }

        // Find global bone assignments
        /// @todo Not properly supported yet, enable later.
        /*var globalBoneAssignmentsElement = dataElement.find("mesh > boneassignments");
        if (globalBoneAssignmentsElement != null || globalBoneAssignmentsElement.length > 0)
        {
            var globalVertexboneassignments = globalBoneAssignmentsElement.find("vertexboneassignment");
            globalVertexboneassignments.each(function()
            {
                globalBoneAssignments.push({
                    "vertexIndex" : parseInt($(this).attr("vertexindex")),
                    "boneIndex" : parseInt($(this).attr("boneindex")),
                    "weight" : parseFloat($(this).attr("weight"))
                });
            });
            globalVertexboneassignments = null;
        }*/

        // Iterate submeshes
        var submeshes = dataElement.find("submeshes");
        submeshes.find("submesh").each(function()
        {
            var submeshElement = $(this);

            var submeshGeometry = new THREE.Geometry();
            for (i=0; i<metadata.textureCoordCount; ++i)
                submeshGeometry.faceVertexUvs[i] = [];

            // Parse submesh bone assignments
            var boneAssignments = [];
            var submeshBoneAssignments = submeshElement.find("boneassignments");
            if (submeshBoneAssignments != null || submeshBoneAssignments.length > 0)
            {
                var vertexboneassignments = submeshBoneAssignments.find("vertexboneassignment");
                vertexboneassignments.each(function()
                {
                    boneAssignments.push({
                        "vertexIndex" : parseInt($(this).attr("vertexindex")),
                        "boneIndex" : parseInt($(this).attr("boneindex")),
                        "weight" : parseFloat($(this).attr("weight"))
                    });
                });
                vertexboneassignments = null;
            }
            submeshBoneAssignments = null;

            var facesElement = submeshElement.find("faces");

            if (that.logging)
            {
                console.log("  >> SUBMESH");
                console.log("    >> Face count: " + parseInt(facesElement.attr("count")));
                console.log("    >> " + (Date.now() - time) + " msec"); time = Date.now();
            }

            // Parse faces
            var oldToNewVertexIndex = {};
            vertexIndex = -1;
            facesElement.each(function()
            {
                var faceElements = $(this).find("face");
                faceElements.each(function()
                {
                    var faceElement = $(this);
                    var face = new THREE.Face3(parseInt(faceElement.attr("v1")), parseInt(faceElement.attr("v2")), parseInt(faceElement.attr("v3")));
                    var fi = submeshGeometry.faces.length;

                    // Copy the needed normals for this submesh.
                    // @note This needs to be done before positions for correct normals array access.
                    if (metadata.normals)
                    {
                        var vexterNormal1 = normals[face.a];
                        var vexterNormal2 = normals[face.b];
                        var vexterNormal3 = normals[face.c];

                        face.vertexNormals.push(vexterNormal1);
                        face.vertexNormals.push(vexterNormal2);
                        face.vertexNormals.push(vexterNormal3);

                        face.normal.x = (vexterNormal1.x + vexterNormal2.x + vexterNormal3.x) / 3.0;
                        face.normal.y = (vexterNormal1.y + vexterNormal2.y + vexterNormal3.y) / 3.0;
                        face.normal.z = (vexterNormal1.z + vexterNormal2.z + vexterNormal3.z) / 3.0;
                    }

                    // Copy the needed uv coords for this submesh
                    // @note This needs to be done before positions for correct uvs array access.
                    if (metadata.textureCoordCount > 0)
                    {
                        for (var iUV=0; iUV<metadata.textureCoordCount; ++iUV)
                        {
                            submeshGeometry.faceVertexUvs[iUV][fi] = [ uvs[iUV][face.a], uvs[iUV][face.b], uvs[iUV][face.c] ];
                        }
                    }

                    // Convert the vertex indexes to apply to this submesh vertices.
                    // We don't want to copy all of the meshes vertices to each submesh.
                    if (metadata.positions)
                    {
                        var existingVertexIndex = oldToNewVertexIndex[face.a];
                        if (existingVertexIndex == null)
                        {
                            submeshGeometry.vertices[++vertexIndex] = vertices[face.a];
                            oldToNewVertexIndex[face.a] = vertexIndex;
                            face.a = vertexIndex;
                        }
                        else
                            face.a = existingVertexIndex;

                        existingVertexIndex = oldToNewVertexIndex[face.b];
                        if (existingVertexIndex == null)
                        {
                            submeshGeometry.vertices[++vertexIndex] = vertices[face.b];
                            oldToNewVertexIndex[face.b] = vertexIndex;
                            face.b = vertexIndex;
                        }
                        else
                            face.b = existingVertexIndex;

                        existingVertexIndex = oldToNewVertexIndex[face.c];
                        if (existingVertexIndex == null)
                        {
                            submeshGeometry.vertices[++vertexIndex] = vertices[face.c];
                            oldToNewVertexIndex[face.c] = vertexIndex;
                            face.c = vertexIndex;
                        }
                        else
                            face.c = existingVertexIndex;
                    }

                    submeshGeometry.faces[fi] = face;

                    if (that.logging && fi > 0 && fi % 10000 === 0)
                    {
                        var timeNow = Date.now();
                        console.log("    >> Vertexes processed: " + fi + " in " + (timeNow - time) + " msec     - total " + (timeNow - timeStart) + " msec");
                        time = Date.now();
                    }
                });
                faceElements = null;
            });
            facesElement = null;

            if (that.logging) console.log("    >> Vertex count: " + submeshGeometry.vertices.length);

            /// @todo Handle bone assignments per submesh not from global bone assignments!?
            //if (boneAssignments.length <= 0 && globalBoneAssignments.length > 0)
            //    boneAssignments = globalBoneAssignments;
            if (boneAssignments.length > 0)
            {
                if (that.logging) console.log("    >> Total bone assignments: " + boneAssignments.length);

                submeshGeometry.skinWeights = new Array(submeshGeometry.vertices.length);
                submeshGeometry.skinIndices = new Array(submeshGeometry.vertices.length);
                for (i = 0; i < submeshGeometry.vertices.length; ++i)
                {
                    submeshGeometry.skinWeights[i] = null;
                    submeshGeometry.skinIndices[i] = null;
                }

                // Bone assignments
                var assigned = 0;
                for (i = 0; i < boneAssignments.length; ++i)
                {
                    var assignment = boneAssignments[i];

                    var newVertexIndex = oldToNewVertexIndex[assignment.vertexIndex];
                    if (newVertexIndex == null)
                    {
                        submeshGeometry.skinWeights[newVertexIndex] = null;
                        submeshGeometry.skinIndices[newVertexIndex] = null;
                        continue;
                    }

                    assigned++;
                    if (submeshGeometry.skinWeights[newVertexIndex] == null)
                    {
                        submeshGeometry.skinWeights[newVertexIndex] = new THREE.Vector4(assignment.weight, 0, 0, 0);
                        submeshGeometry.skinWeights[newVertexIndex].y = null;
                    }
                    else if (submeshGeometry.skinWeights[newVertexIndex].y == null)
                        submeshGeometry.skinWeights[newVertexIndex].y = assignment.weight;

                    if (submeshGeometry.skinIndices[newVertexIndex] == null)
                    {
                        submeshGeometry.skinIndices[newVertexIndex] = new THREE.Vector4(assignment.boneIndex, 0, 0, 0);
                        submeshGeometry.skinIndices[newVertexIndex].y = null;
                    }
                    else if (submeshGeometry.skinIndices[newVertexIndex].y == null)
                        submeshGeometry.skinIndices[newVertexIndex].y = assignment.boneIndex;
                }
                if (that.logging) console.log("    >> Bone assignments assigned: " + assigned);

                for (var i = 0; i < submeshGeometry.vertices.length; ++i)
                {
                    if (submeshGeometry.skinWeights[i] == null)
                        submeshGeometry.skinWeights[i] = new THREE.Vector4(0, 0, 0, 0);
                    else if (submeshGeometry.skinWeights[i].y == null)
                        submeshGeometry.skinWeights[i].y = 0;

                    if (submeshGeometry.skinIndices[i] == null)
                        submeshGeometry.skinIndices[i] = new THREE.Vector4(0, 0, 0, 0);
                    else if (submeshGeometry.skinIndices[i].y == null)
                        submeshGeometry.skinIndices[i].y = 0;
                }
            }

            submeshGeometry.uvsNeedUpdate = true;
            submeshGeometry.verticesNeedUpdate = true;
            submeshGeometry.elementsNeedUpdate = true;

            /// @todo Do we need these for manually created geometry?
            //submeshGeometry.computeCentroids();
            //submeshGeometry.computeFaceNormals();
            //submeshGeometry.computeVertexNormals();
            //submeshGeometry.computeTangents();

            // Create submesh instance
            var submesh = null;
            if (boneAssignments.length == 0)
                submesh = new THREE.Mesh(submeshGeometry, Tundra.renderer.materialWhite);
            else
                submesh = new THREE.SkinnedMesh(submeshGeometry, Tundra.renderer.materialWhite, false);

            submesh.name = that.mesh.name + "_submesh_" + that.numSubmeshes();
            submesh.tundraSubmeshIndex = that.numSubmeshes();

            // Parent to this assets node
            that.mesh.add(submesh);

            // Null out processing data to help GC
            submeshGeometry = null;
            submesh = null;
            submeshElement = null;
            boneAssignments = null;
            oldToNewVertexIndex = null;
            facesElement = null;
        });

        // Null out processing data to help GC
        vertices = null;
        normals = null;
        uvs = null;
        metadata = null;
        dataElement = null;
        geometryElementIter = null;
        vertexBuffers = null;
        submeshes = null;
        vertexIndex = null;

        if (this.logging)
        {
            console.log("OgreMeshAssset loaded with", this.numSubmeshes(), "submeshes");
            console.log("");
        }

        return true;
    }
});

return OgreMeshAsset;

}); // require js
