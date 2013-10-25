// For conditions of distribution and use, see copyright notice in LICENSE

function DataDeserializer(arrayBuffer) {
    this.arrayBuffer = arrayBuffer;
    this.bytes = new Uint8Array(arrayBuffer);
    this.bitPos = 0;
    this.bytePos = 0;
    this.size = this.bytes.length;
}

DataDeserializer.prototype = {
    resetTraversal: function() {
        this.bitPos = 0;
        this.bytePos = 0;
    },

    readU8 : function() {
        if (this.bitPos == 0)
            return this.bytes[this.bytePos++];
        else
            return this.readBits(8);
    },

    readU16 : function() {
        return this.readU8() | (this.readU8() << 8);
    },

    readU32 : function() {
        return this.readU8() | (this.readU8() << 8) | (this.readU8() << 16) | (this.readU8() << 24);
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

    readBits : function(bitCount) {
        var ret = 0;
        var shift = 0;
        while (bitCount > 0) {
            if (this.bytes[this.bytePos] & (1 << this.bitPos))
                ret = ret | (1 << shift);
            this.bitPos++;
            if (this.bitPos > 7) {
                this.bitPos = 0;
                this.bytePos++;
            }
            shift++;
            bitCount--;
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

    readUtf8String : function() {
        var endPos = this.bytePos + this.readU16();
        var ret = "";
        while (this.bytePos < endPos)
            ret += String.fromCharCode(this.readUtf8Char());
    },

    bytesLeft : function() {
        return this.bytePos >= this.size ? 0 : this.size - this.bytePos;
    },
    
    bitsLeft : function() {
        return this.bytePos >= this.size ? 0 : (this.size - this.bytePos) * 8 - this.bitPos;
    }
}
