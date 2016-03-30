
define([
        "lib/classy",
        "core/framework/TundraLogging"
    ], function(Class, TundraLogging) {

var IParticleSystem = Class.$extend(
/** @lends IParticleSystem.prototype */
{
    /**
        Particle system interface.

        @constructs
    */
    __init__ : function(id)
    {
        this.id = id;
        this.factories = {};
        this.log = TundraLogging.get("IParticleSystem");
    },

    create: function()
    {
        this.log.warn("'create' not implemented");
    },

    onUpdate: function()
    {
        this.log.warn("'onUpdate' not implemented");
    },

    destroy: function()
    {
        this.log.warn("'destroy' not implemented");
    },

    exportProperties: function()
    {
        this.log.warn("'exportProperties' not implemented");
    }
});

return IParticleSystem;

}); // require js