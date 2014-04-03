
define([
        "lib/classy",
        "lib/bitarray"
    ], function(Class, BitArray) {

/**
    Utility class to parse JavaScript Arraybuffer data.

    @class DataDeserializer
    @constructor
    @param {ArrayBuffer} buffer Source data buffer.
    @param {Number} pos Data position to proceed reading from.
*/
var DataDeserializer = Class.$extend(
{
    __init__ : function(buffer, pos, length)
    {
        if (buffer !== undefined)
            this.setBuffer(buffer, pos, length);
    },

    __classvars__ :
    {
        /**
            Reads a byte from bits.
            @static
            @method readByteFromBits
            @param {BitArray} bits Source bits. See {{#crossLink "DataDeserializer/readBits:method"}}readBits(){{/crossLink}}.
            @param {Number} pos Position to start reading the byte.
            @return {Number} Read byte.
        */
        readByteFromBits : function(bits, bitIndex)
        {
            var byte = 0;
            for (var bi=0; bi<8; ++bi)
            {
                var bit = bits.get(bitIndex+bi);
                if (bit === 1)
                    byte |= (1 << bi);
                else
                    byte &= ~(1 << bi);
            }
            return byte;
        }
    },

    /**
        Set new data source and position.
        @method setBuffer
        @param {ArrayBuffer} buffer Source data buffer.
        @param {Number} pos Data position to proceed reading from.
    */
    setBuffer : function(buffer, pos, length)
    {
        // Firefox DataView does not correctly support length as 'undefined'
        if (length === undefined)
            this.data = new DataView(buffer, pos);
        else
            this.data = new DataView(buffer, pos, length);
        this.pos = 0;
    },

    /**
        Read bytes as a new buffer.
        @method readUint8Array
        @param {Number} numBytes Number of bytes to read.
        @return {Uint8Array} Read buffer.
    */
    readUint8Array : function(numBytes)
    {
        //var buffer = this.data.buffer.subarray(this.pos, numBytes);
        var buffer = new Uint8Array(this.data.buffer, this.pos, numBytes);
        this.pos += numBytes;
        return buffer;
    },

    /**
        Returns the currently read bytes.
        @method readBytes
        @return {Number} Number of read bytes.
    */
    readBytes : function()
    {
        return this.pos;
    },

    /**
        Returns how many bytes are left.
        @method bytesLeft
        @return {Number} Number of bytes left.
    */
    bytesLeft : function()
    {
        return (this.data.byteLength - this.pos);
    },

    /**
        Skips bytes. Use negative numBytes to go backwards.
        @method skipBytes
        @param {Number} numBytes Number of bytes to skip.
    */
    skipBytes : function(numBytes)
    {
        this.pos += numBytes;
    },

    /**
        Reads a u8 and returns true if >0, otherwise false.
        @method readBoolean
        @return {Boolean} Read boolean.
    */
    readBoolean : function()
    {
        return (this.readU8() > 0 ? true : false);
    },

    // Make this work but don't document to encourage use.
    readBool : function()
    {
        return this.readBoolean();
    },

    /**
        Reads a single UTF8 code point aka char code in JavaScript.

        Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataDeserializer.js
        @method readUtf8CharCode
        @return {Number} Char code of the character.
    */
    readUtf8CharCode : function()
    {
        var char1 = this.readU8();
        if (char1 < 0x80)
        {
            return char1;
        }
        else if (char1 < 0xe0)
        {
            var char2 = this.readU8();
            return (char2 & 0x3f) | ((char1 & 0x1f) << 6);
        }
        else if (char1 < 0xf0)
        {
            var char2 = this.readU8();
            var char3 = this.readU8();
            return (char3 & 0x3f) | ((char2 & 0x3f) << 6) | ((char1 & 0xf) << 12);
        }
        else if (char1 < 0xf8)
        {
            var char2 = this.readU8();
            var char3 = this.readU8();
            var char4 = this.readU8();
            return (char4 & 0x3f) | ((char3 & 0x3f) << 6) | ((char2 & 0x3f) << 12) | ((char1 & 0x7) << 18);
        }
        else if (char1 < 0xfc) {
            var char2 = this.readU8();
            var char3 = this.readU8();
            var char4 = this.readU8();
            var char5 = this.readU8();
            return (char5 & 0x3f) | ((char4 & 0x3f) << 6) | ((char3 & 0x3f) << 12) | ((char2 & 0x3f) << 18) | ((char1 & 0x3) << 24);
        }
        else
        {
            var char2 = this.readU8();
            var char3 = this.readU8();
            var char4 = this.readU8();
            var char5 = this.readU8();
            var char6 = this.readU8();
            return (char6 & 0x3f) | ((char5 & 0x3f) << 6) | ((char4 & 0x3f) << 12) | ((char3 & 0x3f) << 18) | ((char2 & 0x3f) << 24) | ((char1 & 0x1) << 30);
        }
    },

    /**
        Reads string bytes and convert to string with String.fromCharCode()
        until delimStr or delimCharCode is encountered.

        This function is useful for reading null or newline terminated strings.
        Pass delimStr as '\n' or delimCharCode as 10 for null terminated string.
        @method readStringUntil
        @param {String} delimStr String delimiter.
        @param {Number} delimCharCode Charcode delimiter.
        @return {String} Read string.
    */
    readStringUntil : function(delimStr, delimCharCode)
    {
        var str = "";
        while(this.bytesLeft() > 0)
        {
            var charCode = this.readU8();
            var c = String.fromCharCode(charCode);
            if (delimCharCode !== undefined && charCode === delimCharCode)
                break;
            else if (delimStr !== undefined && c === delimStr)
                break;
            str += c;
        }
        return str;
    },

    /**
        Reads string with lenght.
        @method readString
        @param {Number} length String length.
        @return {String} Read string.
    */
    readString : function(length, utf8)
    {
        if (typeof utf8 !== "boolean")
            utf8 = false;

        var str = "";
        if (length > 0)
        {
            var endPos = this.pos + length;
            while (this.pos < endPos)
            {
                if (utf8)
                    str += String.fromCharCode(this.readUtf8CharCode(endPos - this.pos));
                else
                    str += String.fromCharCode(this.readU8());
            }
        }
        return str;
    },

    /**
        Reads u8 lenght string.
        @method readStringU8
        @return {String} Read string.
    */
    readStringU8 : function(utf8)
    {
        return this.readString(this.readU8(), utf8);
    },

    /**
        Reads u16 lenght string.
        @method readStringU16
        @return {String} Read string.
    */
    readStringU16 : function(utf8)
    {
        return this.readString(this.readU16(), utf8);
    },

    /**
        Reads u32 lenght string.
        @method readStringU32
        @return {String} Read string.
    */
    readStringU32 : function(utf8)
    {
        return this.readString(this.readU32(), utf8);
    },

    /**
        Reads s8.
        @method readS8
        @return {byte} s8
    */
    readS8 : function()
    {
        var s8 = this.data.getInt8(this.pos);
        this.pos += 1;
        return s8;
    },

    /**
        Reads u8.
        @method readU8
        @return {unsigned byte} u8
    */
    readU8 : function()
    {
        var u8 = this.data.getUint8(this.pos);
        this.pos += 1;
        return u8;
    },

    /**
        Reads s16.
        @method readS16
        @return {short} s16
    */
    readS16 : function()
    {
        var s16 = this.data.getInt16(this.pos, true);
        this.pos += 2;
        return s16;
    },

    /**
        Reads u16.
        @method readU16
        @return {unsigned short} u16
    */
    readU16 : function()
    {
        var u16 = this.data.getUint16(this.pos, true);
        this.pos += 2;
        return u16;
    },

    /**
        Reads s32.
        @method readS32
        @return {long} s32
    */
    readS32 : function()
    {
        var s32 = this.data.getInt32(this.pos, true);
        this.pos += 4;
        return s32;
    },

    /**
        Reads u32.
        @method readU32
        @return {unsigned long} u32
    */
    readU32 : function()
    {
        var u32 = this.data.getUint32(this.pos, true);
        this.pos += 4;
        return u32;
    },

    /**
        Reads f32.
        @method readFloat32
        @return {float} f32
    */
    readFloat32 : function()
    {
        var f32 = this.data.getFloat32(this.pos, true);
        this.pos += 4;
        return f32;
    },

    /**
        Reads f64.
        @method readFloat64
        @return {double} f64
    */
    readFloat64 : function()
    {
        var f64 = this.data.getFloat64(this.pos, true);
        this.pos += 8;
        return f64;
    },

    /**
        Reads three f32 to a object { x : <f32>, y : <f32>, z : <f32> }.
        @method readFloat32Vector3
        @return {Object}
    */
    readFloat32Vector3 : function()
    {
        return {
            x : this.readFloat32(),
            y : this.readFloat32(),
            z : this.readFloat32()
        };
    },

    /**
        Reads four f32 to a object { x : <f32>, y : <f32>, z : <f32>, w : <f32> }.
        @method readFloat32Vector4
        @return {Object}
    */
    readFloat32Vector4 : function()
    {
        return {
            x : this.readFloat32(),
            y : this.readFloat32(),
            z : this.readFloat32(),
            w : this.readFloat32()
        };
    },

    /**
        Reads VLE.
        @method readVLE
        @return {Number} Read VLE value.
    */
    readVLE : function()
    {
        // Copied from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataDeserializer.js
        var low = this.readU8();
        if ((low & 128) == 0)
            return low;
        low = low & 127;
        var med = this.readU8();
        if ((med & 128) == 0)
            return low | (med << 7);
        med = med & 127;
        var high = this.readU16();
        return low | (med << 7) | (high << 14);
    },

    /**
        Reads bytes as bits.
        @method readBits
        @param {Number} bytes How many bytes to read as bits.
        @return {BitArray} Read bits. See http://github.com/bramstein/bit-array
    */
    readBits : function(bytes)
    {
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
    }
});

return DataDeserializer;

}); // require js
