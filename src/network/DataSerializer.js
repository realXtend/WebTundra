// For conditions of distribution and use, see copyright notice in LICENSE

if (Tundra === undefined)
    var Tundra = {};

// For writing non-aligned floats
Tundra.floatWriteDataView = new DataView(new ArrayBuffer(4));

Tundra.DataSerializer = function (lengthBytes) {
    this.dataView = new DataView(new ArrayBuffer(lengthBytes));
    this.bitPos = 0;
    this.bytePos = 0;
};

Tundra.DataSerializer.prototype = {
    addU8 : function(value) {
        if (this.bitPos === 0)
        {
            this.dataView.setUint8(this.bytePos, value);
            this.bytePos++;
        }
        else
            this.addBits(8, value);
    },

    addU16 : function(value) {
        if (this.bitPos === 0)
        {
            this.dataView.setUint16(this.bytePos, value, true);
            this.bytePos += 2;
        }
        else
            this.addBits(16, value);
    },

    addU32 : function(value) {
        if (this.bitPos === 0)
        {
            this.dataView.setUint32(this.bytePos, value, true);
            this.bytePos += 4;
        }
        else
            this.addBits(32, value);
    },

    addS32 : function(value) {
        var valueU32 = value;
        if (valueU32 < 0)
            valueU32 += 0x80000000;
        this.addU32(valueU32);
    },

    addFloat : function(value) {
        if (this.bitPos === 0)
        {
            this.dataView.setFloat32(this.bytePos, value, true);
            this.bytePos += 4;
        }
        else
        {
            Tundra.floatWriteDataView.setFloat32(0, value, true);
            this.addBits(32, Tundra.floatWriteDataView.getUint32(0, true));
        }
    },

    addVLE : function(value) {
        if (value < 0x80)
            this.addU8(value);
        else if (value < 0x4000) {
            this.addU8((value & 0x7f) | 0x80);
            this.addU8(value >> 7);
        }
        else {
            this.addU8((value & 0x7f) | 0x80);
            this.addU8(((value >> 7) & 0x7f) | 0x80);
            this.addU16(value >> 14);
        }
    },

    addBit : function(value) {
        this.addBits(1, value);
    },

    addBits : function(bitCount, value) {
        var shift = 0;
        var currentByte = this.dataView.getUint8(this.bytePos);

        while (bitCount > 0) {
            if (value & (1 << shift))
                currentByte |= (1 << this.bitPos);
            else
                currentByte &= (0xff - (1 << this.bitPos));

            shift++;
            bitCount--;
            this.bitPos++;

            if (this.bitPos > 7) {
                this.bitPos = 0;
                this.dataView.setUint8(this.bytePos, currentByte);
                this.bytePos++;
                if (bitCount > 0)
                    currentByte = this.dataView.getUint8(this.bytePos);
            }
        }
        
        if (this.bitPos !== 0)
            this.dataView.setUint8(this.bytePos, currentByte);
    },
    
    countUtf8ByteSize : function(value) {
        var bytes = 0;
        for (var i = 0; i < value.length; i++) {
            var c = value.charCodeAt(i);
            if (c < 0x80)
                bytes++;
            else if (c < 0x800)
                bytes += 2;
            else if (c < 0x10000)
                bytes += 3;
            else if (c < 0x200000)
                bytes += 4;
            else if (c < 0x4000000)
                bytes += 5;
            else
                bytes += 6;
        }
        return bytes;
    },

    addUtf8Char : function(value) {
        if (value < 0x80)
            this.addU8(value);
        else if (value < 0x800) {
            this.addU8(0xc0 | ((value >> 6) & 0x1f));
            this.addU8(0x80 | (value & 0x3f));
        }
        else if (value < 0x10000) {
            this.addU8(0xe0 | ((value >> 12) & 0xf));
            this.addU8(0x80 | ((value >> 6) & 0x3f));
            this.addU8(0x80 | (value & 0x3f));
        }
        else if (value < 0x200000) {
            this.addU8(0xf0 | ((value >> 18) & 0x7));
            this.addU8(0x80 | ((value >> 12) & 0x3f));
            this.addU8(0x80 | ((value >> 6) & 0x3f));
            this.addU8(0x80 | (value & 0x3f));
        }
        else if (value < 0x4000000) {
            this.addU8(0xf8 | ((value >> 24) & 0x3));
            this.addU8(0x80 | ((value >> 18) & 0x3f));
            this.addU8(0x80 | ((value >> 12) & 0x3f));
            this.addU8(0x80 | ((value >> 6) & 0x3f));
            this.addU8(0x80 | (value & 0x3f));
        }
        else {
            this.addU8(0xfc | ((value >> 30) & 0x1));
            this.addU8(0x80 | ((value >> 24) & 0x3f));
            this.addU8(0x80 | ((value >> 18) & 0x3f));
            this.addU8(0x80 | ((value >> 12) & 0x3f));
            this.addU8(0x80 | ((value >> 6) & 0x3f));
            this.addU8(0x80 | (value & 0x3f));
        }
    },

    addUtf8String : function(value) {
        this.addU16(this.countUtf8ByteSize(value));
        for (var i = 0; i < value.length; i++)
            this.addUtf8Char(value.charCodeAt(i));
    },

    addString : function(value) {
        // Strings stored in this format should be avoided, as it is limited to max. 255 chars long Latin/ASCII strings
        this.addU8(value.length);
        for (var i = 0; i < value.length; i++)
            this.addU8(value.charCodeAt(i));
    },
    
    addStringVLE : function(value) {
        // Strings stored in this format should be avoided, as it is limited to Latin/ASCII strings
        this.addVLE(value.length);
        for (var i = 0; i < value.length; i++)
            this.addU8(value.charCodeAt(i));
    },

    addStringU16 : function(value) {
        // Strings stored in this format should be avoided, as it is limited to Latin/ASCII strings
        this.addU16(value.length);
        for (var i = 0; i < value.length; i++)
            this.addU8(value.charCodeAt(i));
    },

    addArrayBuffer : function(value, maxLength) {
        var view = new DataView(value);
        maxLength = maxLength || value.byteLength;
        for (var i = 0; i < maxLength; ++i) {
            this.addU8(view.getUint8(i));
        }
    },

    truncate : function() {
        var newLength = this.bytesFilled;
        if (newLength != this.dataView.byteLength)
            this.dataView = new DataView(this.dataView.buffer.slice(0, newLength));
    },

    get bytesFilled(){
        if (this.bitPos === 0)
            return this.bytePos;
        else
            return this.bytePos + 1;
    },

    get arrayBuffer(){
        return this.dataView.buffer;
    }
};
