
define([
        "lib/classy",
        "core/framework/TundraSDK"
    ], function(Class, TundraSDK) {

/**
    Utility class to fill in JavaScript Arraybuffer data.

    @class DataSerializer
    @constructor
    @param {Number} numBytes Size of the destination array buffer.
    @param {DataSerializer.ArrayType} [arrayType=Uint8] Type of the underlying typed array.
*/
var DataSerializer = Class.$extend(
{
    __init__ : function(numBytes, arrayType)
    {
        if (typeof numBytes !== "number")
        {
            TundraSDK.framework.client.logWarning("[DataSerializer]: You are creating a data serializer with undefined size! Initializing size to 0 bytes.");
            numBytes = 0;
        }
        if (arrayType === undefined || arrayType === null || typeof arrayType !== "number")
            arrayType = DataSerializer.ArrayType.Uint8;

        if (arrayType === DataSerializer.ArrayType.Uint8)
            this.array = new Uint8Array(numBytes);
        else if (arrayType === DataSerializer.ArrayType.Uint16)
            this.array = new Uint16Array(numBytes);
        else if (arrayType === DataSerializer.ArrayType.Uint32)
            this.array = new Uint32Array(numBytes);
        else if (arrayType === DataSerializer.ArrayType.Float32)
            this.array = new Float32Array(numBytes);
        else if (arrayType === DataSerializer.ArrayType.Float64)
            this.array = new Float64Array(numBytes);
        else
        {
            TundraSDK.framework.client.logError("[DataSerializer]: Unknown 'arrayType' " + arrayType + ". Use on of the supported ones from DataSerializer.ArrayType");
            return;
        }

        this.data = new DataView(this.array.buffer);
        this.pos = 0;
    },

    __classvars__ :
    {
        ArrayType :
        {
            Uint8   : 0,
            Uint16  : 1,
            Uint32  : 2,
            Float32 : 3,
            Float64 : 4
        },

        /**
            Returns UTF8 byte size for a string.

            Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js
            @method utf8StringByteSize
            @param {String} str String to calculate.
            @return {Number} Number of bytes.
        */
        utf8StringByteSize : function(str)
        {
            var numBytes = 0;
            for (var i = 0, len = str.length; i < len; ++i)
                numBytes += DataSerializer.utf8CharCodeByteSize(str.charCodeAt(i));
            return numBytes;
        },

        /**
            Returns UTF8 byte size for a char code.

            Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js
            @method utf8CharCodeByteSize
            @param {Number} charCode Character code to calculate.
            @return {Number} Number of bytes.
        */
        utf8CharCodeByteSize : function(charCode)
        {
            if (charCode < 0x80)
                return 1;
            else if (charCode < 0x800)
                return 2;
            else if (charCode < 0x10000)
                return 3;
            else if (charCode < 0x200000)
                return 4;
            else if (charCode < 0x4000000)
                return 5;
            else
                return 6;
        },

        vleHeaderSizeBytes : function(value)
        {
            if (value < 128)
                return 1;
            else if (value < 16384)
                return 2;
            else
                return 4;
        }
    },

    /**
        Returns the destination array buffer.
        @method getBuffer
        @return {ArrayBuffer} Destination array buffer.
    */
    getBuffer : function()
    {
        return this.array.buffer;
    },

    /**
        Returns the currently written byte count.
        @method filledBytes
        @return {Number} Number of written bytes.
    */
    filledBytes : function()
    {
        return this.pos;
    },

    /**
        Returns how many bytes are left for writing new data.
        @method bytesLeft
        @return {Number} Number of bytes left for writing.
    */
    bytesLeft : function()
    {
        return (this.data.byteLength - this.pos);
    },

    skipBytes : function(numBytes)
    {
        this.pos += numBytes;
    },

    /**
        Writes boolean as u8, 0 if false, 1 otherwise.
        @method writeBoolean
        @param {Boolean} bool Write boolean.
    */
    writeBoolean : function(bool)
    {
        this.writeU8(bool === true ? 1 : 0);
    },

    /**
        Writes an Uint8Array.
        @method writeUint8Array
        @param {Uint8Array} buffer
    */
    writeUint8Array : function(buffer)
    {
        for (var i = 0, len = buffer.length; i < len; ++i)
            this.writeU8(buffer[i]);
    },

    /**
        Writes UTF8 bytes for given char code.

        Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js
        @method writeUtf8Char
        @param {Number} charCode Character code to write.
    */
    writeUtf8Char : function(charCode)
    {
        if (charCode < 0x80)
            this.writeU8(charCode);
        else if (charCode < 0x800)
        {
            this.writeU8(0xc0 | ((charCode >> 6) & 0x1f));
            this.writeU8(0x80 | (charCode & 0x3f));
        }
        else if (charCode < 0x10000)
        {
            this.writeU8(0xe0 | ((charCode >> 12) & 0xf));
            this.writeU8(0x80 | ((charCode >> 6) & 0x3f));
            this.writeU8(0x80 | (charCode & 0x3f));
        }
        else if (charCode < 0x200000)
        {
            this.writeU8(0xf0 | ((charCode >> 18) & 0x7));
            this.writeU8(0x80 | ((charCode >> 12) & 0x3f));
            this.writeU8(0x80 | ((charCode >> 6) & 0x3f));
            this.writeU8(0x80 | (charCode & 0x3f));
        }
        else if (charCode < 0x4000000)
        {
            this.writeU8(0xf8 | ((charCode >> 24) & 0x3));
            this.writeU8(0x80 | ((charCode >> 18) & 0x3f));
            this.writeU8(0x80 | ((charCode >> 12) & 0x3f));
            this.writeU8(0x80 | ((charCode >> 6) & 0x3f));
            this.writeU8(0x80 | (charCode & 0x3f));
        }
        else
        {
            this.writeU8(0xfc | ((charCode >> 30) & 0x1));
            this.writeU8(0x80 | ((charCode >> 24) & 0x3f));
            this.writeU8(0x80 | ((charCode >> 18) & 0x3f));
            this.writeU8(0x80 | ((charCode >> 12) & 0x3f));
            this.writeU8(0x80 | ((charCode >> 6) & 0x3f));
            this.writeU8(0x80 | (charCode & 0x3f));
        }
    },

    /**
        Writes a size header and UTF8 bytes for given string.

        Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js
        @method writeStringWithHeader
        @param {Number} headerSizeBytes Size of bytes for the header size, eg. 2 == U16 size header is written. Valid options: 1, 2, 4.
        @param {String} str String to write.
        @param {Boolean} utf8 If should write as UTF8 bytes.
    */
    writeStringWithHeader : function(headerSizeBytes, str, utf8)
    {
        /// @todo Implement not writing as UTF8.
        if (typeof utf8 !== "boolean")
            utf8 = false;

        // Leave room to write size header
        var sizePos = this.pos;
        this.pos += headerSizeBytes;

        // Calculate num bytes and write string
        var numBytes = 0;
        for (var i = 0, len = str.length; i < len; ++i)
        {
            var charCode = str.charCodeAt(i);
            numBytes += DataSerializer.utf8CharCodeByteSize(charCode);
            this.writeUtf8Char(charCode);
        }

        // Write size header
        var preHeaderPos = this.pos;
        this.pos = sizePos;
        if (headerSizeBytes == 1)
            this.writeU8(numBytes);
        else if (headerSizeBytes == 2)
            this.writeU16(numBytes);
        else if (headerSizeBytes == 4)
            this.writeU32(numBytes);
        this.pos = preHeaderPos;
    },

    /**
        Writes a string with a VLE header depending on the string lenght. Supports UTF8 strings.

        @method writeStringVLE
        @param {String} str String to write.
    */
    writeStringVLE : function(str, utf8)
    {
        this.writeStringWithHeader(DataSerializer.vleHeaderSizeBytes(str.length), str, utf8);
    },

    /**
        Write string with a u8 length header. Supports UTF8 strings.

        The input string has to have max length of u8, this won't be checked during runtime.
        @method writeStringU8
        @param {String} str String to write.
    */
    writeStringU8 : function(str, utf8)
    {
        this.writeStringWithHeader(1, str, utf8);
    },

    /**
        Write string with a u16 length header. Supports UTF8 strings.

        The input string has to have max length of u16, this won't be checked during runtime.
        @method writeStringU16
        @param {String} str String to write.
    */
    writeStringU16 : function(str, utf8)
    {
        this.writeStringWithHeader(2, str, utf8);
    },

    /**
        Write string with a u32 length header. Supports UTF8 strings.

        The input string has to have max length of u32, this won't be checked during runtime.
        @method writeStringU32
        @param {String} str String to write.
    */
    writeStringU32 : function(str, utf8)
    {
        this.writeStringWithHeader(4, str, utf8);
    },

    /**
        Writes s8.
        @method writeS8
        @param {byte} s8
    */
    writeS8 : function(s8)
    {
        this.data.setInt8(this.pos, s8);
        this.pos += 1;
    },

    /**
        Writes u8.
        @method writeU8
        @param {unsigned byte} u8
    */
    writeU8 : function(u8)
    {
        this.data.setUint8(this.pos, u8);
        this.pos += 1;
    },

    /**
        Writes s16.
        @method writeS16
        @param {short} s16
    */
    writeS16 : function(s16)
    {
        this.data.setInt16(this.pos, s16, true);
        this.pos += 2;
    },

    /**
        Writes u16.
        @method writeU16
        @param {unsigned short} u16
    */
    writeU16 : function(u16)
    {
        this.data.setUint16(this.pos, u16, true);
        this.pos += 2;
    },

    /**
        Writes s32.
        @method writeS32
        @param {long} s32
    */
    writeS32 : function(s32)
    {
        this.data.setInt32(this.pos, s32, true);
        this.pos += 4;
    },

    /**
        Writes u32.
        @method writeU32
        @param {unsigned long} u32
    */
    writeU32 : function(u32)
    {
        this.data.setUint32(this.pos, u32, true);
        this.pos += 4;
    },

    /**
        Writes f32.
        @method writeFloat32
        @param {float} f32
    */
    writeFloat32 : function(f32)
    {
        this.data.setFloat32(this.pos, f32, true);
        this.pos += 4;
    },

    /**
        Writes f64.
        @method writeFloat64
        @param {double} f64
    */
    writeFloat64 : function(f64)
    {
        this.data.setFloat64(this.pos, f64, true);
        this.pos += 8;
    },

    /**
        Writes VLE.
        @method writeVLE
        @param {Number} value Value to write as VLE.
    */
    writeVLE : function(value)
    {
        // Copied from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js
        if (value < 128)
            this.writeU8(value);
        else if (value < 16384)
        {
            this.writeU8((value & 127) | 128);
            this.writeU8(value >> 7);
        }
        else
        {
            this.writeU8((value & 127) | 128);
            this.writeU8(((value >> 7) & 127) | 128);
            this.writeU16(value >> 14);
        }
    },

    /**
        Writes bytes as bits.
        @method writeBits
        @param {Number} bytes How many bytes to write as bits.
        @return {BitArray} Read bits. See http://github.com/bramstein/bit-array
    */
    writeBits : function(bytes)
    {
        /*
        var bitIndex = 0;
        var bits = new BitArray(bytes*8, 0);
        for (var byteIndex=0; byteIndex<bytes; ++byteIndex)
        {
            var byte = this.readU8();
            for (var i=0; i<8; ++i)
            {
                var bit = (~~byte & 1 << i) > 0 ? 1 : 0;
                bits.set(bitIndex, bit);
                bitIndex++;
            }
        }
        return bits;
        */
    }
});

return DataSerializer;

}); // require js
