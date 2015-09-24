
define([
        "lib/classy",
        "lib/bitarray"
    ], function(Class, BitArray) {

var DataDeserializer = Class.$extend(
/** @lends DataDeserializer.prototype */
{
    /**
        Utility class to parse JavaScript ArrayBuffer data.

        @constructs
        @param {ArrayBuffer} buffer Source data buffer.
        @param {Number} [pos=0] Data position to proceed reading from.
        @param {Number} [length] Custom data length, read from buffer if not defined.
    */
    __init__ : function(buffer, pos, length)
    {
        /**
            @var {DataView} data
            @memberof DataDeserializer.prototype
        */
        /**
            The current element we're reading from the data buffer.
            @var {Number}
        */
        this.bytePos = 0;
        /**
            The current bit index of the byte we're reading, [0, 7].
            @var {Number}
        */
        this.bitPos = 0;

        if (buffer !== undefined)
            this.setBuffer(buffer, pos, length);

        // Backwards compatibility for .pos > this.bytesRead() > this.bytePos
        Object.defineProperties(this, {
            pos : {
                get : function () { return this.bytesRead(); }
            }
        });
    },

    __classvars__ :
    {
        // For reading non-aligned floats
        floatReadDataView  : new DataView(new ArrayBuffer(4)),
        // For reading non-aligned doubles
        doubleReadDataView : new DataView(new ArrayBuffer(8)),

        /**
            Reads a byte from bits.

            @static
            @param {BitArray} bits Source bits. See {@link DataDeserializer#readBits}.
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

        @param {ArrayBuffer} buffer Source data buffer.
        @param {Number} pos Data position to proceed reading from.
    */
    setBuffer : function(buffer, pos, length)
    {
        // Firefox DataView does not correctly support length as 'undefined'
        // TODO Seems fine on latest FF, this if-else could be removed?
        if (length === undefined)
            this.data = new DataView(buffer, pos);
        else
            this.data = new DataView(buffer, pos, length);
        this.bytePos = 0;
        this.bitPos = 0;
    },

    /**
        Read bytes as a new buffer.

        @param {Number} numBytes Number of bytes to read.
        @return {Uint8Array} Read buffer.
    */
    readUint8Array : function(numBytes)
    {
        //var buffer = this.data.buffer.subarray(this.bytePos, numBytes);
        var buffer = new Uint8Array(this.data.buffer, this.bytePos, numBytes);
        this.bytePos += numBytes;
        return buffer;
    },

    /**
        Returns the currently read bytes.

        @return {Number} Number of read bytes.
    */
    bytesRead : function()
    {
        return this.bytePos;
    },

    // TODO Remove, confusing name as all other readXXX() functions actually read data.
    readBytes : function() { return this.bytesRead(); },

    /**
        Returns how many bytes are left.

        @return {Number} Number of bytes left.
    */
    bytesLeft : function()
    {
        return this.bytePos >= this.data.byteLength ? 0 : this.data.byteLength - this.bytePos;
    },

    /**
        Returns how many bits are left.

        @return {Number} - Number of bytes left.
    */
    bitsLeft : function()
    {
        return this.bytePos >= this.data.byteLength ? 0 : (this.data.byteLength - this.bytePos) * 8 - this.bitPos;
    },

    /**
        Skips bytes. Use negative numBytes to go backwards.

        @param {Number} numBytes Number of bytes to skip.
    */
    skipBytes : function(numBytes)
    {
        this.bytePos += numBytes;
    },

    /**
        Reads a single byte and interprets it as a boolean.

        @return {Boolean} Read boolean.
    */
    readBoolean : function()
    {
        return (this.readU8() > 0);
    },

    // Make this work but don't document to encourage use.
    readBool : function()
    {
        return this.readBoolean();
    },

    /**
        Reads a single UTF-8 code point aka char code in JavaScript.

        Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataDeserializer.js

        @return {Number} Char code of the character.
    */
    readUtf8CharCode : function()
    {
        var char1, char2, char3, char4, char5;
        char1 = this.readU8();
        if (char1 < 0x80)
        {
            return char1;
        }
        else if (char1 < 0xe0)
        {
            char2 = this.readU8();
            return (char2 & 0x3f) | ((char1 & 0x1f) << 6);
        }
        else if (char1 < 0xf0)
        {
            char2 = this.readU8();
            char3 = this.readU8();
            return (char3 & 0x3f) | ((char2 & 0x3f) << 6) | ((char1 & 0xf) << 12);
        }
        else if (char1 < 0xf8)
        {
            char2 = this.readU8();
            char3 = this.readU8();
            char4 = this.readU8();
            return (char4 & 0x3f) | ((char3 & 0x3f) << 6) | ((char2 & 0x3f) << 12) | ((char1 & 0x7) << 18);
        }
        else if (char1 < 0xfc) {
            char2 = this.readU8();
            char3 = this.readU8();
            char4 = this.readU8();
            char5 = this.readU8();
            return (char5 & 0x3f) | ((char4 & 0x3f) << 6) | ((char3 & 0x3f) << 12) | ((char2 & 0x3f) << 18) | ((char1 & 0x3) << 24);
        }
        else
        {
            char2 = this.readU8();
            char3 = this.readU8();
            char4 = this.readU8();
            char5 = this.readU8();
            char6 = this.readU8();
            return (char6 & 0x3f) | ((char5 & 0x3f) << 6) | ((char4 & 0x3f) << 12) | ((char3 & 0x3f) << 18) | ((char2 & 0x3f) << 24) | ((char1 & 0x1) << 30);
        }
    },

    /**
        Reads string bytes and convert to string with String.fromCharCode()
        until delimStr or delimCharCode is encountered.

        This function is useful for reading null or newline terminated strings.
        Pass delimStr as '\n' or delimCharCode as 10 for null terminated string.

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
            var endPos = this.bytePos + length;
            if (utf8)
            {
                while(this.bytePos < endPos)
                    str += String.fromCharCode(this.readUtf8CharCode(endPos - this.bytePos));
            }
            else
            {
                while(this.bytePos < endPos)
                    str += String.fromCharCode(this.readU8());
            }
        }
        return str;
    },

    /**
        Reads u8 length string.

        @return {String} Read string.
    */
    readStringU8 : function(utf8)
    {
        return this.readString(this.readU8(), utf8);
    },

    /**
        Reads u16 length string.

        @return {String} Read string.
    */
    readStringU16 : function(utf8)
    {
        return this.readString(this.readU16(), utf8);
    },

    /**
        Reads u32 length string.

        @return {String} Read string.
    */
    readStringU32 : function(utf8)
    {
        return this.readString(this.readU32(), utf8);
    },

    /**
        Reads s8.

        @return {Number} s8
    */
    readS8 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getInt8(this.bytePos);
            this.bytePos += 1;
            return ret;
        }
        else
            return this.readBits(8);
    },

    /**
        Reads u8.

        @return {Number} u8
    */
    readU8 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getUint8(this.bytePos);
            this.bytePos += 1;
            return ret;
        }
        else
            return this.readBits(8);
    },

    /**
        Reads s16.

        @return {Number} s16
    */
    readS16 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getInt16(this.bytePos);
            this.bytePos += 2;
            return ret;
        }
        else
            return this.readBits(16);
    },

    /**
        Reads u16.

        @return {Number} u16
    */
    readU16 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getUint16(this.bytePos, true);
            this.bytePos += 2;
            return ret;
        }
        else
            return this.readBits(16);
    },

    /**
        Reads s32.

        @return {Number} s32
    */
    readS32 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getInt32(this.bytePos, true);
            this.bytePos += 4;
            return ret;
        }
        else
            return this.readBits(32);
    },

    /**
        Reads u32.

        @return {Number} u32
    */
    readU32 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getUint32(this.bytePos, true);
            this.bytePos += 4;
            return ret;
        }
        else
            return this.readBits(32);
    },

    /**
        Reads f32.

        @return {Number} f32
    */
    readFloat32 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getFloat32(this.bytePos, true);
            this.bytePos += 4;
            return ret;
        }
        else
        {
            DataDeserializer.floatReadDataView.setUint32(0, this.readBits(32), true);
            return DataDeserializer.floatReadDataView.getFloat32(0, true);
        }
    },

    /**
        Reads f64.

        @return {Number} f64
    */
    readFloat64 : function()
    {
        if (this.bitPos === 0)
        {
            var ret = this.data.getFloat64(this.bytePos, true);
            this.bytePos += 8;
            return ret;
        }
        else
        {
            // TODO Test this code path!
            DataDeserializer.doubleReadDataView.setUint64(0, this.readBits(64), true);
            return DataDeserializer.doubleReadDataView.getFloat64(0, true);
        }
    },

    /**
        Reads three f32 to a object { x : <f32>, y : <f32>, z : <f32> }.

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

        @return {Number} Read VLE value.
    */
    readVLE : function()
    {
        // Copied from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataDeserializer.js
        var low = this.readU8();
        if ((low & 128) === 0)
            return low;
        low = low & 127;
        var med = this.readU8();
        if ((med & 128) === 0)
            return low | (med << 7);
        med = med & 127;
        var high = this.readU16();
        return low | (med << 7) | (high << 14);
    },

    /**
        Reads a single bit.

        @return {Number} Value of the bit.
    */
    readBit : function()
    {
        return this.readBits(1);
    },

    /**
        Reads specified amount of bits.

        @param {Number} bitCount How many bits to read.
        @return {Number} Read bits as a Number.
    */
    readBits : function(bitCount)
    {
        var ret = 0;
        var shift = 0;
        var currentByte = this.data.getUint8(this.bytePos);

        while (bitCount > 0)
        {
            if (currentByte & (1 << this.bitPos))
                ret |= (1 << shift);

            shift++;
            bitCount--;
            this.bitPos++;

            if (this.bitPos > 7)
            {
                this.bitPos = 0;
                this.bytePos++;
                if (bitCount > 0)
                    currentByte = this.data.getUint8(this.bytePos);
            }
        }

        return ret;
    },

    /**
        Reads bytes as bits.

        @param {Number} bytes How many bytes to read as bits.
        @return {BitArray} Read bits. See http://github.com/bramstein/bit-array
    */
    readBitArray : function(bytes)
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

    /** Input parameters ints.

        @return {Number} Float */
    /*readUnsignedFixedPoint : function(numIntegerBits, numDecimalBits)
    {
        var fp = this.readBits(numIntegerBits + numDecimalBits);
        return fp / (1 << numDecimalBits);
    },*/

    /** Input parameters ints.

        @return {Number} Float */
    /*readSignedFixedPoint : function(numIntegerBits, numDecimalBits)
    {
        // Reading a [0, 2k-1] range -> remap back to [-k, k-1] range.
        return this.readUnsignedFixedPoint(numIntegerBits, numDecimalBits) - (1 << (numIntegerBits-1));
    },*/

    /** minRange and maxRange floats, numBits int

        @return {Number} Float */
    /*readQuantizedFloat : function(minRange, maxRange, numBits)
    {
        var val = this.readBits(numBits);
        return minRange + val * (maxRange-minRange) / ((1 << numBits) - 1);
    },*/

    /** @return {Object} { x : <value>, y : <value> } */
    /*readNormalizedVector2D : function(numBits)
    {
        var angle = this.readQuantizedFloat(-Math.PI, Math.PI, numBits);
        return { x: Math.cos(angle), y : Math.sin(angle) };
    },*/

    /**  All input parameters int.

        @return {Object} { x : <value>, y : <value> } */
    /*readVector2D : function(magnitudeIntegerBits, magnitudeDecimalBits, directionBits)
    {
        // this.read the length in unsigned fixed point format.
        // The following line is effectively the same as calling this.readUnsignedFixedPoint, but manually perform it
        // to be precisely able to examine whether the length is zero.
        var fp = this.readBits(magnitudeIntegerBits + magnitudeDecimalBits);
        if (fp !== 0) // If length is non-zero, the stream also contains the direction.
        {
            var length = fp / (1 << magnitudeDecimalBits);
            // Read the direction in the stream.
            var angle = this.readQuantizedFloat(-Math.PI, Math.PI, directionBits);
            return { x : Math.cos(angle) * length, y : Math.sin(angle) * length };
        }
        else // Zero length, no direction present in the buffer.
        {
            return { x : 0, y : 0 };
        }
    },*/

    /** All input parameters int.

        @return {Object} { x : <value>, y : <value>, z : <value> } */
    /*readNormalizedVector3D : function(numBitsYaw, numBitsPitch)
    {
        var azimuth = this.readQuantizedFloat(-Math.PI, Math.PI, numBitsYaw);
        var inclination = this.readQuantizedFloat(-Math.PI/2, Math.PI/2, numBitsPitch);
        var cx = Math.cos(inclination);
        return { x : cx * Math.sin(azimuth),y : -Math.sin(inclination), z : cx * Math.cos(azimuth) };
    },*/

    /** All input parameters int.

        @return {Object} { x : <value>, y : <value>, z : <value> } */
    /*readVector3D : function(numBitsYaw, numBitsPitch, magnitudeIntegerBits,  magnitudeDecimalBits)
    {
        // Read the length in unsigned fixed point format.
        // The following line is effectively the same as calling this.readUnsignedFixedPoint, but manually perform it
        // to be precisely able to examine whether the length is zero.
        var fp = this.readBits(magnitudeIntegerBits + magnitudeDecimalBits);
        if (fp !== 0) // If length is non-zero, the stream also contains the direction.
        {
            var length = fp / (1 << magnitudeDecimalBits);

            var azimuth = this.readQuantizedFloat(-Math.PI, Math.PI, numBitsYaw);
            var inclination = this.readQuantizedFloat(-Math.PI/2, Math.PI/2, numBitsPitch);

            var cx = Math.cos(inclination);
            return { x : cx * Math.sin(azimuth) * length, y : -Math.sin(inclination) * length, z : cx * Math.cos(azimuth) * length };
        }
        else // length is zero, stream does not contain the direction.
        {
            return { x : 0, y : 0, z : 0 };
        }
    },*/
    /** All input parameters int.

        @return {Array} Array of 2 values. */
    /*readArithmeticEncoded2 : function(numBits, max1, max2)
    {
        // assert(max1 * max2 < (1 << numBits));
        var ret = [];
        var val = this.readBits(numBits);
        ret[1] = val % max2;
        ret[0] = val / max2;
        return ret;
    },*/
    /** All input parameters int.

        @return {Array} Array of 3 values. */
    /*readArithmeticEncoded3 : function(numBits, max1, max2, max3)
    {
        // assert(max1 * max2 * max3 < (1 << numBits));
        var ret = [];
        var val = this.readBits(numBits);
        val3 = val % max3;
        val /= max3;
        ret[1] = val % max2;
        ret[0] = val / max2;
        return ret;
    },*/
    /** All input parameters int.

        @return {Array} Array of 4 values. */
    /*readArithmeticEncoded4 : function(numBits, max1, max2, max3, max4)
    {
        // assert(max1 * max2 * max3 * max4 < (1 << numBits));
        var ret = [];
        var val = this.readBits(numBits);
        ret[3] = val % max4;
        val /= max4;
        ret[2] = val % max3;
        val /= max3;
        ret[1] = val % max2;
        ret[0] = val / max2;
        return 0;
    },*/
    /** All input parameters int.

        @return {Array} Array of 5 values. */
    /*readArithmeticEncoded5 : function(max1, max2, max3, max4, max5)
    {
        // assert(max1 * max2 * max3 * max4 * max5 < (1 << numBits));
        var ret = [];
        var val = this.readBits(numBits);
        ret[4] = val % max5;
        val /= max5;
        ret[3] = val % max4;
        val /= max4;
        ret[2] = val % max3;
        val /= max3;
        ret[1] = val % max2;
        ret[0] = val / max2;
    }*/
});

return DataDeserializer;

}); // require js
