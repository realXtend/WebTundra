
define([
        "lib/classy",
        "plugins/ogre-plugin/ogre/OgreVertexData"
    ], function(Class, OgreVertexData) {

var OgreMesh = Class.$extend(
{
    __init__ : function()
    {
        this.submeshes = [];
        this.sharedVertexData = null;

        this.skeletonName = "";

        this.boneAssignments = {};

        this.AABB =
        {
            min : { x : 0, y : 0, z :0 },
            max : { x : 0, y : 0, z :0 }
        };
        this.radius = 0;
    },

    numSubmeshes : function()
    {
        return this.submeshes.length;
    },

    getSubmesh : function(index)
    {
        if (this.numSubmeshes() > index)
            return this.submeshes[index];
        return null;
    },

    addSubmesh : function(submesh)
    {
        this.submeshes.push(submesh);
    },

    addBoneAssignment : function(vertBoneAssign)
    {
        this.boneAssignments[vertBoneAssign.vertexIndex] = vertBoneAssign;
    },

    numBoneAssignments : function()
    {
        return Object.keys(this.boneAssignments).length;
    }
});

return OgreMesh;

}); // require js
