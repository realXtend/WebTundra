
define([
        "lib/three",
        "core/framework/Tundra",
        "core/math/Color",
        "entity-components/EC_ParticleSystem"
    ], function(THREE, Tundra, Color, EC_ParticleSystem) {

/**
    Sky component implementation for the three.js render system.

    @class EC_ParticleSystem_ThreeJs
    @extends EC_ParticleSystem
    @constructor
*/
var EC_ParticleSystem_ThreeJs = EC_ParticleSystem.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);
        console.log("### EC_ParticleSystem_ThreeJs init");
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset : function(forced)
    {
        console.log("### EC_ParticleSystem_ThreeJs reset");
    },

    update : function()
    {
        var particleRef = this.particleRef;
        console.log("EC_ParticleSystem_ThreeJs update", particleRef);

    },

    attributeChanged : function(index, name, value)
    {
        // particleRef
        if (index === 0)
            console.log("ParticleSystem Ref changed!", value);
    }
});

return EC_ParticleSystem_ThreeJs;

}); // require js