
define([
        "lib/classy",
        "plugins/ogre-plugin/ogre/OgreIndexData",
        "plugins/ogre-plugin/ogre/OgreVertexData"
    ], function(Class, OgreIndexData, OgreVertexData) {

var OgreSubMesh = Class.$extend(
{
    __init__ : function()
    {
        this.name = "";
        this.index = undefined;

        this.materialName = "";
        this.useSharedVertices = false;

        this.indexData = new OgreIndexData();
        this.vertexData = null;

        this.operationType = undefined;

        this.boneAssignments = {};
    },

    addBoneAssignment : function(ogreVertexBoneAssignment)
    {
        if (this.boneAssignments[ogreVertexBoneAssignment.vertexIndex] === undefined)
            this.boneAssignments[ogreVertexBoneAssignment.vertexIndex] = [];
        this.boneAssignments[ogreVertexBoneAssignment.vertexIndex].push(ogreVertexBoneAssignment);
    },

    getBoneAssignmentsForVertexIndex : function(vertexIndex)
    {
        if (this.boneAssignments[vertexIndex] === undefined)
            this.boneAssignments[vertexIndex] = [];
        return this.boneAssignments[vertexIndex];
    },

    numBoneAssignments : function()
    {
        return Object.keys(this.boneAssignments).length;
    }
});

return OgreSubMesh;

}); // require js
