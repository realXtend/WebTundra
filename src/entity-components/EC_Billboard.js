
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, IComponent, Attribute) {

var EC_Billboard = IComponent.$extend(
/** @lends EC_Billboard.prototype */
{
    /**
        Renders a billboard aka sprite from a material or texture reference.

        @constructs
        @private
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.declareAttribute(0, "materialRef", "", Attribute.AssetReference);
        this.declareAttribute(1, "position", new THREE.Vector3(0,0,0), Attribute.Float3);
        this.declareAttribute(2, "width", 1, Attribute.Real);
        this.declareAttribute(3, "height", 1, Attribute.Real);
        this.declareAttribute(4, "rotation", 0, Attribute.Real);
        this.declareAttribute(5, "show", true, Attribute.Bool);
    },

    __classvars__ :
    {
        TypeId   : 2,
        TypeName : "Billboard"
    }
});

return EC_Billboard;

}); // require js
