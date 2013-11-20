// For conditions of distribution and use, see copyright notice in LICENSE

// For reading non-aligned floats
var floatReadDataView = new DataView(new ArrayBuffer(4));

function DataDeserializer(arrayBuffer) {
    this.dataView = new DataView(arrayBuffer);
    this.bitPos = 0;
    this.bytePos = 0;
    this.size = arrayBuffer.byteLength;
}

DataDeserializer.prototype = {
    resetTraversal: function() {
        this.bitPos = 0;
        this.bytePos = 0;
    },

    readU8 : function() {
        if (this.bitPos == 0)
            return this.dataView.getUint8(this.bytePos++);
        else
            return this.readBits(8);
    },

    readU16 : function() {
        if (this.bitPos == 0)
        {
            var ret = this.dataView.getUint16(this.bytePos, true);
            this.bytePos += 2;
            return ret;
        }
        else
            return this.readBits(16);
    },

    readU32 : function() {
        if (this.bitPos == 0)
        {
            var ret = this.dataView.getUint32(this.bytePos, true);
            this.bytePos += 4;
            return ret;
        }
        else
            return this.readBits(32);
    },
    
    readS32 : function() {
        var valueS32 = this.readU32();
        if (valueS32 >= 32768*65536)
            valueS32 -= 32768*65536;
        return valueS32;
    },

    readFloat : function() {
        if (this.bitPos == 0)
        {
            var ret = this.dataView.getFloat32(this.bytePos, true);
            this.bytePos += 4;
            return ret;
        }
        else
        {
            floatReadDataView.setUint32(0, this.readBits(32), true);
            return floatReadDataView.getFloat32(0, true);
        }
    },

    readVLE : function() {
        var low = readU8();
        if ((low & 128) == 0)
            return low;

        low = low & 127;
        var med = readU8();
        if ((med & 128) == 0)
            return low | (med << 7);

        med = med & 127;
        var high = readU16();
        return low | (med << 7) | (high << 14);
    },

    readBit : function() {
        return this.readBits(1);
    },

    readBits : function(bitCount) {
        var ret = 0;
        var shift = 0;
        var currentByte = this.dataView.getUint8(this.bytePos);

        while (bitCount > 0) {
            if (currentByte & (1 << this.bitPos))
                ret |= (1 << shift);
        
            shift++;
            bitCount--;
            this.bitPos++;

            if (this.bitPos > 7) {
                this.bitPos = 0;
                this.bytePos++;
                if (bitCount > 0)
                    currentByte = this.dataView.getUint8(this.bytePos);
            }
        }

        return ret;
    },
    
    readUtf8Char : function() {
        /// \todo add error handling
        var char1 = this.readU8();
        if (char1 < 0x80)
            return char1;
        else if (char1 < 0xe0) {
            var char2 = this.readU8();
            return (char2 & 0x3f) | ((char1 & 0x1f) << 6);
        }
        else if (char1 < 0xf0) {
            var char2 = this.readU8();
            var char3 = this.readU8();
            return (char3 & 0x3f) | ((char2 & 0x3f) << 6) | ((char1 & 0xf) << 12);
        }
        else if (char1 < 0xf8) {
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
        else {
            var char2 = this.readU8();
            var char3 = this.readU8();
            var char4 = this.readU8();
            var char5 = this.readU8();
            var char6 = this.readU8();
            return (char6 & 0x3f) | ((char5 & 0x3f) << 6) | ((char4 & 0x3f) << 12) | ((char3 & 0x3f) << 18) | ((char2 & 0x3f) << 24) |
                ((char1 & 0x1) << 30);
        }
    },
    
    readArrayBuffer : function(size) {
        var buffer = new ArrayBuffer(size);
        var bufferDataView = new DataView(buffer);
        for (var i = 0; i < size; ++i)
            bufferDataView.setUint8(i, this.readU8());
        return buffer;
    },

    readUtf8String : function() {
        var byteLength = this.readU16();
        var endPos = this.bytePos + byteLength;
        var ret = "";
        while (this.bytePos < endPos)
            ret += String.fromCharCode(this.readUtf8Char());
        return ret;
    },
    
    readString : function() {
        // Strings stored in this format should be avoided, as it is limited to max. 255 chars long Latin/ASCII strings
        var byteLength = this.readU8();
        var ret = "";
        while (byteLength--)
            ret += String.fromCharCode(this.readU8());
        return ret;
    },

    get bytesLeft(){
        return this.bytePos >= this.size ? 0 : this.size - this.bytePos;
    },

    get bitsLeft(){
        return this.bytePos >= this.size ? 0 : (this.size - this.bytePos) * 8 - this.bitPos;
    }
}
