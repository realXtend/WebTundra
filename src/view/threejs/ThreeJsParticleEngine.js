
define([
        "core/framework/Tundra",
        "lib/three",
        "core/scene/Scene",
        "core/renderer/IParticleEngine",
        "view/threejs/entity-components/EC_ParticleSystem_ThreeJs",
        "view/threejs/particles/GeneralParticleSystem",
        "view/threejs/particles/RainParticleFactory",
        "view/threejs/particles/SmokeParticleFactory",
        "view/threejs/particles/StardustParticleFactory"
    ], function(Tundra, THREE, Scene, IParticleEngine, EC_ParticleSystem_ThreeJs,
        GeneralParticleSystem,
        RainParticleFactory,
        SmokeParticleFactory,
        StardustParticleFactory) {

var ThreeJsParticleEngine = IParticleEngine.$extend(
/** @lends ThreeJsParticleEngine.prototype */
{
    /**
        ThreeJs particle engine.

        @extends IParticleEngine
        @constructs
    */

    __init__ : function()
    {
        this.$super();
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    registerComponents: function()
    {
        Scene.registerComponent(EC_ParticleSystem_ThreeJs);
    },

    registerParticleFactories: function()
    {
        this.registerFactory(new RainParticleFactory());
        this.registerFactory(new SmokeParticleFactory());
        this.registerFactory(new StardustParticleFactory());

        Tundra.frame.onUpdate(this, this.onUpdate);
    },

    createSystem: function(id, options)
    {
        if (typeof id !== "string" || id === "")
        {
            this.log.error("'createSystem': invalid 'id' supplied:", id);
        }
        if (typeof options !== "object" || $.isEmptyObject(options))
        {
            this.log.error("'createSystem': invalid 'options' object supplied:", options);
            return undefined;
        }

        if (!this.systems[id])
            this.systems[id] = new GeneralParticleSystem(id, options);

        return this.systems[id];
    },

    createSystemFromFactory: function(id, ref)
    {
        if (typeof id !== "string" || id === "")
        {
            this.log.error("'createSystemFromFactory': invalid 'id' supplied:", id);
            return undefined;
        }
        if (typeof ref !== "string" || ref === "")
        {
            this.log.error("'createSystemFromFactory': invalid 'ref' supplied:", ref);
            return undefined;
        }

        if (!this.isFactoryRegisteredForRef(ref))
            return undefined;

        this.systems[id] = this.factories[ref].createSystem(id);
        return this.systems[id];
    },

    isFactoryRegisteredForRef: function(ref)
    {
        return !!this.factories[ref];
    },

    destroySystem: function(id)
    {
        if (this.systems[id])
        {
            this.systems[id].destroy();
            delete this.systems[id];
        }
    },

    onUpdate: function(frametime)
    {
        var keys = Object.keys(this.systems);
        for (var i = 0, len = keys.length; i < len; ++i)
            this.systems[keys[i]].onUpdate(frametime);
    },

    __classvars__ :
    {
        Implementation : "three.js"
    }
});

return ThreeJsParticleEngine;

}); // require js