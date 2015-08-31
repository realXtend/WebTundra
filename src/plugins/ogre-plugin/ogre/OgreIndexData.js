
define([
        "lib/classy",
    ], function(Class) {

var OgreIndexData = Class.$extend(
{
    __init__ : function()
    {
        this.indexStart = 0;
        this.indexCount = 0;

        this.is32bit = false;
        this.indexBuffer = null;
    },

    readIndexBuffer : function(sourceDs)
    {
        this.indexBuffer = sourceDs.readUint8Array(this.indexCount * (this.is32bit ? 4 : 2));
    }
});

return OgreIndexData;

}); // require js
