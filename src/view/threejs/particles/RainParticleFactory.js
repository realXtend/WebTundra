
define([
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/renderer/IParticleFactory",
        "view/threejs/particles/GeneralParticleSystem"
    ], function(Class, Tundra, IParticleFactory, GeneralParticleSystem) {

var RainParticleFactory = IParticleFactory.$extend(
/** @lends RainParticleFactory.prototype */
{
    /**
        Rain particle.

        @extends IParticleFactory
        @constructs
    */
    __init__ : function()
    {
        this.$super("Rain");
        this.options = {
            "name"      : "Rain",
            "texture"   : "textures/droplet.png",
            "spawnRate" : 10000,
            "timeScale" : 10,
            "particle"  : {
                "position" : {
                    "x" : 0,
                    "y" : 10,
                    "z" : 0
                },
                "velocity" : {
                    "x" : 0,
                    "y" : -1,
                    "z" : 0
                },
                "positionRandomness": 50.0,
                "velocityRandomness": 0.0,
                "colorRandomness": 0.0,
                "turbulence": 0.0,
                "lifetime": 1,
                "size": 50,
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

return RainParticleFactory;

}); // require js