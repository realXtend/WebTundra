
define([
        "core/renderer/IParticleFactory",
        "plugins/particle-engine/particles/GeneralParticleSystem"
    ], function(IParticleFactory, GeneralParticleSystem) {

var StardustParticleFactory = IParticleFactory.$extend(
/** @lends StardustParticleFactory.prototype */
{
    /**
        Stardust particle.

        @extends IParticleFactory
        @constructs
    */
    __init__ : function()
    {
        this.$super("Stardust");
        this.options = {
            "name": "Stardust",
            "texture" : Tundra.asset.resolveRef("webtundra://media/textures/star.png"),
            "spawnRate" : 1000,
            "timeScale" : 0.2,
            "scaleOnCameraDistance": true,
            "magicNumber" : 10.0,
            "containerCount" : 1,
            "particle" : {
                "position" : {
                    "x" : 0,
                    "y" : 0,
                    "z" : 0
                },
                "velocity" : {
                    "x" : 1,
                    "y" : 1,
                    "z" : 1
                },
                "color" : 0xffffff,
                "positionRandomness": 0.0,
                "velocityRandomness": 10.0,
                "colorRandomness": 0.0,
                "turbulence": 10.0,
                "lifetime": 1.0,
                "size": 100,
                "sizeRandomness": 10.0,
                "smoothPosition": true
            }
        };
    },

    createSystem: function(id)
    {
        return new GeneralParticleSystem(id, this.options);
    }
});

return StardustParticleFactory;

}); // require js