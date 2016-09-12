
define([
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Transform"
    ], function(IComponent, Attribute, Transform) {

var EC_Placeable = IComponent.$extend(
/** @lends EC_Placeable.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {Transform} transform
        */
        this.declareAttribute(0, "transform", new Transform(), Attribute.Transform, "Transform");
        /**
            @ec_attribute {boolean} drawDebug false
        */
        this.declareAttribute(1, "drawDebug", false, Attribute.Bool, "Show bounding box");
        /**
            @ec_attribute {boolean} visible true
        */
        this.declareAttribute(2, "visible", true, Attribute.Bool, "Visible");
        /**
            @ec_attribute {number} selectionLayer 1
        */
        this.declareAttribute(3, "selectionLayer", 1, Attribute.Int, "Selection layer");
        /**
            @ec_attribute {string} parentRef ""
        */
        this.declareAttribute(4, "parentRef", "", Attribute.EntityReference, "Parent entity ref");
        /**
            @ec_attribute {string} parentBone ""
        */
        this.declareAttribute(5, "parentBone", "", Attribute.String, "Parent bone name");
    },

    __classvars__ :
    {
        TypeId   : 20,
        TypeName : "Placeable"
    }
});

return EC_Placeable;

}); // require js
