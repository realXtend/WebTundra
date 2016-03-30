
define([
        "lib/classy",
        "core/framework/TundraLogging"
    ], function(Class, TundraLogging) {

var IParticleFactory = Class.$extend(
/** @lends IParticleFactory.prototype */
{
    /**
        Particle factory base implementation.
        Implementations should override the respective methods.

        The reference for the implemented particle will be 'webtundra.particles.<particle_name_in_lowercase>',
        that can be passed in EC_ParticleFactory's 'particleRef' reference

        @constructs
        @param {String} name Name of the factory
    */
    __init__ : function(name)
    {
        this.log = TundraLogging.get("IParticleFactory");
        this.name = name;
        this.ref = "webtundra.particles." + name.toLowerCase();
    },

    createSystem: function(id)
    {
        this.log.warn("'createSystem' not implemented in factory named " + this.name);
    }
});

return IParticleFactory;

}); // require js