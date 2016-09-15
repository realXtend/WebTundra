
define([
        "lib/three",
        "core/framework/Tundra",
        "core/math/Color",
        "entity-components/EC_ParticleSystem"
    ], function(THREE, Tundra, Color, EC_ParticleSystem) {

/**
    Particle system component implementation for the three.js render system.

    @class EC_ParticleSystem_ThreeJs
    @extends EC_ParticleSystem
    @constructor
*/
var EC_ParticleSystem_ThreeJs = EC_ParticleSystem.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);
        this.engine = Tundra.plugins.particleEngine.impl;
        this.properties = {};
        this.systemId = "";
        this.system = undefined;
        this.placeableCache = undefined;
        this.placeableSub = undefined;
        this.posCache = new THREE.Vector3();
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset: function()
    {
        this.engine.destroySystem(this.systemId);
        this.system = undefined;

        delete this.properties;
        this.properties = {};
    },

    update : function()
    {
        this.systemId = this.parentEntity.id + "_" + this.id;
        if (this.particleRef !== "")
            this.handleParticleRef(this.particleRef);

        this.checkAndUpdatePlaceable();

        // Register events listener for creating/removing placeable components
        this.parentEntity.onComponentCreated(this, this.onComponentCreated);
        this.parentEntity.onComponentRemoved(this, this.onComponentRemoved);
    },

    handleParticleRef: function(ref)
    {
        this.reset();
        if (ref !== "")
        {
            this.system = this.engine.createSystemFromFactory(this.systemId, ref);

            if (!this.system)
            {
                var transfer = Tundra.asset.requestAsset(ref, "Text");
                if (transfer != null)
                {
                    transfer.onCompleted(this, this._onParticleLoaded);
                    transfer.onFailed(this, this._onParticleFailed);
                }
            }
            else
            {
                this.properties = this.system.exportProperties();
                this.checkAndUpdatePlaceable();
            }
        }
    },

    _onParticleLoaded: function(asset)
    {
        this.system = this.engine.createSystem(this.systemId, asset.data);
        if (!this.system)
            return;

        this.properties = this.system.exportProperties();
        this.checkAndUpdatePlaceable();
    },

    _onParticleFailed: function(transfer, reason, metadata)
    {
        this.log.error("Failed to load particle description file: ", transfer.ref, " reason: ", reason);
    },

    _updatePosition: function()
    {
        if (this.properties.followCamera === true)
            return;
        if (this.properties.particle && this.properties.particle.position)
        {
            this.placeableCache.worldPosition(this.posCache);
            this.properties.particle.position.x = this.posCache.x;
            this.properties.particle.position.y = this.posCache.y;
            this.properties.particle.position.z = this.posCache.z;
        }
    },

    _updateVisibility: function()
    {
        if (this.system && this.placeableCache)
            this.system.visible = this.placeableCache.visible;
    },

    checkAndUpdatePlaceable: function()
    {
        if (this.placeableCache)
        {
            this._updatePosition();
            this._updateVisibility();
            return;
        }

        /* Otherwise, get read its initial position and attach an attribute change listener to it */
        if (this.hasParentEntity() && this.parentEntity.placeable)
        {
            this.placeableCache = this.parentEntity.placeable;
            this._updatePosition();
            this._updateVisibility();
            if (this.placeableSub)
            {
                Tundra.events.unsubscribe(this.placeableSub);
                delete this.placeableSub;
            }

            this.placeableSub = this.parentEntity.placeable.onAttributeChanged(this, this.onPlaceableAttributeChanged);
        }
    },

    onComponentCreated: function(ent, component)
    {
        // Check if the created component is Placeable
        if (component.typeId == 20)
            this.checkAndUpdatePlaceable();
    },

    onComponentRemoved: function(ent, component)
    {
        /* Check if the removed component is Placeable and the same placeable cached */
        if (component.typeId == 20 && this.placeableCache && this.placeableCache.id === component.id)
        {
            Tundra.events.unsubscribe(this.placeableSub);
            this.placeableSub = undefined;
            this.placeableCache = undefined;
        }
    },

    onPlaceableAttributeChanged: function(entity, component, attributeIndex)
    {
        if (attributeIndex == 0) // transform
            this._updatePosition();
        else if (attributeIndex == 2)
            this._updateVisibility();
    },

    attributeChanged : function(index, name, value)
    {
        // particleRef
        if (index === 0)
            this.handleParticleRef(value);
    }
});

return EC_ParticleSystem_ThreeJs;

}); // require js