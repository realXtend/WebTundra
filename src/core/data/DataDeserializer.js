
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
        },

        /** Utility dataview for reading non-bit aligned float data */
        floatReadData : new DataView(new ArrayBuffer(8))
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
        this.bitPos = 0;
    },

    /**
        Read bytes as a new buffer.
        @note Does not respect bit position
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
        Returns how many bits are left.
        @method bitsLeft
        @return {Number} Number of bits left.
    */
    bitsLeft : function()
    {
        return (this.data.byteLength - this.pos) * 8 - this.bitPos;
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
        Reads string with length.
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
        Reads u8 length string.
        @method readStringU8
        @return {String} Read string.
    */
    readStringU8 : function(utf8)
    {
        return this.readString(this.readU8(), utf8);
    },

    /**
        Reads u16 length string.
        @method readStringU16
        @return {String} Read string.
    */
    readStringU16 : function(utf8)
    {
        return this.readString(this.readU16(), utf8);
    },

    /**
        Reads u32 length string.
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
        if (this.bitPos == 0)
        {
            var s8 = this.data.getInt8(this.pos);
            this.pos += 1;
            return s8;
        }
        else
        {
            var s8 = this.readBits(8);
            if (s8 >= 0x80)
                s8 -= 0x100;
            return s8;
        }
    },

    /**
        Reads u8.
        @method readU8
        @return {unsigned byte} u8
    */
    readU8 : function()
    {
        if (this.bitPos == 0)
        {
            var u8 = this.data.getUint8(this.pos);
            this.pos += 1;
            return u8;
        }
        else
        {
            return this.readBits(8);
        }
    },

    /**
        Reads s16.
        @method readS16
        @return {short} s16
    */
    readS16 : function()
    {
        if (this.bitPos == 0)
        {
            var s16 = this.data.getInt16(this.pos, true);
            this.pos += 2;
            return s16;
        }
        else
        {
            var s16 = this.readBits(16);
            if (s16 >= 0x8000)
                s16 -= 0x10000;
            return s16;
        }
    },

    /**
        Reads u16.
        @method readU16
        @return {unsigned short} u16
    */
    readU16 : function()
    {
        if (this.bitPos == 0)
        {
            var u16 = this.data.getUint16(this.pos, true);
            this.pos += 2;
            return u16;
        }
        else
        {
            return this.readBits(16);
        }
    },

    /**
        Reads s32.
        @method readS32
        @return {long} s32
    */
    readS32 : function()
    {
        if (this.bitPos == 0)
        {
            var s32 = this.data.getInt32(this.pos, true);
            this.pos += 4;
            return s32;
        }
        else
        {
            var s32 = this.readBits(32);
            if (s32 >= 0x80000000)
                s32 -= 0x100000000;
            return s32;
        }
    },

    /**
        Reads u32.
        @method readU32
        @return {unsigned long} u32
    */
    readU32 : function()
    {
        if (this.bitPos == 0)
        {
            var u32 = this.data.getUint32(this.pos, true);
            this.pos += 4;
            return u32;
        }
        else
        {
            return this.readBits(32);
        }
    },

    /**
        Reads f32.
        @method readFloat32
        @return {float} f32
    */
    readFloat32 : function()
    {
        if (this.bitPos == 0)
        {
            var f32 = this.data.getFloat32(this.pos, true);
            this.pos += 4;
            return f32;
        }
        else
        {
            this.$class.floatReadData.setUint32(0, this.readBits(32), true);
            return this.$class.floatReadData.getFloat32(0, true);
        }
    },

    /**
        Reads f64.
        @method readFloat64
        @return {double} f64
    */
    readFloat64 : function()
    {
        if (this.bitPos == 0)
        {
            var f64 = this.data.getFloat64(this.pos, true);
            this.pos += 8;
            return f64;
        }
        else
        {
            this.$class.floatReadData.setUint32(0, this.readBits(32), true);
            this.$class.floatReadData.setUint32(4, this.readBits(32), true);
            return this.$class.floatReadData.getFloat64(0, true);
        }

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
        Reads a number of bits and returns an unsigned number value.
        @method readBits
        @param {Number} numBits Number of bits to read
        @return {Number} Read unsigned value.
    */
    readBits : function(numBits)
    {
        var ret = 0;
        var shift = 0;
        var currentByte = this.data.getUint8(this.pos);

        while (numBits > 0)
        {
            if (currentByte & (1 << this.bitPos))
                ret |= (1 << shift);

            shift++;
            numBits--;
            this.bitPos++;

            if (this.bitPos > 7)
            {
                this.bitPos = 0;
                this.pos++;
                if (numBits > 0)
                    currentByte = this.data.getUint8(this.pos);
            }
        }

        return ret;
    },

    /**
        Read one bit.
        @method readBit
        @return {Number} Read bit value (0/1)
    */
    readBit : function()
    {
        return this.readBits(1);
    },
    
    /**
        Reads bytes as bits to a BitArray.
        @method readBits
        @param {Number} bytes How many bytes to read as bits.
        @return {BitArray} Read bits. See http://github.com/bramstein/bit-array
    */
    readBitsToArray : function(bytes)
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
    },
    
    /**
        Reads 5 arithmetic encoded values.
        @method readArithmeticEncoded
        @param {Number} numBits How many bits to read
        @param {Number} max1 Maximum value of first value
        @param {Number} max2 Maximum value of second value
        @param {Number} max3 Maximum value of third value
        @param {Number} max4 Maximum value of fourth value
        @param {Number} max5 Maximum value of fifth value
        @return {Array} Values as array
     */
    readArithmeticEncoded : function(numBits, max1, max2, max3, max4, max5)
    {
        var val = this.readBits(numBits);
        var val5 = val % max5;
        val = Math.floor(val / max5);
        var val4 = val % max4;
        val = Math.floor(val / max4);
        var val3 = val % max3;
        val = Math.floor(val / max3);
        var val2 = val % max2;
        val = Math.floor(val / max2);
        var val1 = val % max1;
        val = Math.floor(val / max1);
        return [val1, val2, val3, val4, val5];
    },

    /** Reads a signed fixed point value.
        @method readSignedFixedPoint
        @param {Number} numIntegerBits Number of integer bits
        @param {Number} numDecimalBits Number of decimal bits
        @return {Number} Value
     */
    readSignedFixedPoint : function(numIntegerBits, numDecimalBits)
    {
        return this.readUnsignedFixedPoint(numIntegerBits, numDecimalBits) - (1 << (numIntegerBits-1));
    },

    /** Reads an unsigned fixed point value.
        @method readUnsignedFixedPoint
        @param {Number} numIntegerBits Number of integer bits
        @param {Number} numDecimalBits Number of decimal bits
        @return {Number} Value
     */
    readUnsignedFixedPoint : function(numIntegerBits, numDecimalBits)
    {
        var val = this.readBits(numIntegerBits + numDecimalBits);
        return val / (1 << numDecimalBits);
    },

    /** Reads a quantized float value.
        @method readQuantizedFloat
        @param {Number} minRange Minimum possible value
        @param {Number} maxRange Maximum possible value
        @param {Number} numBits Number of bits to read
        @return {Number} Value
     */
    readQuantizedFloat : function(minRange, maxRange, numBits)
    {
        var val = this.readBits(numBits);
        return minRange + val * (maxRange - minRange) / ((1 << numBits) - 1);
    },

    /** Reads a normalized 2D vector using the specified amount of bits (angle representation)
        @method readNormalizedVector2D
        @param {Number} numBits Number of bits to read
        @return {Object} Object with x & y fields, representing the 2D vector
     */
    readNormalizedVector2D : function(numBits)
    {
        var ret = {};
        var angle = this.readQuantizedFloat(-Math.PI, Math.PI, numBits);
        ret.x = Math.cos(angle);
        ret.y = Math.sin(angle);
        return ret;
    },

    /** Reads a 2D vector using the specified amount of bits.
        @method readVector2D
        @param {Number} magnitudeIntegerBits Number of bits for magnitude integer part
        @param {Number} magnitudeDecimalBits Number of bits for magnitude decimal part
        @param {Number} directionBits Number of bits for direction
        @return {Object} Object with x & y fields, representing the 2D vector
     */
    readVector2D : function(magnitudeIntegerBits, magnitudeDecimalBits, directionBits)
    {
        var ret = {};
        var fp = this.readBits(magnitudeIntegerBits + magnitudeDecimalBits);
        if (fp != 0)
        {
            var len = fp / (1 << magnitudeDecimalBits);
            var angle = this.readQuantizedFloat(-Math.PI, Math.PI, directionBits);
            ret.x = Math.cos(angle) * len;
            ret.y = Math.sin(angle) * len;
        }
        else
        {
            // Zero length, direction is not stored
            ret.x = 0;
            ret.y = 0;
        }
        return ret;
    },

    /** Reads a normalized 3D vector using the specified amount of bits (angle representation)
        @method readNormalizedVector3D
        @param {Number} numBitsYaw Number of bits to read for yaw
        @param {Number} numBitsPitch Number of bits to read for pitch
        @return {Object} Object with x, y, z fields, representing the 3D vector
     */
    readNormalizedVector3D : function(numBitsYaw, numBitsPitch)
    {
        var ret = {};
        var azimuth = this.readBits(-Math.PI, Math.PI, numBitsYaw);
        var inclination = this.readBits(-Math.PI/2, Math.PI/2, numBitsPitch);
        var cx = Math.cos(inclination);
        ret.x = cx * Math.sin(azimuth);
        ret.y = -Math.sin(inclination);
        ret.z = cx * Math.cos(azimuth);
        return ret;
    },

    /** Reads a 3D vector using the specified amount of bits.
        @method readVector3D
        @param {Number} numBitsYaw Number of bits to read for yaw
        @param {Number} numBitsPitch Number of bits to read for pitch
        @param {Number} magnitudeIntegerBits Number of bits for magnitude integer part
        @param {Number} magnitudeDecimalBits Number of bits for magnitude decimal part
        @return {Object} Object with x, y, z fields, representing the 3D vector
     */
    readVector3D : function(numBitsYaw, numBitsPitch, magnitudeIntegerBits, magnitudeDecimalBits, directionBits)
    {
        var ret = {};
        var fp = this.readBits(magnitudeIntegerBits + magnitudeDecimalBits);
        if (fp != 0)
        {
            var len = fp / (1 << magnitudeDecimalBits);
            var azimuth = this.readBits(-Math.PI, Math.PI, numBitsYaw);
            var inclination = this.readBits(-Math.PI/2, Math.PI/2, numBitsPitch);
            var cx = Math.cos(inclination);
            ret.x = cx * Math.sin(azimuth) * len;
            ret.y = -Math.sin(inclination) * len;
            ret.z = cx * Math.cos(azimuth) * len;
        }
        else
        {
            // Zero length, direction is not stored
            ret.x = 0;
            ret.y = 0;
            ret.z = 0;
        }

        return ret;
    }
});

return DataDeserializer;

}); // require js
