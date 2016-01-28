
define([
        "lib/three",
        "core/framework/Tundra",
        "core/math/Color",
        "entity-components/EC_ParticleSystem",
        "lib/GPUParticleSystem"
    ], function(THREE, Tundra, Color, EC_ParticleSystem, GPUParticleSystem) {

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
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset : function(forced)
    {
        if (this.cache._particleSystem)
            if (this.cache._particleSystem.parent)
                this.cache._particleSystem.parent.remove(this.cache._particleSystem);

        // Check how OgreMeshAsset clears Geometry
        this.cache._particleSystem = undefined;
    },

    update : function()
    {
        var particleRef = this.particleRef;
        // TODO: Load parameters from particleRef JSON file
        
        this.cache = {
            _particleSystem: new THREE.GPUParticleSystem({
                maxParticles: 250000
            }),
            _placeable: undefined,
            // options passed during each spawned
            _options: {
                position: new THREE.Vector3(),
                positionRandomness: .3,
                velocity: new THREE.Vector3(),
                velocityRandomness: .5,
                color: 0xaa88ff,
                colorRandomness: .2,
                turbulence: .5,
                lifetime: 2,
                size: 5,
                sizeRandomness: 1
            },
            _spawnerOptions:
            {
                spawnRate: 15000,
                horizontalSpeed: 1.5,
                verticalSpeed: 1.33,
                timeScale: 1
            },
            _tick: 0
        };

        Tundra.renderer.scene.add(this.cache._particleSystem);

        this.checkAndUpdatePlaceable();

        // Register events listener for creating/removing placeable components 
        this.parentEntity.onComponentCreated(this, this.onComponentCreated);
        this.parentEntity.onComponentRemoved(this, this.onComponentRemoved);

        this.updater = Tundra.frame.onUpdate(this, this.onUpdate);        
    },

    onUpdate: function(time)
    {
        var pOptions = this.cache._options;
        var spawnerOptions = this.cache._spawnerOptions; 

        var delta = time * spawnerOptions.timeScale;
        this.cache._tick += delta;
        if (this.cache._tick < 0) this.cache._tick = 0;
        var tick = this.cache._tick; 

        if (delta > 0) {
            for (var x = 0; x < spawnerOptions.spawnRate * delta; x++) {
              // Yep, that's really it.  Spawning particles is super cheap, and once you spawn them, the rest of
              // their lifecycle is handled entirely on the GPU, driven by a time uniform updated below
              this.cache._particleSystem.spawnParticle(pOptions);
            }
        }

        this.cache._particleSystem.update(tick);

    },

    _updatePosition: function()
    {
        if (this.cache._placeable)
        {
            this.parentEntity.placeable.worldPosition(this.cache._options.position);
        }
    },

    checkAndUpdatePlaceable: function()
    {
        /* If there is already a placeable attached do nothing (only first placeable component is considered) */
        if (this.cache._placeable)
            return;

        /* Otherwise, get read its initial position and attach an attribute change listener to it */
        if (this.hasParentEntity() && this.parentEntity.placeable)
        {
            this.cache._placeable = this.parentEntity.placeable;
            this._updatePosition();

            // TODO: Check if unsubscribe is required later
            this.parentEntity.placeable.onAttributeChanged(this, this.onPlaceableAttributeChanged);
        }
    },

    onComponentCreated: function(ent, component)
    {
        // Check if the created component is Placeable
        if (component.typeId == 20)
        {
            this.checkAndUpdatePlaceable();
        }
    },

    onComponentRemoved: function(ent, component)
    {
        /* Check if the removed component is Placeable and the same placeable cached */
        if (component.typeId == 20 && this.cache._placeable && this.cache._placeable.id === component.id)
        {
            this.cache._placeable = undefined;
        }
    },

    onPlaceableAttributeChanged: function(entity, component, attributeIndex, attributeName, attributeValue)
    {
        if (attributeIndex == 0) // transform
            this._updatePosition();
    },


    attributeChanged : function(index, name, value)
    {
        // particleRef
        if (index === 0)
            console.log("ParticleSystem Ref changed, new value", value);
    }
});

return EC_ParticleSystem_ThreeJs;

}); // require js