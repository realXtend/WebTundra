
define([
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "plugins/particle-engine/ThreeJsParticleEngine"
    ], function(Tundra, ITundraPlugin, ThreeJsParticleEngine) {

var ParticleEnginePlugin = ITundraPlugin.$extend(
/** @lends ParticleEnginePlugin.prototype */
{
    /**
        Particle engine plugin, registers the particle engine and its components and factories

        @extends ITundraPlugin
        @constructs
    */
    __init__ : function()
    {
        this.$super("ParticleEnginePlugin", [ "ParticleEngine" ]);
        this.impl = null;
    },

    /// ITundraPlugin override
    pluginPropertyName : function()
    {
        return "particleEngine";
    },

    initialize : function()
    {
        this.impl = new ThreeJsParticleEngine();
    },

    postInitialize: function()
    {
        this.impl.registerComponents();
        this.impl.registerParticleFactories();
    }
});

Tundra.registerPlugin(new ParticleEnginePlugin());

return ParticleEnginePlugin;

}); // require js
