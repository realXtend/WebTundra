
define([
        "lib/classy",
        "lib/three",
        "view/threejs/asset/AnimationProviderAsset",
        "plugins/ogre-plugin/ogre/OgreThreeJsUtils",
        "plugins/ogre-plugin/ogre/OgreSkeletonSerializer",
        "plugins/ogre-plugin/ogre/OgreSkeleton"
    ], function(Class, THREE, AnimationProviderAsset, OgreThreeJsUtils, OgreSkeletonSerializer, OgreSkeleton) {

"use strict";

var OgreSkeletonAsset = AnimationProviderAsset.$extend(
/** @lends OgreSkeletonAsset.prototype */
{
    /**
        Represents a Ogre rendering engine skeleton asset. This asset is processed and Three.js rendering engine skeleton/bones/animations are generated.
        @extends AnimationProviderAsset
        @constructs
        @param {String} name Unique name of the asset, usually this is the asset reference.
    */
    __init__ : function(name)
    {
        this.$super(name, "OgreSkeletonAsset", AnimationProviderAsset.Type.SkinnedMesh);

        /**
            For OgreSkeletonAsset this property is true. Meaning the skeleton is cloned for each callback so they <br>
            get a unique instance of the skeleton. Animations are however not cloned but shared among all instances.
            @property requiresCloning
            @type Boolean
        */
        this.requiresCloning = true;
        /**
            @property skin
            @type null|THREE.SkinnedMesh
        */
        this.skin = null;
        this.skeleton = null;
        /**
            Hierarchical list of THREE.Bone objects that belong to this skeleton. All non-parented root bones are <br>
            in this list, children can be recursively be searched from THREE.Bone.children.
            @property bones
            @type Array
        */
        this.bones = [];
        /**
            Flat list of all THREE.Bone objects that belong to this skeleton. These are same objects that can be found from 'bones'.
            @property bonesFlat
            @type Array
        */
        this.bonesFlat = [];
        /**
            Map of animation names (String) to animation data (Object) available in this skeleton.
            @property animationHierarchy
            @type Object
        */
        this.animationHierarchy = {};
        this.animationCache = {};
        /**
            Currently playing animation or null if none is playing.
            @property currentAnimation
            @type null|THREE.Animation
        */
        this.currentAnimation = null;
    },

    isLoaded : function()
    {
        return (Object.keys(this.animationHierarchy).length > 0);
    },

    unload : function()
    {
        // If this is the source of cloning dont unload it.
        // This would break the mesh if refs with it are added back during runtime.
        if (this.requiresCloning && this.isCloneSource)
            return;

        // Stop any running animations
        if (this.currentAnimation != null)
            this.currentAnimation.stop();

        // Detach bones
        for (var i = 0; i < this.bones.length; i++)
        {
            var boneParent = this.bones[i].parent;
            if (boneParent != null)
                boneParent.remove(this.bones[i]);
        }

        /* Skin is a reference to OgreMeshAsset. It will handle the submesh unload
           on its own time. Bones have been detached above and dont have any GPU resources.
           Just null out the refs here and let GC handle them. */
        this.skin = null;
        this.skeleton = null;
        this.bones = [];
        this.bonesFlat = [];
        this.animationHierarchy = {};
        this.animationCache = {};
    },

    /// IAsset override.
    _cloneImpl : function(newAssetName)
    {
        var skeletonAsset = new OgreSkeletonAsset(newAssetName);
        skeletonAsset.cloneFrom(this);
        return skeletonAsset;
    },

    /**
        Clones the content of passed in OgreSkeletonAsset to this object. Executes a unload before cloning.
        @param {OgreSkeletonAsset} ogreSkeletonAsset
    */
    cloneFrom : function(ogreSkeletonAsset)
    {
        if (!(ogreSkeletonAsset instanceof OgreSkeletonAsset))
        {
            this.log.error("OgreSkeletonAsset.cloneFrom can only clone from another OgreSkeletonAsset instance.");
            return;
        }

        this.unload();

        this.type = ogreSkeletonAsset.type;
        this.requiresCloning = ogreSkeletonAsset.requiresCloning;
        this.loaded = ogreSkeletonAsset.isLoaded();

        // Clone data
        this.bonesFlat = ogreSkeletonAsset.cloneBones();
        this.bones = this.createHierarchy(this.bonesFlat);
        this.animationHierarchy = ogreSkeletonAsset.animationHierarchy;
    },

    /**
        Returns if this skeleton asset is attached to a mesh.
        @return {Boolean}
    */
    isAttached : function()
    {
        return (this.skin != null);
    },

    /**
        Returns the skeleton parent.
        @return {THREE.Object3D|null}
    */
    getSkeletonParent : function()
    {
        return (this.isAttached() ? this.skin.mesh : null);
    },

    /**
        Returns the THREE.SkinnedMesh where bones are parented.
        @return {THREE.SkinnedMesh|null}
    */
    getBoneParent : function()
    {
        return (this.isAttached() ? this.skin.getSubmesh(0) : null);
    },

    /**
        @param {String} boneName
        @return {THREE.Bone}
    */
    getBone : function(boneName)
    {
        var bone = null;
        for (var i = 0; i < this.bones.length; i++)
        {
            if (this.bones[i].name === boneName)
                bone = this.bones[i];
            else if (this.bones[i].children != null && this.bones[i].children.length > 0)
                bone = this._getBone(boneName, this.bones[i].children);
            if (bone != null)
                break;
        }
        return bone;
    },

    _getBone : function(boneName, parentCandidates)
    {
        var bone = null;
        for (var i = 0; i < parentCandidates.length; i++)
        {
            if (parentCandidates[i].name === boneName)
                bone = parentCandidates[i];
            else if (parentCandidates[i].children != null && parentCandidates[i].children.length > 0)
                bone = this._getBone(boneName, parentCandidates[i].children);
            if (bone != null)
                break;
        }
        return bone;
    },

    /**
        Clone the bonesFlat property to a flat list that contains all bones from this skeleton and returns it.
        @return {Array}
    */
    cloneBones : function()
    {
        var bones = [];
        for (var i = 0; i < this.bonesFlat.length; i++)
        {
            var src = this.bonesFlat[i];

            var bone = new THREE.Bone();
            bone.sourceBoneId = src.sourceBoneId;
            bone.name = src.name;
            bone.parentName = (src.parent ? src.parent.name : "");

            bone.position.copy(src.originalPosition);
            bone.quaternion.copy(src.originalQuaternion);
            bone.originalPosition = src.originalPosition.clone();
            bone.originalQuaternion = src.originalQuaternion.clone();

            bones.push(bone);
        }
        return bones;
    },

    createHierarchy : function(bonesFlat)
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

    /**
        Attaches this skeleton to a OgreMeshAsset instance.
        Reserves this instance of OgreSkeletonAsset to the mesh.

        @param {OgreMeshAsset} meshAsset Mesh to attach this skeleton to.
    */
    attach : function(ogreMeshAsset)
    {
        if (this.isAttached())
        {
            if (this.skin.name !== ogreMeshAsset.name)
                this.log.warn("Skeleton already attached to", this.skin.name);
            return false;
        }
        if (!ogreMeshAsset.isLoaded())
        {
            this.log.error("Target mesh", ogreMeshAsset.name, "is not loaded");
            return false;
        }
        if (!ogreMeshAsset.canAttachSkeleton())
        {
            this.log.error("Target mesh", ogreMeshAsset.name, "does not have skeleton support");
            return false;
        }

        this.skin = ogreMeshAsset;

        // Attach root bone(s) to parent Object3D
        var skeletonParent = this.getSkeletonParent();
        for (var i = 0; i < this.bones.length; i++)
        {
            var bone = this.bones[i];
            skeletonParent.add(bone);
            bone.updateMatrix();
            bone.updateMatrixWorld(true);
        }
        // Create skeleton now that bones have been updated
        this.skeleton = new THREE.Skeleton(this.bonesFlat, undefined, false);

        return this.link(this.skin);
    },

    /**
        Links a mesh to this skeleton. attach must be called with the main mesh instance
        prior to this function.

        @param {OgreMeshAsset} meshAsset Mesh to link this skeleton to.
    */
    link : function (ogreMeshAsset)
    {
        if (!this.isAttached())
        {
            this.log.warn("link: Called before attach()", this.name);
            return false;
        }
        if (this.skeleton == null)
        {
            this.log.warn("link: Skeleton not ready", this.name);
            return false;
        }
        if (ogreMeshAsset.linkedSkeleton === this.name)
            return true;
        for (var smi=0, smilen=ogreMeshAsset.numSubmeshes(); smi<smilen; ++smi)
        {
            var skinSubmesh = ogreMeshAsset.getSubmesh(smi);
            if (!(skinSubmesh instanceof THREE.SkinnedMesh))
                continue;
            if (skinSubmesh.material == null)
            {
                this.log.warn("link: Submesh", smi, smi.name, "does not have material set");
                continue;
            }
            skinSubmesh.needsUpdate = true; /// @todo this seems to be deprecated?
            if (skinSubmesh.material.name.indexOf("tundra.MaterialLibrary") === -1)
            {
                skinSubmesh.material.skinning = true;
                skinSubmesh.material.needsUpdate = true;
            }
            skinSubmesh.bind(this.skeleton);
        }
        this.skeleton.pose();

        ogreMeshAsset.linkedSkeleton = this.name;
        return true;
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
        var ogreSkeleton = new OgreSkeleton(this.name);
        var serializer = new OgreSkeletonSerializer();
        var result = serializer.importSkeleton(buffer, ogreSkeleton);

        // Cleanup serializer
        serializer.reset();

        if (result === true)
        {
            this.animationHierarchy = OgreThreeJsUtils.loadOgreAnimations(ogreSkeleton, this.logging);
            if (Object.keys(this.animationHierarchy).length > 0)
            {
                this.bonesFlat = OgreThreeJsUtils.convertOgreBones(ogreSkeleton);
                this.bones = this.createHierarchy(this.bonesFlat);
            }
            else
                result = false;
        }
        return result;
    },

    deserializeFromXML : function(data)
    {
        this.log.error("Loading OgreSkeletonAsset from .mesh.xml is no longer supported. Use a binary skeleton instead.");
        return false;
        /*
        this.ogreAnimations = [];

        var skeletonElement = $(data).find("skeleton");
        var that = this;

        // Bones
        var bonesElement = skeletonElement.find("bones");
        var bones = bonesElement.find("bone");
        bones.each(function(index, valueOfElement) {
            that.parseBone(index, $(this), valueOfElement)
        });

        if (this.logging)
        {
            console.log("Bone count: " + this.bones.length);
            for (var i = 0; i < this.bones.length; i++)
                console.log("  >>", this.bones[i].id, this.bones[i].name);
        }

        // Bone hierarchy
        var bonehierarchyElement = skeletonElement.find("bonehierarchy");
        var parents = bonehierarchyElement.find("boneparent");
        parents.each(function(index, valueOfElement) {
            that.parseBoneHierarchy(index, $(this), valueOfElement)
        });

        if (this.logging) console.log("Bone count after parenting: " + this.bones.length);

        // Animations
        var animationsElement = skeletonElement.find("animations");
        var animations = animationsElement.find("animation");
        animations.each(function(index, valueOfElement) {
            that.parseAnimation(index, $(this), valueOfElement)
        });

        if (this.logging) console.log("Animations: " + this.ogreAnimations.length);

        if (this.bones.length === 0)
        {
            Tundra.client.logError("[OgreSkeletonAsset]: No bones found from skeleton", true);
            return false;
        }
        if (this.ogreAnimations.length === 0)
        {
            Tundra.client.logError("[OgreSkeletonAsset]: No animations found from skeleton", true);
            return false;
        }

        for (var i = 0; i < this.ogreAnimations.length; i++)
        {
            var animationData = this.toThreeJsAnimationData(this.ogreAnimations[i]);
            this.animationHierarchy[animationData.originalName] = animationData;
        }

        this.ogreAnimations = undefined;
        return true;
        */
    },

    parseAnimation : function(index, element, valueOfElement)
    {
        var that = this;

        // <animation>
        var animation = {};
        animation.name = element.attr("name");
        animation.length = parseFloat(element.attr("length"));
        animation.tracks = [];

        animation.parseTracks = function(index, element, valueOfElement)
        {
            // <track>
            var track = {};
            track.bone = that.getBone(element.attr("bone"));
            track.keyframes = [];

            track.parseKeyframe = function(index, element, valueOfElement)
            {
                // <keyframe>
                var keyframe = {};
                keyframe.time = parseFloat(element.attr("time"));

                var translateElement = element.find("translate");
                keyframe.pos =
                [
                    parseFloat(translateElement.attr("x")) + this.bone.position.x,
                    parseFloat(translateElement.attr("y")) + this.bone.position.y,
                    parseFloat(translateElement.attr("z")) + this.bone.position.z
                ];

                var rotation = element.find("rotate");
                var rotationAxis = rotation.find("axis");
                keyframe.rot = new THREE.Quaternion();
                keyframe.rot.setFromAxisAngle(new THREE.Vector3(
                    parseFloat(rotationAxis.attr("x")),
                    parseFloat(rotationAxis.attr("y")),
                    parseFloat(rotationAxis.attr("z"))),
                    parseFloat(rotation.attr("angle"))
                );
                keyframe.rot.multiplyQuaternions(this.bone.quaternion, keyframe.rot);

                keyframe.scl = [1, 1, 1];

                this.keyframes.push(keyframe);
            };

            // <keyframes>
            var keyframesElement = element.find("keyframes");
            var keyframes = element.find("keyframe");
            keyframes.each(function(index, valueOfElement) {
                track.parseKeyframe(index, $(this), valueOfElement)
            });

            animation.tracks.push(track);
        };

        // <tracks>
        var tracksElement = element.find("tracks");
        var tracks = element.find("track");
        tracks.each(function(index, valueOfElement) {
            animation.parseTracks(index, $(this), valueOfElement);
        });

        this.ogreAnimations.push(animation);
    },

    parseBone : function(index, element, valueOfElement)
    {
        var bone = new THREE.Bone(null);
        bone.id = parseInt(element.attr("id"));
        bone.name = element.attr("name");

        var position = element.find("position");
        bone.position.x = parseFloat(position.attr("x"));
        bone.position.y = parseFloat(position.attr("y"));
        bone.position.z = parseFloat(position.attr("z"));

        var rotation = element.find("rotation");
        var rotationAxis = rotation.find("axis");
        bone.quaternion.setFromAxisAngle(new THREE.Vector3(
            parseFloat(rotationAxis.attr("x")),
            parseFloat(rotationAxis.attr("y")),
            parseFloat(rotationAxis.attr("z"))),
            parseFloat(rotation.attr("angle"))
        );

        bone.originalPosition = bone.position.clone();
        bone.originalQuaternion = bone.quaternion.clone();

        this.bones.push(bone);
        this.bonesFlat.push(bone);
    },

    parseBoneHierarchy : function(index, element, valueOfElement)
    {
        var boneName = element.attr("bone");
        var parentName = element.attr("parent");

        var bone = this.getBone(boneName);
        var parent = this.getBone(parentName);
        if (bone == null || parent == null)
        {
            if (console.warn != null) console.warn("Bone", boneName, "or its parent", parentName, "cannot be found!");
            return;
        }
        if (bone.parent != null)
            if (console.warn != null) console.warn("Bone", bone.name, "already has parent!");

        parent.add(bone);

        // Remove bone from parented list as its now parented.
        // this.bonesFlat will still have the flat hierarchy.
        for (var i = 0; i < this.bones.length; i++)
        {
            if(this.bones[i].name === boneName)
            {
                this.bones.splice(i, 1);
                break;
            }
        }
    }
});

return OgreSkeletonAsset;

}); // require js
