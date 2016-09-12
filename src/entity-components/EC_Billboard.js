
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

        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {string} materialRef ""
        */
        this.declareAttribute(0, "materialRef", "", Attribute.AssetReference);
        /**
            @ec_attribute {THREE.Vector3} position THREE.Vector3(0,0,0)
        */
        this.declareAttribute(1, "position", new THREE.Vector3(0,0,0), Attribute.Float3);
        /**
            @ec_attribute {number} width 1
        */
        this.declareAttribute(2, "width", 1, Attribute.Real);
        /**
            @ec_attribute {number} height 1
        */
        this.declareAttribute(3, "height", 1, Attribute.Real);
        /**
            @ec_attribute {number} rotation 0
        */
        this.declareAttribute(4, "rotation", 0, Attribute.Real);
        /**
            @ec_attribute {boolean} show true
        */
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
