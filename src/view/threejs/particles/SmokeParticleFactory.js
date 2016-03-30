
define([
        "core/renderer/IParticleFactory",
        "view/threejs/particles/GeneralParticleSystem"
    ], function(IParticleFactory, GeneralParticleSystem) {

var SmokeParticleFactory = IParticleFactory.$extend(
/** @lends SmokeParticleFactory.prototype */
{
    /**
        Smoke particle.

        @constructs
        @extends IParticleFactory
    */
    __init__ : function()
    {
        this.$super("Smoke");
        this.options = {
            "name": "Smoke",
            "texture" : "textures/smoke.png",
            "spawnRate" : 10,
            "timeScale" : 0.1,
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
                    "x" : 0,
                    "y" : 1,
                    "z" : 0
                },
                "color" : 0x222222,
                "positionRandomness": 0.0,
                "velocityRandomness": 1.0,
                "colorRandomness": 0.0,
                "turbulence": 0.0,
                "lifetime": 0.4,
                "size": 100,
                "sizeRandomness": 0.0,
                "smoothPosition": true
            }
        };
    },

    createSystem: function(id)
    {
        return new GeneralParticleSystem(id, this.options);
    }
});

return SmokeParticleFactory;

}); // require js