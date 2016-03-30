
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/framework/TundraLogging"
    ], function(Class, Tundra, TundraLogging) {

var IParticleEngine = Class.$extend(
/** @lends IParticleEngine.prototype */
{
    /**
        Particle engine interface.

        @constructs
    */
    __init__ : function()
    {
        this.factories = {};
        this.systems = {};
        this.log = TundraLogging.get("IParticleEngine");
    },

    registerFactory: function(factory)
    {
        if (this.factories[factory.ref])
        {
            this.log.error("Factory " + factory.name + " already registered.");
            return;
        }

        this.factories[factory.ref] = factory;
    },

    handleParticleRef: function(ref)
    {
        this.log.warn("'handleParticleRef': not implemented");
    },

    particleRefs: function()
    {
        return Object.keys(this.factories);
    }
});

return IParticleEngine;

}); // require js