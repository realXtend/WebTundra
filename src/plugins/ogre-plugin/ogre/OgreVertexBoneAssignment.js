
define([
        "lib/classy",
    ], function(Class) {

var OgreVertexBoneAssignment = Class.$extend(
{
    __init__ : function(vertexIndex, boneIndex, weight)
    {
        this.vertexIndex = vertexIndex;
        this.boneIndex = boneIndex;
        this.weight = weight;
    }
});

return OgreVertexBoneAssignment;

}); // require js
