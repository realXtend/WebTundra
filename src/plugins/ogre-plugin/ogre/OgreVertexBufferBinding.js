
define([
        "lib/classy",
    ], function(Class) {

var OgreVertexBufferBinding = Class.$extend(
{
    __init__ : function()
    {
        this.bindings = {};
    },

    numBindings : function()
    {
        return Object.keys(this.bindings).length;
    },

    setBinding : function(index, vertexBuffer)
    {
        this.bindings[index] = vertexBuffer;
    },

    getBinding : function(index)
    {
        return this.bindings[index];
    }
});

return OgreVertexBufferBinding;

}); // require js
