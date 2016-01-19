
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_ParticleSystem
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_ParticleSystem
    @extends IComponent
    @constructor
*/
var EC_ParticleSystem = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property particleRef (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "particleRef", "", Attribute.AssetReference, "Particle ref");
        console.log("### EC_ParticleSystem init");
    },

    __classvars__ :
    {
        TypeId   : 27,
        TypeName : "ParticleSystem"
    }
});

return EC_ParticleSystem;

}); // require js
