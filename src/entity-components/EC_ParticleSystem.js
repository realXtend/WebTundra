
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

var EC_ParticleSystem = IComponent.$extend(
/** @lends EC_ParticleSystem.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {string} particleRef ""
        */
        this.declareAttribute(0, "particleRef", "", Attribute.AssetReference, "Particle ref");
    },

    __classvars__ :
    {
        TypeId   : 27,
        TypeName : "ParticleSystem"
    }
});

return EC_ParticleSystem;

}); // require js
