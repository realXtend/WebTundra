
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, IComponent, Attribute) {

var EC_Hydrax = IComponent.$extend(
/** @lends EC_Hydrax.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {string} configRef ""
        */
        this.declareAttribute(0, "configRef", "", Attribute.AssetReference);
        /**
            @ec_attribute {boolean} visible true
        */
        this.declareAttribute(1, "visible", true, Attribute.Bool);
        /**
            @ec_attribute {THREE.Vector3} position THREE.Vector3(0,0,0)
        */
        this.declareAttribute(2, "position", new THREE.Vector3(0,0,0), Attribute.Float3);
    },

    __classvars__ :
    {
        TypeId   : 39,
        TypeName : "Hydrax"
    }
});

return EC_Hydrax;

}); // require js
