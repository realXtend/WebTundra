
define([
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Transform"
    ], function(IComponent, Attribute, Transform) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Placeable
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Placeable
    @extends IComponent
    @constructor
*/
var EC_Placeable = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property transform (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "transform", new Transform(), Attribute.Transform);
        /**
            @property drawDebug (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "drawDebug", false, Attribute.Bool);
        /**
            @property visible (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "visible", true, Attribute.Bool);
        /**
            @property selectionLayer (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "selectionLayer", 1, Attribute.Int);
        /**
            @property parentRef (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "parentRef", "", Attribute.EntityReference);
        /**
            @property parentBone (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "parentBone", "", Attribute.String);
    }
});

return EC_Placeable;

}); // require js
