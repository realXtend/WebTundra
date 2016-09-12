
define([
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Transform"
    ], function(IComponent, Attribute, Transform) {

var EC_Mesh = IComponent.$extend(
/** @lends EC_Mesh.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {Transform} nodeTransformation
        */
        this.declareAttribute(0, "nodeTransformation", new Transform(), Attribute.Transform, "Transform");
        /**
            @ec_attribute {string} meshRef ""
        */
        this.declareAttribute(1, "meshRef", "", Attribute.AssetReference, "Mesh ref");
        /**
            @ec_attribute {string} skeletonRef ""
        */
        this.declareAttribute(2, "skeletonRef", "", Attribute.AssetReference, "Skeleton ref");
        /**
            @ec_attribute {Array.<string>} materialRefs []
        */
        this.declareAttribute(3, "materialRefs", [], Attribute.AssetReferenceList, "Mesh materials");
        /**
            @ec_attribute {number} drawDistance 0
        */
        this.declareAttribute(4, "drawDistance", 0, Attribute.Real, "Draw distance");
        /**
            @ec_attribute {boolean} castShadows false
        */
        this.declareAttribute(5, "castShadows", false, Attribute.Bool, "Cast shadows");
    },

    __classvars__ :
    {
        TypeId   : 17,
        TypeName : "Mesh"
    }
});

return EC_Mesh;

}); // require js
