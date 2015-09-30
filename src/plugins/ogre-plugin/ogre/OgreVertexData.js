
define([
        "lib/classy",
        "core/framework/Tundra",
        "plugins/ogre-plugin/ogre/OgreVertexDeclaration",
        "plugins/ogre-plugin/ogre/OgreVertexElement",
        "plugins/ogre-plugin/ogre/OgreVertexBufferBinding",
        "core/data/DataDeserializer"
    ], function(Class, Tundra,
                OgreVertexDeclaration,
                OgreVertexElement,
                OgreVertexBufferBinding,
                DataDeserializer) {

var OgreVertexData = Class.$extend(
{
    __init__ : function()
    {
        this.vertexStart = 0;
        this.vertexCount = undefined;

        this.vertexDeclaration = new OgreVertexDeclaration();
        this.vertexBufferBinding = new OgreVertexBufferBinding();
    },

    getElementItemCount : function(type, index)
    {
        var element = this.vertexDeclaration.getElement(type, index);
        if (element != null)
            return element.getItemCount();
        return -1;
    },

    getElementSize : function(type, index)
    {
        var element = this.vertexDeclaration.getElement(type, index);
        if (element != null)
            return element.getSize();
        return -1;
    },

    getUVType : function(index)
    {
        var element = this.vertexDeclaration.getElement(OgreVertexElement.semantic.TEXTURE_COORDINATES, index);
        if (element != null)
            return element.type;
        return undefined;
    },

    getUvSize : function(index)
    {
        var element = this.vertexDeclaration.getElement(OgreVertexElement.semantic.TEXTURE_COORDINATES, index);
        if (element != null)
            return element.getSize();
        return undefined;
    },

    getVertexDataArrays : function(maxUvLayerCount, logging)
    {
        if (maxUvLayerCount === undefined)
            maxUvLayerCount = Number.MAX_VALUE;
        if (logging === undefined)
            logging = false;

        var vertexData =
        {
            vertices : [],
            normals  : [],
            uvs      : [[]],

            hasUvLayer : function(index)
            {
                return (this.uvs[index] !== undefined && this.uvs[index].length > 0);
            },

            getUvLayer : function(index)
            {
                return this.uvs[index];
            },

            getUvCoord : function(index, vertexIndex)
            {
                if (this.uvs[index] !== undefined)
                    return this.uvs[index][vertexIndex];
                return undefined;
            },

            wrapUvRange : function(uvValue)
            {
                if (uvValue < 0.0)
                {
                    console.log("Correction", uvValue, "->", (1.0 - (Math.abs(uvValue) % 1.0)));
                    return 1.0 - (Math.abs(uvValue) % 1.0);
                }
                else if (uvValue > 1.0)
                {
                    console.log("Correction", uvValue, "->", (uvValue - 1.0));
                    return uvValue - 1.0;
                }
                return uvValue;
            }
        };

        for (var vbbi = 0; vbbi < this.vertexBufferBinding.numBindings(); ++vbbi)
        {
            var vertexBuffer = this.vertexBufferBinding.getBinding(vbbi);
            var vertexSize = this.vertexDeclaration.getVertexSize(vbbi);
            var orderedElements = this.vertexDeclaration.getElementsInOffsetOrder(vbbi);

            if (logging)
            {
                console.log("Iterating vertex buffer at binding index", vbbi)
                console.log(orderedElements);
            }

            var ds = new DataDeserializer(vertexBuffer.buffer, vertexBuffer.byteOffset, vertexBuffer.length);

            for (var vi=0; vi<this.vertexCount; ++vi)
            {
                for (var ei=0; ei<orderedElements.length; ++ei)
                {
                    var ok = false;
                    var element = orderedElements[ei];
                    //if (logging === true) console.log(element);
                    switch (element.semantic)
                    {
                        case OgreVertexElement.semantic.POSITION:
                        {
                            ok = this._readElement(ds, element.type, vertexData.vertices);
                            break;
                        }
                        case OgreVertexElement.semantic.NORMAL:
                        {
                            ok = this._readElement(ds, element.type, vertexData.normals);
                            break;
                        }
                        case OgreVertexElement.semantic.TEXTURE_COORDINATES:
                        {
                            if (element.index >= maxUvLayerCount)
                                break;

                            if (vertexData.uvs[element.index] === undefined)
                                vertexData.uvs[element.index] = [];

                            ok = this._readElement(ds, element.type, vertexData.uvs[element.index]);
                            break;
                        }
                    }
                    if (!ok)
                    {
                        //if (logging === true) console.log("   skip", element.typeName);
                        ds.skipBytes(element.getSize());
                    }
                }
            }
            //if (logging === true) console.log(" ");
        }

        return vertexData;
    },

    _readElement : function(ds, elementType, dest)
    {
        // SHORT
        if (elementType === OgreVertexElement.type.SHORT1 || elementType === OgreVertexElement.type.USHORT1)
            dest.push([ ds.readU16() ]);
        else if (elementType === OgreVertexElement.type.SHORT2 || elementType === OgreVertexElement.type.USHORT2)
            dest.push([ ds.readU16(), ds.readU16() ]);
        else if (elementType === OgreVertexElement.type.SHORT3 || elementType === OgreVertexElement.type.USHORT3)
            dest.push([ ds.readU16(), ds.readU16(), ds.readU16() ]);
        else if (elementType === OgreVertexElement.type.SHORT4 || elementType === OgreVertexElement.type.USHORT4)
            dest.push([ ds.readU16(), ds.readU16(), ds.readU16(), ds.readU16() ]);
        // INT
        else if (elementType === OgreVertexElement.type.INT1 || elementType === OgreVertexElement.type.UINT1)
            dest.push([ ds.readU32() ]);
        else if (elementType === OgreVertexElement.type.INT2 || elementType === OgreVertexElement.type.UINT2)
            dest.push([ ds.readU32(), ds.readU32() ]);
        else if (elementType === OgreVertexElement.type.INT3 || elementType === OgreVertexElement.type.UINT3)
            dest.push([ ds.readU32(), ds.readU32(), ds.readU32() ]);
        else if (elementType === OgreVertexElement.type.INT4 || elementType === OgreVertexElement.type.UINT4)
            dest.push([ ds.readU32(), ds.readU32(), ds.readU32(), ds.readU32() ]);
        // FLOAT
        else if (elementType === OgreVertexElement.type.FLOAT1)
            dest.push([ ds.readFloat32() ]);
        else if (elementType === OgreVertexElement.type.FLOAT2)
            dest.push([ ds.readFloat32(), ds.readFloat32() ]);
        else if (elementType === OgreVertexElement.type.FLOAT3)
            dest.push([ ds.readFloat32(), ds.readFloat32(), ds.readFloat32() ]);
        else if (elementType === OgreVertexElement.type.FLOAT4)
            dest.push([ ds.readFloat32(), ds.readFloat32(), ds.readFloat32(), ds.readFloat32() ]);
        // Double
        else if (elementType === OgreVertexElement.type.DOUBLE1)
            dest.push([ ds.readFloat64() ]);
        else if (elementType === OgreVertexElement.type.DOUBLE2)
            dest.push([ ds.readFloat64(), ds.readFloat64() ]);
        else if (elementType === OgreVertexElement.type.DOUBLE3)
            dest.push([ ds.readFloat64(), ds.readFloat64(), ds.readFloat64() ]);
        else if (elementType === OgreVertexElement.type.DOUBLE4)
            dest.push([ ds.readFloat64(), ds.readFloat64(), ds.readFloat64(), ds.readFloat64() ]);
        // 4 x byte
        else if (elementType === OgreVertexElement.type.UBYTE4)
            dest.push([ ds.readU8(), ds.readU8(), ds.readU8(), ds.readU8() ]);
        else
        {
            Tundra.client.logWarning("[OgreVertexData]: Reading element data of type " + elementType + " not supported!", true);
            return false;
        }
        return true;
    },

    getVertices : function()
    {
        var element = this.vertexDeclaration.getElement(OgreVertexElement.semantic.POSITION);
        if (element != null)
            return this.getElementList(element);
        return null;
    },

    getNormals : function()
    {
        var element = this.vertexDeclaration.getElement(OgreVertexElement.semantic.NORMAL);
        if (element != null)
            return this.getElementList(element);
        return null;
    },

    getElementList : function(element)
    {
        var bytesBefore = element.offset;
        var bytesAfter = this.vertexDeclaration.getVertexSize(0) - (bytesBefore + element.getSize());

        var vertexBuffer = this.vertexDeclaration.vertexBuffer;
        var ds = new DataDeserializer(vertexBuffer.buffer, vertexBuffer.byteOffset, vertexBuffer.length)
        var ret = [];

        while(ds.bytesLeft() > 0)
        {
            if (element.type === OgreVertexElement.type.FLOAT3)
            {
                ds.skipBytes(bytesBefore);
                ret.push([ds.readFloat32(), ds.readFloat32(), ds.readFloat32()]);
                ds.skipBytes(bytesAfter);
            }
        }
        return ret;
    }
});

return OgreVertexData;

}); // require js
