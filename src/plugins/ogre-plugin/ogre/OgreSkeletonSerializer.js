
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/data/DataDeserializer",
        "plugins/ogre-plugin/ogre/OgreSkeleton",
        "plugins/ogre-plugin/ogre/OgreBone",
        "plugins/ogre-plugin/ogre/OgreAnimation",
        "plugins/ogre-plugin/ogre/OgreAnimationTrack",
        "plugins/ogre-plugin/ogre/OgreTransformKeyFrame"
    ], function(Class, Tundra, DataDeserializer,
                OgreSkeleton, OgreBone, OgreAnimation,
                OgreAnimationTrack, OgreTransformKeyFrame) {

var OgreSkeletonSerializer = Class.$extend(
{
    __init__ : function(params)
    {
        if (params === undefined)
            params = {};

        this.logging = (params.logging === undefined ? false : params.logging);

        this.reset();
    },

    __classvars__ :
    {
        supportedVersions :
        [
            "[Serializer_v1.10]",
            "[Serializer_v1.80]"
        ],

        isSupportedVersion : function(version)
        {
            for (var i = 0; i < OgreSkeletonSerializer.supportedVersions.length; i++)
                if (OgreSkeletonSerializer.supportedVersions[i] === version)
                    return true;
            return false;
        },

        chunk :
        {
            HEADER                      : 0x1000,
            HEADER_ENDIAN_FLIP          : 0x0010,

            BLENDMODE                   : 0x1010,

            BONE                        : 0x2000,
            BONE_PARENT                 : 0x3000,

            ANIMATION                   : 0x4000,
            ANIMATION_BASEINFO          : 0x4010,
            ANIMATION_TRACK             : 0x4100,
            ANIMATION_TRACK_KEYFRAME    : 0x4110,
            ANIMATION_LINK              : 0x5000
        },

        chunkIdToString : function(chunkId)
        {
            switch(chunkId)
            {
                case this.chunk.HEADER: return "HEADER";
                case this.chunk.HEADER_ENDIAN_FLIP: return "HEADER_ENDIAN_FLIP";
                case this.chunk.BLENDMODE: return "BLENDMODE";
                case this.chunk.BONE: return "BONE";
                case this.chunk.BONE_PARENT: return "BONE_PARENT";
                case this.chunk.ANIMATION: return "ANIMATION";
                case this.chunk.ANIMATION_BASEINFO: return "ANIMATION_BASEINFO";
                case this.chunk.ANIMATION_TRACK: return "ANIMATION_TRACK";
                case this.chunk.ANIMATION_TRACK_KEYFRAME: return "ANIMATION_TRACK_KEYFRAME";
                case this.chunk.ANIMATION_LINK: return "ANIMATION_LINK";
            }
            return "Unknown_Chunk_ID_" + chunkId;
        },

        boneSizeWithoutScale     : 2 + 4*3 + 4*4,
        keyFrameSizeWithoutScale : 4 + 4*4 + 3*4
    },

    reset : function()
    {
        this.ds = null;
        this.version = "";
        this.ogreSkeleton = null;

        this.chunk =
        {
            id          : undefined,    // OgreSkeletonSerializer.chunk[id]
            len         : undefined,    // Lenght of the whole data block, including id and len.
            lenLeft     : undefined,    // Lenght left after id and len has been read.
            size        : 2 + 4         // Size of the id and len metadata: 2 byte id and 4 byte len.
        };

        if (this.logging)
            this.time = new Date();
    },

    logError : function(msg)
    {
        Tundra.client.logError("[OgreSkeletonSerializer]: " + msg, true);
        return false;
    },

    logWarning : function(msg)
    {
        //Tundra.client.logWarning("[OgreMeshSerializer]: " + msg, true);
    },

    logChunk : function()
    {
        console.log(OgreSkeletonSerializer.chunkIdToString(this.chunk.id) + " len = " +  this.chunk.lenLeft
            + " bytesLeft = " + this.ds.bytesLeft());
    },

    importSkeleton : function(buffer, ogreSkeleton)
    {
        if (!(ogreSkeleton instanceof OgreSkeleton))
            return this.logError("importMesh(): 'ogreSkeleton' parameter is no of type OgreSkeleton");

        try
        {
            this.ds = new DataDeserializer(buffer);
            if (!this.readHeader())
                return false;

            this.ogreSkeleton = ogreSkeleton;
            if (!this.readSkeleton())
                return false;

            if (this.logging)
                console.log("  >> Skeleton imported in "  + (new Date() - this.time) + " msec");
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

    readChunk : function()
    {
        if (this.ds.bytesLeft() < this.chunk.size)
            return this.logError("readChunk(): Not enough data to read next chunks metadata");

        this.chunk.id = this.ds.readU16();
        this.chunk.len = this.ds.readU32();
        this.chunk.lenLeft = this.chunk.len - this.chunk.size;

        if (this.logging && this.chunk.id !== OgreSkeletonSerializer.chunk.ANIMATION_TRACK_KEYFRAME) this.logChunk();
        return true;
    },

    rewindChunk : function()
    {
        if (this.logging) console.log("    -- Rewinding chunk");
        this.ds.skipBytes(-this.chunk.size);
    },

    readHeader : function()
    {
        // Header chunk id
        if (this.ds.readU16() !== OgreSkeletonSerializer.chunk.HEADER)
            return this.logError("readHeader(): First data chunk is not HEADER");

        // Version
        this.version = this.ds.readStringUntil('\0', 10);
        if (!OgreSkeletonSerializer.isSupportedVersion(this.version))
            return this.logError("Unsupported mesh version " + this.version);
        return true;
    },

    readSkeleton : function()
    {
        // Read child chunks
        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            switch(this.chunk.id)
            {
                case OgreSkeletonSerializer.chunk.BONE:
                {
                    if (!this.readBone())
                        return false;
                    break;
                }
                case OgreSkeletonSerializer.chunk.BONE_PARENT:
                {
                    if (!this.readBoneParent())
                        return false;
                    break;
                }
                case OgreSkeletonSerializer.chunk.ANIMATION:
                {
                    if (!this.readAnimation())
                        return false;
                    break;
                }
                default:
                {
                    this.ds.skipBytes(this.chunk.lenLeft);
                    break;
                }
            }
        }
        return true;
    },

    readBone : function()
    {
        var bone = new OgreBone(
            this.ds.readStringUntil('\0', 10),
            this.ds.readU16(),
            this.ds.readFloat32Vector3(),
            this.ds.readFloat32Vector4(),
            { x : 1, y : 1, z : 1 }
        );

        if (this.chunk.lenLeft > OgreSkeletonSerializer.boneSizeWithoutScale)
            bone.scale = this.ds.readFloat32Vector3();

        this.ogreSkeleton.addBone(bone);
        return true;
    },

    readBoneParent : function()
    {
        this.ogreSkeleton.parentBone(
            this.ds.readU16(),
            this.ds.readU16()
        );
        return true;
    },

    readAnimation : function()
    {
        var animation = new OgreAnimation(
            this.ds.readStringUntil('\0', 10),
            this.ds.readFloat32()
        );

        if (!this.readChunk())
            return false;

        // Optional baseinfo
        if (this.chunk.id === OgreSkeletonSerializer.chunk.ANIMATION_BASEINFO)
        {
            animation.baseKeyFrame = {
                name : this.ds.readString(),
                time : this.ds.readFloat32()
            };
        }
        else
            this.rewindChunk();

        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            if (this.chunk.id === OgreSkeletonSerializer.chunk.ANIMATION_TRACK)
            {
                if (!this.readAnimationTrack(animation))
                    return false;
            }
            else
            {
                this.rewindChunk();
                break;
            }
        }

        this.ogreSkeleton.addAnimation(animation);
        return true;
    },

    readAnimationTrack : function(animation)
    {
        var track = new OgreAnimationTrack(
            this.ogreSkeleton.getBone(this.ds.readU16())
        );

        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            if (this.chunk.id === OgreSkeletonSerializer.chunk.ANIMATION_TRACK_KEYFRAME)
            {
                if (!this.readKeyFrame(track))
                    return false;
            }
            else
            {
                this.rewindChunk();
                break;
            }
        }

        animation.addTrack(track);
        return true;
    },

    readKeyFrame : function(track)
    {
        var keyFrame = new OgreTransformKeyFrame(
            this.ds.readFloat32(),
            this.ds.readFloat32Vector4(),
            this.ds.readFloat32Vector3(),
            { x : 1, y : 1, z : 1 }
        );

        if (this.chunk.lenLeft > OgreSkeletonSerializer.keyFrameSizeWithoutScale)
            keyFrame.scale = this.ds.readFloat32Vector3();

        track.addKeyFrame(keyFrame);
        return true;
    }
});

return OgreSkeletonSerializer;

}); // require js
