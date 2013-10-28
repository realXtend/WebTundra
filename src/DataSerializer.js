// For conditions of distribution and use, see copyright notice in LICENSE

function DataSerializer(lengthBytes) {
    this.arrayBuffer = new ArrayBuffer(lengthBytes);
    this.bytes = new Uint8Array(this.arrayBuffer);
    this.bitPos = 0;
    this.bytePos = 0;
}

DataSerializer.prototype = {
    addU8 : function(value) {
        if (this.bitPos == 0)
            this.bytes[this.bytePos++] = value;
        else
            this.addBits(8, value);
    },

    addU16 : function(value) {
        this.addU8(value & 255);
        this.addU8(value >> 8);
    },

    addU32 : function(value) {
        this.addU8(value & 255);
        this.addU8((value >> 8) & 255);
        this.addU8((value >> 16) & 255);
        this.addU8((value >> 24) & 255);
    },

    addFloat : function(value) {
        var floatBuf = new ArrayBuffer(4);
        var floatView = new Float32Array(floatBuf);
        var byteView = new Uint8Array(floatBuf);
        floatView[0] = value;
        this.addU8(byteView[0]);
        this.addU8(byteView[1]);
        this.addU8(byteView[2]);
        this.addU8(byteView[3]);
    },

    addVLE : function(value) {
        if (value < 128)
            this.addU8(value);
        else if (value < 16384) {
            this.addU8((value & 127) | 128);
            this.addU8(value >> 7);
        }
        else {
            this.addU8((value & 127) | 128);
            this.addU8(((value >> 7) & 127) | 128);
            this.addU16(value >> 14);
        }
    },

    addBits : function(bitCount, value) {
        var shift = 0;
        while (bitCount > 0) {
            if (value & (1 << shift))
                this.bytes[this.bytePos] = this.bytes[this.bytePos] | (1 << this.bitPos);
            else
                this.bytes[this.bytePos] = this.bytes[this.bytePos] & (255 - (1 << this.bitPos));
            this.bitPos++;
            if (this.bitPos > 7) {
                this.bitPos = 0;
                this.bytePos++;
            }
            shift++;
            bitCount--;
        }
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
            addU8(0x80 | (value & 0x3f));
        }
        else if (value < 0x10000) {
            addU8(0xe0 | ((value >> 12) & 0xf));
            addU8(0x80 | ((value >> 6) & 0x3f));
            addU8(0x80 | (value & 0x3f));
        }
        else if (value < 0x200000) {
            addU8(0xf0 | ((value >> 18) & 0x7));
            addU8(0x80 | ((value >> 12) & 0x3f));
            addU8(0x80 | ((value >> 6) & 0x3f));
            addU8(0x80 | (value & 0x3f));
        }
        else if (value < 0x4000000) {
            addU8(0xf8 | ((value >> 24) & 0x3));
            addU8(0x80 | ((value >> 18) & 0x3f));
            addU8(0x80 | ((value >> 12) & 0x3f));
            addU8(0x80 | ((value >> 6) & 0x3f));
            addU8(0x80 | (value & 0x3f));
        }
        else {
            addU8(0xfc | ((value >> 30) & 0x1));
            addU8(0x80 | ((value >> 24) & 0x3f));
            addU8(0x80 | ((value >> 18) & 0x3f));
            addU8(0x80 | ((value >> 12) & 0x3f));
            addU8(0x80 | ((value >> 6) & 0x3f));
            addU8(0x80 | (value & 0x3f));
        }
    },

    addUtf8String : function(value) {
        this.addU16(this.countUtf8ByteSize(value));
        for (var i = 0; i < value.length; i++)
            this.addUtf8Char(value.charCodeAt(i));
    },

    bytesFilled : function() {
        if (this.bitPos == 0)
            return this.bytePos;
        else
            return this.bytePos + 1;
    },
    
    truncate : function() {
        var newLength = this.bytesFilled();
        this.arrayBuffer = this.arrayBuffer.slice(0, newLength);
        this.bytes = new Uint8Array(this.arrayBuffer);
    }
}