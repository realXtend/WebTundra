
define([
        "lib/three",
        "core/framework/Tundra",
        "core/math/Color",
        "entity-components/EC_ParticleSystem",
        "lib/GPUParticleSystem",
        "lib/SmokeParticleSystem"
    ], function(THREE, Tundra, Color, EC_ParticleSystem, GPUParticleSystem, SmokeParticleSystem) {

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
        this.cache._startParticleSpawn = false;
    },

    update : function()
    {
        var particleRef = this.particleRef;
        if(particleRef)
        {
            var transfer = Tundra.asset.requestAsset(particleRef, "Text");
            if (transfer != null)
                transfer.onCompleted(this, this._particlePropertiesLoaded);
        }
                
        this.cache = {
            _placeable: undefined,
            // options passed during each spawned
            _type: "dots",
            _options: {
                position: new THREE.Vector3(),
                positionRandomness: .0,
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
            _startParticleSpawn: false
        };

        this.checkAndUpdatePlaceable();

        // Register events listener for creating/removing placeable components 
        this.parentEntity.onComponentCreated(this, this.onComponentCreated);
        this.parentEntity.onComponentRemoved(this, this.onComponentRemoved);

        this.updater = Tundra.frame.onUpdate(this, this.onUpdate);        
    },

    _particlePropertiesLoaded: function(asset)
    {
        var loadedOptions = asset.data;
        console.log(loadedOptions);
        if(loadedOptions && loadedOptions.type && loadedOptions.options){

            $.extend(true, this.cache._options, loadedOptions.options);

            if(loadedOptions.type == "dots"){
                this.cache._particleSystem = new THREE.GPUParticleSystem({
                    maxParticles: 250000
                });
            } else if (loadedOptions.type == "smoke") {
                this.cache._particleSystem = new THREE.SmokeParticleSystem(this.cache._options);
            }
            
            Tundra.renderer.scene.add(this.cache._particleSystem);

            this.cache._type = loadedOptions.type;
            this.cache._startParticleSpawn = true;
        }
    },

    onUpdate: function(time)
    {
        if(!this.cache._startParticleSpawn)
            return;

        var pOptions = this.cache._options;
        var spawnerOptions = this.cache._spawnerOptions; 

        var delta = time * spawnerOptions.timeScale;

        if (delta > 0) {
            if(this.cache._type == 'dots') {
                for (var x = 0; x < spawnerOptions.spawnRate * delta; x++) {
                  // Yep, that's really it.  Spawning particles is super cheap, and once you spawn them, the rest of
                  // their lifecycle is handled entirely on the GPU, driven by a time uniform updated below
                  this.cache._particleSystem.spawnParticle(pOptions);
                }
                this.cache._particleSystem.update(delta);
            } else if (this.cache._type == 'smoke') {
                this.cache._particleSystem.position.set(pOptions.position.x, pOptions.position.y, pOptions.position.z);
                this.cache._particleSystem.update(delta);
            }
        }

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