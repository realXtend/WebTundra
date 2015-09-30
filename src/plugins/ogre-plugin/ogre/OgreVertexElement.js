
define([
        "lib/classy",
    ], function(Class) {

var OgreVertexElement = Class.$extend(
{
    __init__ : function(source, type, semantic, offset, index)
    {
        this.source = source;
        this.type = type;
        this.semantic = semantic;
        this.offset = offset;
        this.index = index;

        this.typeName = OgreVertexElement.getTypeName(this.type);
        this.size = OgreVertexElement.getTypeSize(this.type);
        this.itemCount = OgreVertexElement.getTypeItemCount(this.type);
    },

    __classvars__ :
    {
        type :
        {
            FLOAT1 : 0,
            FLOAT2 : 1,
            FLOAT3 : 2,
            FLOAT4 : 3,
            COLOUR : 4,
            SHORT1 : 5,
            SHORT2 : 6,
            SHORT3 : 7,
            SHORT4 : 8,
            UBYTE4 : 9,
            COLOUR_ARGB : 10,
            COLOUR_ABGR : 11,
            DOUBLE1 : 12,
            DOUBLE2 : 13,
            DOUBLE3 : 14,
            DOUBLE4 : 15,
            USHORT1 : 16,
            USHORT2 : 17,
            USHORT3 : 18,
            USHORT4 : 19,
            INT1 : 20,
            INT2 : 21,
            INT3 : 22,
            INT4 : 23,
            UINT1 : 24,
            UINT2 : 25,
            UINT3 : 26,
            UINT4 : 27
        },

        semantic :
        {
            // Position, 3 reals per vertex
            POSITION : 1,
            // Blending weights
            BLEND_WEIGHTS : 2,
            // Blending indices
            BLEND_INDICES : 3,
            // Normal, 3 reals per vertex
            NORMAL : 4,
            // Diffuse colours
            DIFFUSE : 5,
            // Specular colours
            SPECULAR : 6,
            // Texture coordinates
            TEXTURE_COORDINATES : 7,
            // Binormal (Y axis if normal is Z)
            BINORMAL : 8,
            // Tangent (X axis if normal is Z)
            TANGENT : 9,
            // The  number of VertexElementSemantic elements (note - the first value POSITION is 1)
            COUNT : 9
        },

        getTypeName : function(type)
        {
            switch (type)
            {
                case OgreVertexElement.type.COLOUR: return "COLOUR";
                case OgreVertexElement.type.COLOUR_ABGR: return "COLOUR_ABGR";
                case OgreVertexElement.type.COLOUR_ARGB: return "COLOUR_ARGB";
                case OgreVertexElement.type.FLOAT1: return "FLOAT1";
                case OgreVertexElement.type.FLOAT2: return "FLOAT2";
                case OgreVertexElement.type.FLOAT3: return "FLOAT3";
                case OgreVertexElement.type.FLOAT4: return "FLOAT4";
                case OgreVertexElement.type.DOUBLE1: return "DOUBLE1";
                case OgreVertexElement.type.DOUBLE2: return "DOUBLE2";
                case OgreVertexElement.type.DOUBLE3: return "DOUBLE3";
                case OgreVertexElement.type.DOUBLE4: return "DOUBLE4";
                case OgreVertexElement.type.SHORT1: return "SHORT1";
                case OgreVertexElement.type.SHORT2: return "SHORT2";
                case OgreVertexElement.type.SHORT3: return "SHORT3";
                case OgreVertexElement.type.SHORT4: return "SHORT4";
                case OgreVertexElement.type.USHORT1: return "USHORT1";
                case OgreVertexElement.type.USHORT2: return "USHORT2";
                case OgreVertexElement.type.USHORT3: return "USHORT3";
                case OgreVertexElement.type.USHORT4: return "USHORT4";
                case OgreVertexElement.type.INT1: return "INT1";
                case OgreVertexElement.type.INT2: return "INT2";
                case OgreVertexElement.type.INT3: return "INT3";
                case OgreVertexElement.type.INT4: return "INT4";
                case OgreVertexElement.type.UINT1: return "UINT1";
                case OgreVertexElement.type.UINT2: return "UINT2";
                case OgreVertexElement.type.UINT3: return "UINT3";
                case OgreVertexElement.type.UINT4: return "UINT4";
                case OgreVertexElement.type.UBYTE4: return "UBYTE4";
            }
            return "Unknown";
        },

        getTypeSize : function(type)
        {
            switch (type)
            {
                case OgreVertexElement.type.COLOUR:
                case OgreVertexElement.type.COLOUR_ABGR:
                case OgreVertexElement.type.COLOUR_ARGB:
                    return 4;
                case OgreVertexElement.type.FLOAT1:
                    return 4;
                case OgreVertexElement.type.FLOAT2:
                    return 4*2;
                case OgreVertexElement.type.FLOAT3:
                    return 4*3;
                case OgreVertexElement.type.FLOAT4:
                    return 4*4;
                case OgreVertexElement.type.DOUBLE1:
                    return 8;
                case OgreVertexElement.type.DOUBLE2:
                    return 8*2;
                case OgreVertexElement.type.DOUBLE3:
                    return 8*3;
                case OgreVertexElement.type.DOUBLE4:
                    return 8*4;
                case OgreVertexElement.type.SHORT1:
                    return 2;
                case OgreVertexElement.type.SHORT2:
                    return 2*2;
                case OgreVertexElement.type.SHORT3:
                    return 2*3;
                case OgreVertexElement.type.SHORT4:
                    return 2*4;
                case OgreVertexElement.type.USHORT1:
                    return 2;
                case OgreVertexElement.type.USHORT2:
                    return 2*2;
                case OgreVertexElement.type.USHORT3:
                    return 2*3;
                case OgreVertexElement.type.USHORT4:
                    return 2*4;
                case OgreVertexElement.type.INT1:
                    return 4;
                case OgreVertexElement.type.INT2:
                    return 4*2;
                case OgreVertexElement.type.INT3:
                    return 4*3;
                case OgreVertexElement.type.INT4:
                    return 4*4;
                case OgreVertexElement.type.UINT1:
                    return 4;
                case OgreVertexElement.type.UINT2:
                    return 4*2;
                case OgreVertexElement.type.UINT3:
                    return 4*3;
                case OgreVertexElement.type.UINT4:
                    return 4*4;
                case OgreVertexElement.type.UBYTE4:
                    return 1*4;
            }
            return undefined;
        },

        getTypeItemCount : function(type)
        {
            switch (type)
            {
                case OgreVertexElement.type.COLOUR:
                case OgreVertexElement.type.COLOUR_ABGR:
                case OgreVertexElement.type.COLOUR_ARGB:
                    return 4;
                case OgreVertexElement.type.FLOAT1:
                case OgreVertexElement.type.DOUBLE1:
                case OgreVertexElement.type.SHORT1:
                case OgreVertexElement.type.USHORT1:
                case OgreVertexElement.type.INT1:
                case OgreVertexElement.type.UINT1:
                    return 1;
                case OgreVertexElement.type.FLOAT2:
                case OgreVertexElement.type.DOUBLE2:
                case OgreVertexElement.type.SHORT2:
                case OgreVertexElement.type.USHORT2:
                case OgreVertexElement.type.INT2:
                case OgreVertexElement.type.UINT2:
                    return 2;
                case OgreVertexElement.type.FLOAT3:
                case OgreVertexElement.type.DOUBLE3:
                case OgreVertexElement.type.SHORT3:
                case OgreVertexElement.type.USHORT3:
                case OgreVertexElement.type.INT3:
                case OgreVertexElement.type.UINT3:
                    return 3;
                case OgreVertexElement.type.FLOAT4:
                case OgreVertexElement.type.DOUBLE4:
                case OgreVertexElement.type.SHORT4:
                case OgreVertexElement.type.USHORT4:
                case OgreVertexElement.type.INT4:
                case OgreVertexElement.type.UINT4:
                    return 4;
                case OgreVertexElement.type.UBYTE4:
                    return 4;
            }
            return undefined;
        }
    },

    getTypeName : function()
    {
        return this.typeName;
    },

    getSize : function()
    {
        return this.size;
    },

    getItemCount : function()
    {
        return this.itemCount;
    }
});

return OgreVertexElement;

}); // require js
