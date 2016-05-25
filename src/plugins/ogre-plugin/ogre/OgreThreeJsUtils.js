
define([
        "lib/three",
        "core/framework/Tundra",
        "plugins/ogre-plugin/ogre/OgreDefines",
        "plugins/ogre-plugin/ogre/OgreMesh",
        "plugins/ogre-plugin/ogre/OgreVertexElement",
        "plugins/ogre-plugin/ogre/OgreSkeleton",
        "plugins/ogre-plugin/ogre/OgreAnimation",
        "core/data/DataDeserializer",
        "core/data/DataSerializer"
    ], function(THREE, Tundra,
                OgreDefines, OgreMesh, OgreVertexElement, OgreSkeleton, OgreAnimation, DataDeserializer, DataSerializer) {

var OgreThreeJsUtils =
{
    MAX_UV_SETS        : 2,
    WRITTEN_INDEXES    : {},
    OLD_TO_NEW_INDEXES : {},

    logError : function(msg)
    {
        Tundra.client.logError("[OgreThreeJsUtils]: " + msg, true);
        return false;
    },

    logWarning : function(msg)
    {
        Tundra.client.logWarning("[OgreThreeJsUtils]: " + msg, true);
        return false;
    },

    convertOgreMesh : function(ogreMesh, parentThreeJsObject, logging)
    {
        if (logging === undefined || typeof logging !== "boolean")
            logging = false;
        if (!(ogreMesh instanceof OgreMesh))
            return this.logError("convertOgreMesh() 'ogreMesh' parameter is not of type OgreMesh");
        if (!(parentThreeJsObject instanceof THREE.Object3D))
            return this.logError("convertOgreMesh() 'parentThreeJsObject' parameter is not of type THREE.Object3D");

        try
        {
            var sharedVertexData = (ogreMesh.sharedVertexData !== null ? ogreMesh.sharedVertexData.getVertexDataArrays(this.MAX_UV_SETS, logging) : null);

            var numSubmeshes = ogreMesh.numSubmeshes();
            for (var iSubmesh = 0; iSubmesh < numSubmeshes; ++iSubmesh)
            {
                var ogreSubmesh = ogreMesh.getSubmesh(iSubmesh);
                if (!ogreSubmesh)
                    return this.logError("Failed to get submesh index " + iSubmesh);

                if (ogreSubmesh.operationType !== OgreDefines.RenderOperation.TRIANGLE_LIST)
                    return this.logError("Submesh operation type is not TRIANGLE_LIST.");

                var geometry = new THREE.BufferGeometry();
                if (ogreSubmesh.useSharedVertices)
                {
                    if (!this._convertGeometry(ogreMesh, ogreSubmesh, geometry, ogreSubmesh.indexData, ogreMesh.sharedVertexData, sharedVertexData))
                        return false;
                }
                else
                {
                    var vertexData = ogreSubmesh.vertexData.getVertexDataArrays(this.MAX_UV_SETS, logging);
                    if (!this._convertGeometry(ogreMesh, ogreSubmesh, geometry, ogreSubmesh.indexData, ogreSubmesh.vertexData, vertexData))
                        return false;
                }

                // Always calculate the bouding box/sphere. There seems to be bugs esp in the sphere.
                // @todo Look at this and see if center for sphere needs to be moved or similar.

                //geometry.boundingBox = new THREE.Box3();
                //geometry.boundingBox.min.set(ogreMesh.AABB.min.x, ogreMesh.AABB.min.y, ogreMesh.AABB.min.z);
                //geometry.boundingBox.max.set(ogreMesh.AABB.max.x, ogreMesh.AABB.max.y, ogreMesh.AABB.max.z);

                //geometry.boundingSphere = new THREE.Sphere();
                //geometry.boundingSphere.radius = ogreMesh.radius;

                geometry.computeBoundingBox();
                geometry.computeBoundingSphere();

                if (geometry.attributes["normal"] === undefined)
                    geometry.computeVertexNormals();

                var threejsSubmesh = null;
                if (geometry.attributes["skinIndex"] !== undefined && geometry.attributes["skinWeight"] !== undefined)
                    threejsSubmesh = new THREE.SkinnedMesh(geometry, Tundra.renderer.materialWhite, false);
                else
                    threejsSubmesh = new THREE.Mesh(geometry, Tundra.renderer.materialWhite);

                threejsSubmesh.name = parentThreeJsObject.name + "_submesh_" + ogreSubmesh.index;
                threejsSubmesh.tundraSubmeshIndex = ogreSubmesh.index;

                parentThreeJsObject.add(threejsSubmesh);

                // Reset state
                delete ogreSubmesh;
                delete geometry;
                delete threejsSubmesh;
                ogreSubmesh = undefined;
                geometry = undefined;
                threejsSubmesh = undefined;
            }

            return true;
        }
        catch(e)
        {
            if (e.stack !== undefined)
                console.error(e.stack);
            else
                console.error(e);
            return false;
        }
    },

    /** @todo ogreMesh not used for anything */
    _convertGeometry : function(ogreMesh, ogreSubmesh, geometry, ogreIndexData, ogreVertexData, vertexData)
    {
        // Setup source index buffer for reading
        var dsFaces = new DataDeserializer(ogreIndexData.indexBuffer.buffer, ogreIndexData.indexBuffer.byteOffset, ogreIndexData.indexBuffer.length);
        var face32bit = ogreIndexData.is32bit;
        var newFaces = [];

        var vertexIndex = -1;
        this.OLD_TO_NEW_INDEXES = {};

        // Read and reorder indices
        while(dsFaces.bytesLeft() > 0)
        {
            var face =
            {
                a : (face32bit ? dsFaces.readU32() : dsFaces.readU16()),
                b : (face32bit ? dsFaces.readU32() : dsFaces.readU16()),
                c : (face32bit ? dsFaces.readU32() : dsFaces.readU16())
            };

            var originalFace =
            {
                a : face.a,
                b : face.b,
                c : face.c
            };

            var existingVertexIndex = this.OLD_TO_NEW_INDEXES[face.a];
            if (existingVertexIndex === undefined)
            {
                this.OLD_TO_NEW_INDEXES[face.a] = (++vertexIndex);
                face.a = vertexIndex;
            }
            else
                face.a = existingVertexIndex;

            existingVertexIndex = this.OLD_TO_NEW_INDEXES[face.b];
            if (existingVertexIndex === undefined)
            {
                this.OLD_TO_NEW_INDEXES[face.b] = (++vertexIndex);
                face.b = vertexIndex;
            }
            else
                face.b = existingVertexIndex;

            existingVertexIndex = this.OLD_TO_NEW_INDEXES[face.c];
            if (existingVertexIndex === undefined)
            {
                this.OLD_TO_NEW_INDEXES[face.c] = (++vertexIndex);
                face.c = vertexIndex;
            }
            else
                face.c = existingVertexIndex;

            newFaces.push({
                "assigned" : face,
                "read"     : originalFace
            });
        }

        // Create buffers
        var newIndexCount  = Object.keys(this.OLD_TO_NEW_INDEXES).length;
        var newIndiceCount = newFaces.length * 3;

        // Determine item counts.
        var vertexPositionItemCount = ogreVertexData.getElementItemCount(OgreVertexElement.semantic.POSITION);
        var vertexNormalItemCount = ogreVertexData.getElementItemCount(OgreVertexElement.semantic.NORMAL);
        var vertexUV1ItemCount = ogreVertexData.getElementItemCount(OgreVertexElement.semantic.TEXTURE_COORDINATES, 0);
        var vertexUV2ItemCount = ogreVertexData.getElementItemCount(OgreVertexElement.semantic.TEXTURE_COORDINATES, 1);

        if (vertexUV1ItemCount > 2) vertexUV1ItemCount = 2;
        if (vertexUV2ItemCount > 2) vertexUV2ItemCount = 2;

        // Create destination WebGL buffer
        var dsIndexes  =
            new DataSerializer(newIndiceCount, (face32bit === true ? DataSerializer.ArrayType.Uint32 : DataSerializer.ArrayType.Uint16));
        var dsVertices = (vertexData.vertices.length > 0 ?
            new DataSerializer(newIndexCount * vertexPositionItemCount, DataSerializer.ArrayType.Float32) : null);
        var dsNormals  = (vertexData.normals.length > 0 ?
            new DataSerializer(newIndexCount * vertexNormalItemCount, DataSerializer.ArrayType.Float32) : null);
        var dsUVs      = (vertexData.hasUvLayer(0) === true ?
            new DataSerializer(newIndexCount * vertexUV1ItemCount, DataSerializer.ArrayType.Float32) : null);
        var dsUVs2     = (vertexData.hasUvLayer(1) === true ?
            new DataSerializer(newIndexCount * vertexUV2ItemCount, DataSerializer.ArrayType.Float32) : null);
        var dsSkinIndex  = (ogreSubmesh.numBoneAssignments() > 0 ?
            new DataSerializer(newIndexCount * 4, DataSerializer.ArrayType.Float32) : null);
        var dsSkinWeight = (ogreSubmesh.numBoneAssignments() > 0 ?
            new DataSerializer(newIndexCount * 4, DataSerializer.ArrayType.Float32) : null);

        // Fill buffers
        this.WRITTEN_INDEXES = {};

        for (var fi = 0; fi < newFaces.length; ++fi)
        {
            this._writeIndexToVertexBuffer(vertexData, newFaces[fi], dsIndexes, dsVertices, dsNormals, dsUVs, dsUVs2);
        }

        // Write bone assignments
        if (ogreSubmesh.numBoneAssignments() > 0)
        {
            for (var vi = 0; vi < newIndexCount; ++vi)
            {
                var newIndex = this.OLD_TO_NEW_INDEXES[vi];
                var indexOffset = newIndex * 16;

                var vertexBoneAssignments = ogreSubmesh.getBoneAssignmentsForVertexIndex(newIndex);

                // Remove 0 weight assingments if we have too many for three.js.
                // Seems three.js can handle up to 3 assignments per boneIndex.
                if (vertexBoneAssignments.length > 4)
                {
                    for (var splicei = 0; splicei < vertexBoneAssignments.length; splicei++)
                    {
                        if (vertexBoneAssignments[splicei].weight == 0.0)
                        {
                            vertexBoneAssignments.splice(splicei, 1);
                            if (vertexBoneAssignments.length <= 4)
                                break;
                        }
                    }
                }

                for (var vbai=0; vbai<4; ++vbai)
                {
                    if (vertexBoneAssignments.length > vbai)
                    {
                        dsSkinIndex.data.setFloat32(indexOffset + (4*vbai), vertexBoneAssignments[vbai].boneIndex, true);
                        dsSkinWeight.data.setFloat32(indexOffset + (4*vbai), vertexBoneAssignments[vbai].weight, true);
                    }
                    else
                        break;
                }
                dsSkinIndex.bytePos = indexOffset + 16;
            }
        }

        geometry.addGroup(0, newIndiceCount);

        if (dsIndexes != null)      { geometry.setIndex(new THREE.BufferAttribute(dsIndexes.array, 1));
                                      geometry.index.is32bit = face32bit;                                                      }
        if (dsVertices != null)     { geometry.addAttribute("position",     new THREE.BufferAttribute(dsVertices.array,   3)); }
        if (dsNormals != null)      { geometry.addAttribute("normal",       new THREE.BufferAttribute(dsNormals.array,    3)); }
        if (dsUVs != null)          { geometry.addAttribute("uv",           new THREE.BufferAttribute(dsUVs.array,        vertexUV1ItemCount)); }
        if (dsUVs2 != null)         { geometry.addAttribute("uv2",          new THREE.BufferAttribute(dsUVs2.array,       vertexUV2ItemCount)); }
        if (dsSkinWeight != null)   { geometry.addAttribute("skinWeight",   new THREE.BufferAttribute(dsSkinWeight.array, 4)); }
        if (dsSkinIndex != null)    { geometry.addAttribute("skinIndex",    new THREE.BufferAttribute(dsSkinIndex.array,  4)); }

        // This is a manual geometry load so we must increment three.js statistics manually.
        Tundra.renderer.renderer.info.memory.geometries++;

        // Reset state.
        this.WRITTEN_INDEXES = {};
        this.OLD_TO_NEW_INDEXES = {};
        delete newFaces;
        newFaces = undefined;

        return true;
    },

    _writeIndexToVertexBuffer : function(vertexData, faceData, dsIndexes, dsVertices, dsNormals, dsUVs, dsUVs2)
    {
        var vertexIndex = null;
        var vertexPosition = null;
        var vertexNormal = null;
        var vertexUvCoord = null;

        if (dsIndexes.type === DataSerializer.ArrayType.Uint16)
        {
            dsIndexes.writeU16(faceData.assigned.a);
            dsIndexes.writeU16(faceData.assigned.b);
            dsIndexes.writeU16(faceData.assigned.c);
        }
        else
        {
            dsIndexes.writeU32(faceData.assigned.a);
            dsIndexes.writeU32(faceData.assigned.b);
            dsIndexes.writeU32(faceData.assigned.c);
        }

        var srcData = (faceData.read !== undefined ? faceData.read : faceData.assigned);
        for (var i=0; i<3; ++i)
        {
            vertexIndex = (i === 0 ? srcData.a : (i === 1 ? srcData.b : srcData.c));

            if (this.WRITTEN_INDEXES[vertexIndex] !== undefined)
                continue;
            this.WRITTEN_INDEXES[vertexIndex] = true;

            if (dsVertices != null)
            {
                vertexPosition = vertexData.vertices[vertexIndex];
                dsVertices.writeFloat32(vertexPosition[0]);
                dsVertices.writeFloat32(vertexPosition[1]);
                dsVertices.writeFloat32(vertexPosition[2]);
            }

            if (dsNormals != null)
            {
                vertexNormal = vertexData.normals[vertexIndex];
                dsNormals.writeFloat32(vertexNormal[0]);
                dsNormals.writeFloat32(vertexNormal[1]);
                dsNormals.writeFloat32(vertexNormal[2]);
            }

            if (dsUVs != null)
            {
                vertexUvCoord = vertexData.getUvCoord(0, vertexIndex);
                dsUVs.writeFloat32(vertexUvCoord[0]);
                dsUVs.writeFloat32(vertexUvCoord[1]);
                //dsUVs.writeFloat32(vertexData.wrapUvRange(vertexUvCoord[0]));
                //dsUVs.writeFloat32(vertexData.wrapUvRange(vertexUvCoord[1]));
            }

            if (dsUVs2 != null)
            {
                vertexUvCoord = vertexData.getUvCoord(1, vertexIndex);
                dsUVs2.writeFloat32(vertexUvCoord[0]);
                dsUVs2.writeFloat32(vertexUvCoord[1]);
                //dsUVs2.writeFloat32(vertexData.wrapUvRange(vertexUvCoord[0]));
                //dsUVs2.writeFloat32(vertexData.wrapUvRange(vertexUvCoord[1]));
            }
        }
    },

    convertOgreAnimation : function(ogreSkeleton, ogreAnimation, animation, logging)
    {
        if (logging === undefined || typeof logging !== "boolean")
            logging = false;
        if (!(ogreSkeleton instanceof OgreSkeleton))
            return this.logError("convertOgreAnimation() 'ogreSkeleton' parameter is not of type OgreSkeleton");
        if (ogreSkeleton.name === undefined)
            return this.logError("convertOgreAnimation() 'ogreSkeleton' parameter needs to have a unique 'name' property!");
        if (!(ogreAnimation instanceof OgreAnimation))
            return this.logError("convertOgreAnimation() 'ogreAnimation' parameter is not of type OgreAnimation");
        if (typeof animation !== "object")
            return this.logError("convertOgreAnimation() 'animation' parameter is not of type 'object'");

        animation.name = ogreAnimation.name;
        animation.duration = ogreAnimation.length;
        animation.tracks = [];

        var bonesFlat = this.convertOgreBones(ogreSkeleton);
        //animation.bones = this.createThreeJsBoneHierarchy(animation.bonesFlat);

        if (logging) console.log(animation.name);
        if (logging) console.log("  >> Tracks: " + ogreAnimation.tracks.length);

        var nameRegex = /\(|\)/g;

        for (var i = 0; i < ogreAnimation.tracks.length; ++i)
        {
            var ogreTrack = ogreAnimation.tracks[i];

            // three.js does not like parans in the names (internal regex borks)
            var boneName = ogreTrack.bone.name.replace(nameRegex, "_");
            if (logging) console.log("    >> " + boneName);

            var positionKeys = [];
            var quaternionKeys = [];
            var times = [];

            if (logging) console.log("      >> Keyframes: " + ogreTrack.keyFrames.length);
            for (var k = 0; k < ogreTrack.keyFrames.length; k++)
            {
                var ogreKeyframe = ogreTrack.keyFrames[k];

                var posArray = ogreKeyframe.toArray("position", true);
                positionKeys.push(posArray[0], posArray[1], posArray[2]);
                var quat = this.quaternionFromObject(ogreKeyframe.quaternion);
                quat.multiplyQuaternions(this.quaternionFromObject(ogreKeyframe.bone.quaternion), quat);

                quaternionKeys.push(
                    quat.x,
                    quat.y,
                    quat.z,
                    quat.w
                );

                times.push(ogreKeyframe.time);
            }

            animation.tracks.push(new THREE.VectorKeyframeTrack("undefined.bones[" + boneName + "].position", times, positionKeys));
            animation.tracks.push(new THREE.QuaternionKeyframeTrack("undefined.bones[" + boneName + "].quaternion", times, quaternionKeys));
        }
        return true;
    },

    convertOgreBones : function(ogreSkeleton)
    {
        var nameRegex = /\(|\)/g;

        var bones = [];
        for (var i = 0; i < ogreSkeleton.bonesFlat.length; i++)
        {
            var src = ogreSkeleton.bonesFlat[i];

            // three.js does not like parans in the names (internal regex borks)
            var name = src.name.replace(nameRegex, "_");
            var nameParent = (src.parent != null ? src.parent.name.replace(nameRegex, "_") : "")

            var bone = new THREE.Bone();
            bone.sourceBoneId = src.id;
            bone.name = name;
            bone.parentName = nameParent;

            this.copyObjectToVector3(bone.position, src.position);
            this.copyObjectToQuaternion(bone.quaternion, src.quaternion);
            bone.originalPosition = bone.position.clone();
            bone.originalQuaternion = bone.quaternion.clone();

            bones.push(bone);
        }
        return bones;
    },

    createThreeJsBoneHierarchy : function(bonesFlat)
    {
        var hierarchied = [];
        var createHierarchy__getBone = function(boneName, parentCandidates)
        {
            var bone = null;
            for (var i = 0; i < parentCandidates.length; i++)
            {
                if (parentCandidates[i].name === boneName)
                    bone = parentCandidates[i];
                else if (parentCandidates[i].children != null && parentCandidates[i].children.length > 0)
                    bone = createHierarchy__getBone(boneName, parentCandidates[i].children);
                if (bone != null)
                    break;
            }
            return bone;
        };

        var createHierarchy_getBone = function(boneName)
        {
            var bone = null;
            for (var i = 0; i < bonesFlat.length; i++)
            {
                if (bonesFlat[i].name === boneName)
                    bone = bonesFlat[i];
                else if (bonesFlat[i].children != null && bonesFlat[i].children.length > 0)
                    bone = createHierarchy__getBone(boneName, bonesFlat[i].children);
                if (bone != null)
                    break;
            }
            return bone;
        };

        for (var i = 0; i < bonesFlat.length; i++)
        {
            var bone = bonesFlat[i];
            var parent = createHierarchy_getBone(bone.parentName);
            if (bone != null && parent != null)
                parent.add(bone);
            else
                hierarchied.push(bone);
        }
        return hierarchied;
    },

    copyObjectToVector3 : function(dest, src)
    {
        dest.set(src.x, src.y, src.z);
    },

    copyObjectToQuaternion : function(dest, src)
    {
        dest.set(src.x, src.y, src.z, src.w);
    },

    quaternionFromObject : function(src)
    {
        return new THREE.Quaternion(src.x, src.y, src.z, src.w);
    },

    loadOgreAnimations : function(ogreSkeleton, logging)
    {
        var animationHierarchy = {};
        for (var i = 0; i < ogreSkeleton.animationsFlat.length; i++)
        {
            var threeJsAnimation = {};
            if (!OgreThreeJsUtils.convertOgreAnimation(ogreSkeleton, ogreSkeleton.animationsFlat[i], threeJsAnimation, logging))
                return [];
            animationHierarchy[threeJsAnimation.name] = new THREE.AnimationClip(threeJsAnimation.name, threeJsAnimation.duration, threeJsAnimation.tracks);
        }
        return animationHierarchy;
    }
};

return OgreThreeJsUtils;

}); // require js
