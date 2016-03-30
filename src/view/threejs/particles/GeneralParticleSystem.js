
define([
        "lib/three",
        "lib/three/GPUParticleSystem",
        "core/renderer/IParticleSystem",
        "core/framework/Tundra",
        "core/framework/TundraLogging"
    ], function(THREE, GPUParticleSystem, IParticleSystem, Tundra, TundraLogging) {

var GeneralParticleSystem = IParticleSystem.$extend(
/** @lends GeneralParticleSystem.prototype */
{
    /**
        General purpose particle system.

        @constructs
        @extends IParticleSystem
    */
    __init__ : function(id, options)
    {
        this.$super(id);

        this.factories = {};
        this.log = TundraLogging.get("GeneralParticleSystem");
        this.cache = {
            system: undefined,
            delta: 1
        };

        this.options = $.extend(true, {
            timeScale       : 1,
            maxParticles    : 250000,
            spawnRate       : 15000,
            scaleOnCameraDistance: false
        }, options);

        this.create();
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },


    create: function()
    {
        this.cache.system = new THREE.GPUParticleSystem(this.options);
        Tundra.renderer.scene.add(this.cache.system);
    },

    onUpdate: function(frametime)
    {
        if (!this.cache.system)
            return;

        this.cache.delta = this.options.timeScale * frametime;

        for (var i = 0; i < this.options.spawnRate; ++i)
            this.cache.system.spawnParticle(this.options.particle);
        if (this.cache.delta > 0)
            this.cache.system.update(this.cache.delta);
    },

    destroy: function()
    {
        if (!this.cache.system)
            return;

        Tundra.renderer.scene.remove(this.cache.system);
        delete this.cache.system;
    },

    exportProperties: function()
    {
        var temp = {};
        var optionKeys = Object.keys(this.options);
        optionKeys.forEach(function(item)
        {
            Object.defineProperty(temp, item, {
                get: function() { return this.options[item]; }.bind(this),
                set: function(val) { this.options[item] = val; }.bind(this)
            });
        }.bind(this));

        return temp;
    },

    exportProperty: function(obj, key)
    {
        Object.defineProperty(obj, key, {
            get: function() { return this.options[key]; },
            set: function(val) { this.options[key] = val; }
        });
    }
});

return GeneralParticleSystem;

}); // require js