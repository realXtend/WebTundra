
define([
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Transform"
    ], function(IComponent, Attribute, Transform) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Mesh
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Mesh
    @extends IComponent
    @constructor
*/
var EC_Mesh = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property nodeTransformation (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "nodeTransformation", new Transform(), Attribute.Transform);
        /**
            @property meshRef (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "meshRef", "", Attribute.AssetReference);
        /**
            @property skeletonRef (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "skeletonRef", "", Attribute.AssetReference);
        /**
            @property materialRefs (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "materialRefs", "", Attribute.AssetReferenceList);
        /**
            @property drawDistance (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "drawDistance", 0, Attribute.Real);
        /**
            @property castShadows (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "castShadows", false, Attribute.Bool);
    }
});

return EC_Mesh;

}); // require js
