
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/data/DataDeserializer",
        "plugins/ogre-plugin/ogre/OgreMesh",
        "plugins/ogre-plugin/ogre/OgreSubMesh",
        "plugins/ogre-plugin/ogre/OgreVertexData",
        "plugins/ogre-plugin/ogre/OgreVertexElement",
        "plugins/ogre-plugin/ogre/OgreVertexBoneAssignment"
    ], function(Class, Tundra, DataDeserializer,
                OgreMesh, OgreSubMesh, OgreVertexData, OgreVertexElement, OgreVertexBoneAssignment) {

var OgreMeshSerializer = Class.$extend(
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
            "[MeshSerializer_v1.8]",
            "[MeshSerializer_v1.41]"
        ],

        isSupportedVersion : function(version)
        {
            for (var i = 0; i < OgreMeshSerializer.supportedVersions.length; i++)
                if (OgreMeshSerializer.supportedVersions[i] === version)
                    return true;
            return false;
        },

        chunk :
        {
            HEADER                      : 0x1000,
            HEADER_ENDIAN_FLIP          : 0x0010,

            MESH                        : 0x3000,

            SUBMESH                     : 0x4000,
            SUBMESH_OPERATION           : 0x4010,
            SUBMESH_BONE_ASSIGNMENT     : 0x4100,
            SUBMESH_TEXTURE_ALIAS       : 0x4200,

            GEOMETRY                    : 0x5000,
            GEOMETRY_VERTEX_DECLARATION : 0x5100,
            GEOMETRY_VERTEX_ELEMENT     : 0x5110,
            GEOMETRY_VERTEX_BUFFER      : 0x5200,
            GEOMETRY_VERTEX_BUFFER_DATA : 0x5210,

            MESH_SKELETON_LINK          : 0x6000,
            MESH_BONE_ASSIGNMENT        : 0x7000,
            MESH_LOD                    : 0x8000,
            MESH_LOD_USAGE              : 0x8100,
            MESH_LOD_MANUAL             : 0x8110,
            MESH_LOD_GENERATED          : 0x8120,
            MESH_BOUNDS                 : 0x9000,

            SUBMESH_NAME_TABLE          : 0xA000,
            SUBMESH_NAME_TABLE_ELEMENT  : 0xA100,

            EDGE_LISTS                  : 0xB000,
            EDGE_LIST_LOD               : 0xB100,
            EDGE_GROUP                  : 0xB110
        },

        chunkIdToString : function(chunkId)
        {
            switch(chunkId)
            {
                case this.chunk.HEADER: return "HEADER";
                case this.chunk.HEADER_ENDIAN_FLIP: return "HEADER_ENDIAN_FLIP";
                case this.chunk.MESH: return "MESH";
                case this.chunk.SUBMESH: return "SUBMESH";
                case this.chunk.SUBMESH_OPERATION: return "SUBMESH_OPERATION";
                case this.chunk.SUBMESH_BONE_ASSIGNMENT: return "SUBMESH_BONE_ASSIGNMENT";
                case this.chunk.SUBMESH_TEXTURE_ALIAS: return "SUBMESH_TEXTURE_ALIAS";
                case this.chunk.GEOMETRY: return "GEOMETRY";
                case this.chunk.GEOMETRY_VERTEX_DECLARATION: return "GEOMETRY_VERTEX_DECLARATION";
                case this.chunk.GEOMETRY_VERTEX_ELEMENT: return "GEOMETRY_VERTEX_ELEMENT";
                case this.chunk.GEOMETRY_VERTEX_BUFFER: return "GEOMETRY_VERTEX_BUFFER";
                case this.chunk.GEOMETRY_VERTEX_BUFFER_DATA: return "GEOMETRY_VERTEX_BUFFER_DATA";
                case this.chunk.MESH_SKELETON_LINK: return "MESH_SKELETON_LINK";
                case this.chunk.MESH_BONE_ASSIGNMENT: return "MESH_BONE_ASSIGNMENT";
                case this.chunk.MESH_LOD: return "MESH_MESH_LOD";
                case this.chunk.MESH_LOD_USAGE: return "MESH_LOD_USAGE";
                case this.chunk.MESH_LOD_MANUAL: return "MESH_LOD_MANUAL";
                case this.chunk.MESH_LOD_GENERATED: return "MESH_LOD_GENERATED";
                case this.chunk.MESH_BOUNDS: return "MESH_BOUNDS";
                case this.chunk.SUBMESH_NAME_TABLE: return "SUBMESH_NAME_TABLE";
                case this.chunk.SUBMESH_NAME_TABLE_ELEMENT: return "SUBMESH_NAME_TABLE_ELEMENT";
                case this.chunk.EDGE_LISTS: return "EDGE_LISTS";
                case this.chunk.EDGE_LIST_LOD: return "EDGE_LIST_LOD";
                case this.chunk.EDGE_GROUP: return "EDGE_GROUP";
            }
            return "Unknown_Chunk_ID_" + chunkId;
        }
    },

    reset : function()
    {
        this.ds = null;
        this.version = "";
        this.ogreMesh = null;

        this.chunk =
        {
            id          : undefined,    // OgreMeshSerializer.chunk[id]
            len         : undefined,    // Lenght of the whole data block, including id and len.
            lenLeft     : undefined,    // Lenght left after id and len has been read.
            size        : 2 + 4         // Size of the id and len metadata: 2 byte id and 4 byte len.
        };

        if (this.logging)
            this.time = new Date();
    },

    logError : function(msg)
    {
        Tundra.client.logError("[OgreMeshSerializer]: " + msg, true);
        return false;
    },

    logWarning : function(msg)
    {
        //Tundra.client.logWarning("[OgreMeshSerializer]: " + msg, true);
    },

    logChunk : function()
    {
        console.log(OgreMeshSerializer.chunkIdToString(this.chunk.id) + " len = " +  this.chunk.lenLeft
            + " bytesLeft = " + this.ds.bytesLeft());
    },

    importMesh : function(buffer, ogreMesh)
    {
        if (!(ogreMesh instanceof OgreMesh))
            return this.logError("importMesh(): 'ogreMesh' parameter is no of type OgreMesh");

        try
        {
            this.ds = new DataDeserializer(buffer);
            if (!this.readHeader())
                return false;

            this.ogreMesh = ogreMesh;
            if (!this.readMesh())
                return false;

            if (this.logging)
                console.log("  >> Mesh imported in "  + (new Date() - this.time) + " msec");
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

        if (this.logging && this.chunk.id !== OgreMeshSerializer.chunk.SUBMESH_BONE_ASSIGNMENT) this.logChunk();
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
        if (this.ds.readU16() !== OgreMeshSerializer.chunk.HEADER)
            return this.logError("readHeader(): First data chunk is not HEADER");

        // Version
        this.version = this.ds.readStringUntil('\0', 10);
        if (!OgreMeshSerializer.isSupportedVersion(this.version))
            return this.logError("Unsupported mesh version " + this.version);
        return true;
    },

    readMesh : function()
    {
        if (!this.readChunk())
            return false;

        if (this.chunk.id !== OgreMeshSerializer.chunk.MESH)
            return this.logError("readMesh(): MESH chunk cound not be found, instead found " + OgreMeshSerializer.chunkIdToString(this.chunk.id));

        // MESH chunk data
        var skeletalAnimated = this.ds.readBoolean();
        if (this.logging) console.log("    -- Skeletal animated:", skeletalAnimated);

        // Read child chunks
        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            switch(this.chunk.id)
            {
                case OgreMeshSerializer.chunk.GEOMETRY:
                {
                    this.ogreMesh.sharedVertexData = new OgreVertexData();
                    if (!this.readGeometry(this.ogreMesh.sharedVertexData))
                        return false;
                    break;
                }
                case OgreMeshSerializer.chunk.SUBMESH:
                {
                    if (!this.readSubmesh())
                        return false;
                    break;
                }
                case OgreMeshSerializer.chunk.MESH_BOUNDS:
                {
                    if (!this.readBoundsInfo())
                        return false;
                    break;
                }
                case OgreMeshSerializer.chunk.SUBMESH_NAME_TABLE:
                {
                    if (!this.readSubMeshNameTable())
                        return false;
                    break;
                }
                case OgreMeshSerializer.chunk.MESH_SKELETON_LINK:
                {
                    if (!this.readSkeletonLink())
                        return false;
                    break;
                }
                case OgreMeshSerializer.chunk.MESH_BONE_ASSIGNMENT:
                {
                    if (!this.readBoneAssignment(this.ogreMesh))
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

    readGeometry : function(vertexData)
    {
        vertexData.vertexCount = this.ds.readU32();
        if (this.logging) console.log("    -- Vertex count:", vertexData.vertexCount);

        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            if (this.chunk.id === OgreMeshSerializer.chunk.GEOMETRY_VERTEX_DECLARATION)
            {
                if (!this.readGeometryVertexDeclaration(vertexData))
                    return false;
            }
            else if (this.chunk.id === OgreMeshSerializer.chunk.GEOMETRY_VERTEX_BUFFER)
            {
                if (!this.readGeometryVertexBuffer(vertexData))
                    return false;
            }
            else
            {
                this.rewindChunk();
                break;
            }
        }
        return true;
    },

    readGeometryVertexDeclaration : function(vertexData)
    {
        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            if (this.chunk.id === OgreMeshSerializer.chunk.GEOMETRY_VERTEX_ELEMENT)
            {
                if (!this.readGeometryVertexElement(vertexData))
                    return false;
            }
            else
            {
                this.rewindChunk();
                break;
            }
        }
        return true;
    },

    readGeometryVertexElement : function(vertexData)
    {
        var element = new OgreVertexElement(this.ds.readU16(), this.ds.readU16(), this.ds.readU16(), this.ds.readU16(), this.ds.readU16());
        vertexData.vertexDeclaration.addElement(element);
        if (this.logging) console.log("    --", element);
        return true;
    },

    readGeometryVertexBuffer : function(vertexData)
    {
        var bufferMetadata =
        {
            bindIndex   : this.ds.readU16(),
            vertexSize  : this.ds.readU16()
        };

        if (this.logging) console.log("    --", bufferMetadata);

        if (!this.readChunk())
            return false;
        if (this.chunk.id !== OgreMeshSerializer.chunk.GEOMETRY_VERTEX_BUFFER_DATA)
            return this.logError("Failed to find vertex buffer data area GEOMETRY_VERTEX_BUFFER_DATA");
        if (vertexData.vertexDeclaration.getVertexSize(bufferMetadata.bindIndex) !== bufferMetadata.vertexSize)
            return this.logError("Buffer vertex size does not agree with vertex declaration: Vertex declaration " +
                vertexData.vertexDeclaration.getVertexSize(bufferMetadata.bindIndex) + " Vertex buffer metadata " + bufferMetadata.vertexSize);

        // This refs to the existing array with byteOffset and lenght set.
        vertexData.vertexBufferBinding.setBinding(bufferMetadata.bindIndex,
            this.ds.readUint8Array(vertexData.vertexCount * bufferMetadata.vertexSize));

        return true;
    },

    readSubmesh : function()
    {
        var submesh = new OgreSubMesh();

        submesh.index = this.ogreMesh.numSubmeshes();
        submesh.materialName = this.ds.readStringUntil('\0', 10);
        submesh.useSharedVertices = this.ds.readBoolean();

        submesh.indexData.indexCount = this.ds.readU32();
        submesh.indexData.is32bit = this.ds.readBoolean();

        if (submesh.indexData.indexCount > 0)
            submesh.indexData.readIndexBuffer(this.ds);

        if (!submesh.useSharedVertices)
        {
            if (!this.readChunk())
                return false;

            if (this.chunk.id !== OgreMeshSerializer.chunk.GEOMETRY)
                return this.logError("Missing geometry chunk for OgreSubmesh");

            submesh.vertexData = new OgreVertexData();
            if (!this.readGeometry(submesh.vertexData))
                return false;
        }

        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            if (this.chunk.id === OgreMeshSerializer.chunk.SUBMESH_OPERATION)
            {
                submesh.operationType = this.ds.readU16();
            }
            else if (this.chunk.id === OgreMeshSerializer.chunk.SUBMESH_BONE_ASSIGNMENT)
            {
                if (!this.readBoneAssignment(submesh))
                    return false;
            }
            else if (this.chunk.id === OgreMeshSerializer.chunk.SUBMESH_TEXTURE_ALIAS)
            {
                /// @todo Do we need to implement this?
                this.ds.skipBytes(this.chunk.lenLeft);
            }
            else
            {
                this.rewindChunk();
                break;
            }
        }

        this.ogreMesh.addSubmesh(submesh);
        return true;
    },

    readBoundsInfo : function()
    {
        this.ogreMesh.AABB.min.x = this.ds.readFloat32();
        this.ogreMesh.AABB.min.y = this.ds.readFloat32();
        this.ogreMesh.AABB.min.z = this.ds.readFloat32();

        this.ogreMesh.AABB.max.x = this.ds.readFloat32();
        this.ogreMesh.AABB.max.y = this.ds.readFloat32();
        this.ogreMesh.AABB.max.z = this.ds.readFloat32();

        this.ogreMesh.radius = this.ds.readFloat32();
        return true;
    },

    readSubMeshNameTable : function()
    {
        while (this.ds.bytesLeft() > 0)
        {
            if (!this.readChunk())
                return false;

            if (this.chunk.id === OgreMeshSerializer.chunk.SUBMESH_NAME_TABLE_ELEMENT)
            {
                var index = this.ds.readU16();
                var name = this.ds.readStringUntil('\0', 10);

                var submesh = this.ogreMesh.getSubmesh(index);
                if (submesh != null)
                    submesh.name = name;
                else
                    this.logWarning("Submesh name table had submesh index " + index + " that does not exist");
            }
            else
            {
                this.rewindChunk();
                break;
            }
        }
        return true;
    },

    readSkeletonLink : function()
    {
        var l = this.ds.bytesLeft();
        this.ogreMesh.skeletonName = this.ds.readStringUntil('\0', 10);
        if (this.logging) console.log("    -- Skeleton name:", this.ogreMesh.skeletonName, "read", (l-this.ds.bytesLeft()));
        return true;
    },

    readBoneAssignment : function(dest)
    {
        dest.addBoneAssignment(new OgreVertexBoneAssignment(this.ds.readU32(), this.ds.readU16(), this.ds.readFloat32()));
        return true;
    }
});

return OgreMeshSerializer;

}); // require js
