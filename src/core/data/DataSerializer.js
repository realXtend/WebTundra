
define([
        "lib/classy",
        "core/framework/Tundra"
    ], function(Class, Tundra) {

var DataSerializer = Class.$extend(
/** @lends DataSerializer.prototype */
{
    /**
        Utility class to fill in JavaScript ArrayBuffer data.

        @constructs
        @param {Number} numBytes Size of the destination array buffer.
        @param {DataSerializer.ArrayType} [arrayType=Uint8] Type of the underlying typed array.
    */
    __init__ : function(numBytes, arrayType)
    {
        if (typeof numBytes !== "number")
        {
            Tundra.client.logWarning("[DataSerializer]: You are creating a data serializer with undefined size! Initializing size to 0 bytes.");
            numBytes = 0;
        }
        arrayType = (typeof arrayType === "number" ? arrayType : DataSerializer.ArrayType.Uint8);

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
            Tundra.client.logError("[DataSerializer]: Unknown 'arrayType' " + arrayType + ". Use on of the supported ones from DataSerializer.ArrayType");
            return;
        }

        /**
            @var {DataView}
        */
        this.data = new DataView(this.array.buffer);
        /**
            The current element we're writing to in the data buffer.
            @var {Number}
        */
        this.bytePos = 0;
        /**
            The current bit index of the byte we're writing, [0, 7].
            @var {Number}
        */
        this.bitPos = 0;
        /**
            Underlying data array type.
            @var {DataSerializer.ArrayType}
        */
        this.type = arrayType;

        // Backwards compatibility for .pos > this.readBytes() > this.bytePos
        Object.defineProperties(this, {
            pos : {
                get : function () { return this.filledBytes(); }
            }
        });
    },

    __classvars__ :
    {
        // For writing non-aligned floats
        floatWriteDataView : new DataView(new ArrayBuffer(4)),
        // For writing non-aligned doubles
        doubleWriteDataView : new DataView(new ArrayBuffer(8)),

        /**
            @static
            @readonly
            @enum {number}
        */
        ArrayType :
        {
            Uint8   : 0,
            Uint16  : 1,
            Uint32  : 2,
            Float32 : 3,
            Float64 : 4
        },

        /**
            Returns UTF-8 byte size for a string.

            Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js

            @static
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
            Returns UTF-8 byte size for a char code.

            Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js

            @static
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
        },
    },

    /**
        Returns the destination array buffer.

        @return {ArrayBuffer} Destination array buffer.
    */
    getBuffer : function()
    {
        return this.array.buffer;
    },

    /**
        Returns the currently written byte count. Partial bits at the end are rounded up to constitute a full byte.

        @return {Number}
    */
    filledBytes : function()
    {
        if (this.bitPos === 0)
            return this.bytePos;
        else
            return this.bytePos + 1;
    },

    /**
        The number of bits filled so far total.

        @return {Number}
    */
    filledBits : function()
    {
        return this.bytePos * 8 + this.bitPos;
    },

    /**
        Returns the total capacity of the buffer we are filling into, in bytes.

        @return {Number}
    */
    capacity : function()
    {
        return this.data.byteLength;
    },

    /**
        Returns how many bytes are left for writing new data.

        @return {Number} Number of bytes left for writing.
    */
    bytesLeft : function()
    {
        return this.bytePos >= this.data.byteLength ? 0 : this.data.byteLength - this.bytePos;
    },

    /**
        Returns how many bits are left.

        @return {Number} Number of bits left.
    */
    bitsLeft : function()
    {
        return this.bytePos >= this.data.byteLength ? 0 : (this.data.byteLength - this.bytePos) * 8 - this.bitPos;
    },

    skipBytes : function(numBytes)
    {
        this.bytePos += numBytes;
    },

    /**
        Writes boolean as u8, 0 if false, 1 otherwise.

        @param {Boolean} bool Write boolean.
    */
    writeBoolean : function(bool)
    {
        this.writeU8(bool === true ? 1 : 0);
    },

    /**
        Writes an Uint8Array.

        @param {Uint8Array} buffer
    */
    writeUint8Array : function(buffer)
    {
        for (var i = 0, len = buffer.length; i < len; ++i)
            this.writeU8(buffer[i]);
    },

    /**
        Writes UTF-8 bytes for given char code.

        Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js

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
        Writes a size header and UTF-8 bytes for given string.

        Code adapted from https://github.com/realXtend/WebTundraNetworking/blob/master/src/DataSerializer.js

        @param {Number} headerSizeBytes Size of bytes for the header size, e.g. 2 == U16 size header is written.
                        Valid options: 1, 2, 4, and any other value means that VLE is used.
                        Use DataSerializer.vleHeaderSizeBytes(<asciiStringLength|numUtf8bytes>) if you are
                        interested how many bytes were written in the VLE case.
        @param {String} str String to write.
        @param {Boolean} utf8 If should write as UTF-8 bytes, ASCII otherwise.
    */
    writeStringWithHeader : function(headerSizeBytes, str, utf8)
    {
        if (typeof utf8 !== "boolean")
            utf8 = false;

        // Write size header
        // TODO Profile if iterating the string twice causes significant overhead in UTF-8 case.
        var numBytes = utf8 ? DataSerializer.utf8StringByteSize(str) : str.length;
        if (headerSizeBytes == 1)
            this.writeU8(numBytes);
        else if (headerSizeBytes == 2)
            this.writeU16(numBytes);
        else if (headerSizeBytes == 4)
            this.writeU32(numBytes);
        else
            this.writeVLE(numBytes);

        var i = 0, strlen = str.length;
        if (utf8)
        {
            for(; i < strlen; ++i)
                this.writeUtf8Char(str.charCodeAt(i));
        }
        else
        {
            for(; i < strlen; ++i)
                this.writeU8(str.charCodeAt(i)); // TODO In native impl we use s8 (char), should we use it here too?
        }
    },

    /**
        Writes a string with a VLE header depending on the string length. Supports UTF-8 strings.


        @param {String} str String to write.
    */
    writeStringVLE : function(str, utf8)
    {
        this.writeStringWithHeader(0, str, utf8);
    },

    /**
        Write string with a u8 length header. Supports UTF-8 strings.
        The input string has to have max length of u8, this won't be checked during runtime.

        @param {String} str String to write.
    */
    writeStringU8 : function(str, utf8)
    {
        this.writeStringWithHeader(1, str, utf8);
    },

    /**
        Write string with a u16 length header. Supports UTF-8 strings.
        The input string has to have max length of u16, this won't be checked during runtime.

        @param {String} str String to write.
    */
    writeStringU16 : function(str, utf8)
    {
        this.writeStringWithHeader(2, str, utf8);
    },

    /**
        Write string with a u32 length header. Supports UTF-8 strings.
        The input string has to have max length of u32, this won't be checked during runtime.

        @param {String} str String to write.
    */
    writeStringU32 : function(str, utf8)
    {
        this.writeStringWithHeader(4, str, utf8);
    },

    /**
        Writes s8.

        @param {Number} value
    */
    writeS8 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setInt8(this.bytePos, value);
            this.bytePos += 1;
        }
        else
            this.writeBits(value, 8);
    },

    /**
        Writes u8.

        @param {Number} value
    */
    writeU8 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setUint8(this.bytePos, value);
            this.bytePos += 1;
        }
        else
            this.writeBits(value, 8);
    },

    /**
        Writes s16.

        @param {Number} value
    */
    writeS16 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setInt16(this.bytePos, value, true);
            this.bytePos += 2;
        }
        else
            this.writeBits(value, 16);
    },

    /**
        Writes u16.

        @param {Number} value
    */
    writeU16 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setUint16(this.bytePos, value, true);
            this.bytePos += 2;
        }
        else
            this.writeBits(value, 16);
    },

    /**
        Writes s32.

        @param {Number} value
    */
    writeS32 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setIn32(this.bytePos, value, true);
            this.bytePos += 4;
        }
        else
            this.writeBits(value, 32);
    },

    /**
        Writes u32.

        @param {Number} value
    */
    writeU32 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setUint32(this.bytePos, value, true);
            this.bytePos += 4;
        }
        else
            this.writeBits(value, 32);
    },

    /**
        Writes f32.

        @param {Number} value
    */
    writeFloat32 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setFloat32(this.bytePos, value, true);
            this.bytePos += 4;
        }
        else
        {
            Tundra.floatWriteDataView.setFloat32(0, value, true);
            this.writeBits(Tundra.floatWriteDataView.getUint32(0, true), 32);
        }
    },

    /**
        Writes f64.

        @param {Number} value
    */
    writeFloat64 : function(value)
    {
        if (this.bitPos === 0)
        {
            this.data.setFloat64(this.bytePos, value, true);
            this.bytePos += 8;
        }
        else
        {
            // TODO Test this code path!
            Tundra.doubleWriteDataView.setFloat64(0, value, true);
            this.writeBits(Tundra.doubleWriteDataView.getUint64(0, true), 64);
        }
    },

    /**
        Writes VLE.

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
        Writes the given number of bits to the stream.

        @param {Number} value The variable where the bits are taken from. The bits are read from the LSB first, towards the MSB end of the value.
        @param {Number} numBits The number of bits to write, in the range [1, 32].
    */
    writeBits : function(value, numBits)
    {
        var shift = 0;
        var currentByte = this.data.getUint8(this.bytePos);

        while(numBits > 0)
        {
            if (value & (1 << shift))
                currentByte |= (1 << this.bitPos);
            else
                currentByte &= (0xff - (1 << this.bitPos));

            shift++;
            numBits--;
            this.bitPos++;

            if (this.bitPos > 7)
            {
                this.bitPos = 0;
                this.data.setUint8(this.bytePos, currentByte);
                this.bytePos++;
                if (numBits > 0)
                    currentByte = this.data.getUint8(this.bytePos);
            }
        }

        if (this.bitPos !== 0)
            this.data.setUint8(this.bytePos, currentByte);
    },

    /** Writes the given non-negative float quantized to the given fixed-point precision.
        @param value The floating-point value to send. This float must have a value in the range [0, 2^numIntegerBits[.
        @param numIntegerBits The number (integer) of bits to use to represent the integer part.
        @param numDecimalBits The number (integer) of bits to use to represent the fractional part.
        @note Before writing the value, it is clamped to range specified above to ensure that the written value does not
        result in complete garbage due to over/underflow.
        @note The total number of bits written is numIntegerBits + numDecimalBits, which must in total be <= 32.
        @return The bit pattern that was written to the buffer. */
    /* writeUnsignedFixedPoint : function(numIntegerBits, numDecimalBits, value)
    {
        // assert(numIntegerBits >= 0);
        // assert(numDecimalBits > 0);
        // assert(numIntegerBits + numDecimalBits <= 32);
        var maxVal = (1 << numIntegerBits);
        var maxBitPattern = (1 << (numIntegerBits + numDecimalBits)) - 1; // All ones - the largest value we can send.
        var outVal = value <= 0 ? 0 : (value >= maxVal ? maxBitPattern : (value * (1 << numDecimalBits)));
        // TODO floor(outVal) as it should be u32?
        // assert(outVal <= maxBitPattern);
        this.writeBits(outVal, numIntegerBits + numDecimalBits);
        return outVal;
    }, */

    /** Writes the given float quantized to the given fixed-point precision.
        @param value The floating-point value to send. This float must have a value in the range [-2^(numIntegerBits-1), 2^(numIntegerBits-1)[.
        @param numIntegerBits The number (integer) of bits to use to represent the integer part.
        @param numDecimalBits The number (integer) of bits to use to represent the fractional part.
        @note Before writing the value, it is clamped to range specified above to ensure that the written value does not
        result in complete garbage due to over/underflow.
        @note The total number of bits written is numIntegerBits + numDecimalBits, which must in total be <= 32.
        @return The bit pattern that was written to the buffer. */
    /* writeSignedFixedPoint : function(numIntegerBits, numDecimalBits, value)
    {
        // Adding a [-k, k-1] range -> remap to unsigned.[0, 2k-1] range and send that instead.
        return this.writeUnsignedFixedPoint(numIntegerBits, numDecimalBits, value + (1 << (numIntegerBits-1)));
    }, */

    /** Writes the given float quantized to the number of bits, that are distributed evenly over the range [minRange, maxRange].
        @param value The floating-point value to send. This float must have a value in the range [minRange, maxRange].
        @param numBits The number of bits to use for representing the value. The total number of different values written is then 2^numBits,
        which are evenly distributed across the range [minRange, maxRange]. The value numBits must satisfy 1 <= numBits <= 30.
        @param minRange The lower limit for the value that is being written.
        @param maxRange The upper limit for the value that is being written.
        @return The bit pattern that was written to the buffer.
        @note This function performs quantization, which results in lossy serialization/deserialization. */
    /* writeQuantizedFloat : function(minRange, maxRange, numBits, value)
    {
        var outVal = (MathUtils.clamp(value, minRange, maxRange) - minRange) * ((1 << numBits)-1) / (maxRange - minRange);
        // TODO floor(outVal) as it should be u32?
        this.writeBits(outVal, numBits);
        return outVal;
    }, */
    /** Writes the given normalized 2D vector compressed to a single 1D polar angle value. Then the angle is quantized to the specified
        precision.
        @param x The x coordinate of the 2D vector.
        @param y The y coordinate of the 2D vector.
        @param numBits The number (integer) of bits to quantize the representation down to. This value must satisfy 1 <= numBits <= 30.
        @note The vector (x,y) does not need to be normalized for this function to work properly (don't bother enforcing normality in
        advance prior to calling this). When deserializing, (x,y) is reconstructed as a normalized direction vector.
        @note Do not call this function with (x,y) == (0,0).
        @note This function performs quantization, which results in lossy serialization/deserialization. */
    /* writeNormalizedVector2D : function(x, y, numBits)
    {
        // Call atan2() to get the aimed angle of the 2D vector in the range [-Math.PI, Math.PI], then quantize the 1D result to the desired precision.
        this.writeQuantizedFloat(-Math.PI, Math.PI, numBits, atan2(y, x));
    }, */
    /** Writes the given 2D vector in polar form and quantized to the given precision.
        The length of the 2D vector is stored as fixed-point in magnitudeIntegerBits.magnitudeDecimalBits format.
        The direction of the 2D vector is stores with directionBits.
        @param x The x coordinate of the 2D vector.
        @param y The y coordinate of the 2D vector.
        @param magnitudeIntegerBits The number of bits to use for the integral part of the vector's length. This means
        that the maximum length of the vector to be written by this function is < 2^magnitudeIntegerBits.
        @param magnitudeDecimalBits The number of bits to use for the fractional part of the vector's length.
        @param directionBits The number of bits of precision to use for storing the direction of the 2D vector.
        @return The number of bits written to the stream.
        @important This function does not write a fixed amount of bits to the stream, but omits the direction if the length is zero.
        Therefore only use DataDeserializer.readVector2D to extract the vector from the buffer. */
    // float x, float y, int magnitudeIntegerBits, int magnitudeDecimalBits, int directionBits
    // returns The number of bits written to the stream.
    /* writeVector2D : function(x, y, magnitudeIntegerBits, magnitudeDecimalBits, directionBits)
    {
        // Compute the length of the vector. Use a fixed-point representation to store the length.
        var length = Math.sqrt(x*x+y*y);
        var bitVal = this.writeUnsignedFixedPoint(magnitudeIntegerBits, magnitudeDecimalBits, length);

        // If length == 0, don't need to send the angle, as it's a zero vector.
        if (bitVal !== 0)
        {
            // Call atan2() to get the aimed angle of the 2D vector in the range [-Math.PI, Math.PI], then quantize the 1D result to the desired precision.
            var angle = Math.atan2(y, x);
            this.writeQuantizedFloat(-Math.PI, Math.PI, directionBits, angle);
            return magnitudeIntegerBits + magnitudeDecimalBits + directionBits;
        }
        else
            return magnitudeIntegerBits + magnitudeDecimalBits;
    }, */
    /** Writes the given normalized 3D vector converted to spherical form (azimuth/yaw, inclination/pitch) and quantized to the specified range.
        The given vector (x,y,z) must be normalized in advance.
        @param numBitsYaw The number (integer) of bits to use for storing the azimuth/yaw part of the vector.
        @param numBitsPitch The number (integer) of bits to use for storing the inclination/pitch part of the vector.
        @note After converting the euclidean (x,y,z) to spherical (yaw, pitch) format, the yaw value is expressed in the range [-pi, pi] and pitch
        is expressed in the range [-pi/2, pi/2]. Therefore, to maintain consistent precision, the condition numBitsYaw == numBitsPitch + 1
        should hold. E.g. If you specify 8 bits for numBitsPitch, then you should specify 9 bits for numBitsYaw to have yaw & pitch use the same
        amount of precision.
        @note This function uses the convention that the +Y axis points towards up, i.e. +Y is the "Zenith direction", and the X-Z plane is the horizontal
        "map" plane. */
    /* writeNormalizedVector3D : function(x, y, z, numBitsYaw, numBitsPitch)
    {
        // Convert to spherical coordinates. We assume that the vector (x,y,z) has been normalized beforehand.
        var azimuth = Math.atan2(x, z); // The 'yaw'
        var inclination = Math.asin(-y); // The 'pitch'

        this.writeQuantizedFloat(-Math.PI, Math.PI, numBitsYaw, azimuth);
        this.writeQuantizedFloat(-Math.PI/2, Math.PI/2, numBitsPitch, inclination);
    }, */
    /** Writes the given 3D vector converted to spherical form (azimuth/yaw, inclination/pitch, length) and quantized to the specified range.
        @param numBitsYaw The number of bits to use for storing the azimuth/yaw part of the vector.
        @param numBitsPitch The number of bits to use for storing the inclination/pitch part of the vector.
        @param magnitudeIntegerBits The number of bits to use for the integral part of the vector's length. This means
        that the maximum length of the vector to be written by this function is < 2^magnitudeIntegerBits.
        @param magnitudeDecimalBits The number of bits to use for the fractional part of the vector's length.
        @return The number of bits written to the stream.
        @important This function does not write a fixed amount of bits to the stream, but omits the direction if the length is zero.
        Therefore only use DataDeserializer.readVector3D to extract the vector from the buffer.
        @note After converting the euclidean (x,y,z) to spherical (yaw, pitch) format, the yaw value is expressed in the range [-pi, pi] and pitch
        is expressed in the range [-pi/2, pi/2]. Therefore, to maintain consistent precision, the condition numBitsYaw == numBitsPitch + 1
        should hold. E.g. If you specify 8 bits for numBitsPitch, then you should specify 9 bits for numBitsYaw to have yaw & pitch use the same
        amount of precision.
        @note This function uses the convention that the +Y axis points towards up, i.e. +Y is the "Zenith direction", and the X-Z plane is the horizontal
        "map" plane. */
    /* writeVector3D : function(x, y, z, numBitsYaw, numBitsPitch, magnitudeIntegerBits, magnitudeDecimalBits)
    {
        var length = Math.sqrt(x*x + y*y + z*z);
        var bitVal = this.writeUnsignedFixedPoint(magnitudeIntegerBits, magnitudeDecimalBits, length);
        if (bitVal !== 0)
        {
            // The written length was not zero. Send the spherical angles as well.
            var azimuth = Math.atan2(x, z);
            var inclination = Math.asin(-y / length);

            this.writeQuantizedFloat(-Math.PI, Math.PI, numBitsYaw, azimuth);
            this.writeQuantizedFloat(-Math.PI/2, Math.PI/2, numBitsPitch, inclination);
            return magnitudeIntegerBits + magnitudeDecimalBits + numBitsYaw + numBitsPitch;
        }
        else // The vector is (0,0,0). Don't send spherical angles as they're redundant.
            return magnitudeIntegerBits + magnitudeDecimalBits;
    }, */

    /** All values ints */
    /* writeArithmeticEncoded2 : function(numBits, val1, max1, val2, max2)
    {
        // assert(max1 * max2 < (1 << numBits));
        // assert(val1 >= 0);
        // assert(val1 < max1);
        // assert(val2 >= 0);
        // assert(val2 < max2);
        this.writeBits(val1 * max2 + val2, numBits);
    }, */
    /** All values ints */
    /* writeArithmeticEncoded3 : function(numBits, val1, max1, val2, max2, val3, max3)
    {
        // assert(max1 * max2 * max3 < (1 << numBits));
        // assert(val1 >= 0);
        // assert(val1 < max1);
        // assert(val2 >= 0);
        // assert(val2 < max2);
        // assert(val3 >= 0);
        // assert(val3 < max3);
        this.writeBits((val1 * max2 + val2) * max3 + val3, numBits);
    }, */
    /** All values ints */
    /* writeArithmeticEncoded4 : function(numBits, val1, max1, val2, max2, val3, max3, val4, max4)
    {
        // assert(max1 * max2 * max3 * max4 < (1 << numBits));
        // assert(val1 >= 0);
        // assert(val1 < max1);
        // assert(val2 >= 0);
        // assert(val2 < max2);
        // assert(val3 >= 0);
        // assert(val3 < max3);
        // assert(val4 >= 0);
        // assert(val4 < max4);
        this.writeBits(((val1 * max2 + val2) * max3 + val3) * max4 + val4, numBits);
    }, */
    /** All values ints */
    /*writeArithmeticEncoded5 : function(numBits, val1, max1, val2, max2, val3, max3, val4, max4, val5, max5)
    {
        // assert(max1 * max2 * max3 * max4 * max5 < (1 << numBits));
        // assert(val1 >= 0);
        // assert(val1 < max1);
        // assert(val2 >= 0);
        // assert(val2 < max2);
        // assert(val3 >= 0);
        // assert(val3 < max3);
        // assert(val4 >= 0);
        // assert(val4 < max4);
        // assert(val5 >= 0);
        // assert(val5 < max5);
        this.writeBits((((val1 * max2 + val2) * max3 + val3) * max4 + val4) * max5 + val5, numBits);
    },*/
});

return DataSerializer;

}); // require js
