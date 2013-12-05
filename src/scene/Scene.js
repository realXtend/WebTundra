// For conditions of distribution and use, see copyright notice in LICENSE

function Scene() {
    this.entities = {};
    this.entityIdGenerator = new UniqueIdGenerator();
    this.attributeChanged = new signals.Signal();
    this.attributeAdded = new signals.Signal();
    this.attributeRemoved = new signals.Signal();
    this.componentAdded = new signals.Signal();
    this.componentRemoved = new signals.Signal();
    this.entityCreated = new signals.Signal();
    this.entityRemoved = new signals.Signal();
}

Scene.prototype = {
    // Create an entity to the scene by id
    createEntity: function(id, changeType) {
        // If zero ID, assign ID now
        if (id == 0)
        {
            if (changeType == AttributeChange.LocalOnly)
                id = this.entityIdGenerator.allocateLocal();
            else
                id = this.entityIdGenerator.allocateUnacked();
        }

        if (this.entityById(id))
        {
            console.log("Entity id " + id + " already exists in scene, can not create");
            return null;
        }
        var newEntity = new Entity();
        newEntity.parentScene = this;
        newEntity.id = id;
        this.entities[id] = newEntity;

        if (changeType == null || changeType == AttributeChange.Default)
            changeType = newEntity.local ? AttributeChange.LocalOnly : AttributeChange.Replicate;
        if (changeType != AttributeChange.Disconnected)
            this.entityCreated.dispatch(newEntity, changeType);

        return newEntity;
    },

    // Remove an entity from the scene by id
    removeEntity: function(id, changeType) {
        if (this.entities.hasOwnProperty(id))
        {
            var entity = this.entities[id];
            delete this.entities[id];

            if (changeType == null || changeType == AttributeChange.Default)
                changeType = entity.local ? AttributeChange.LocalOnly : AttributeChange.Replicate;
            if (changeType != AttributeChange.Disconnected)
                this.entityRemoved.dispatch(entity, changeType);
        }
        else
            console.log("Entity id " + id + " does not exist in scene, can not remove");
    },

    // Lookup entity by id
    entityById: function(id) {
        if (this.entities.hasOwnProperty(id))
            return this.entities[id];
        else
            return null;
    },
    
    // Trigger scene-level attribute change signal. Called by Component
    emitAttributeChanged : function(comp, attr, changeType) {
        if (changeType == AttributeChange.Disconnected)
            return;
        this.attributeChanged.dispatch(comp, attr, changeType);
    },

    // Trigger scene-level attribute added signal. Called by Component
    emitAttributeAdded : function(comp, attr, changeType) {
        if (changeType == AttributeChange.Disconnected)
            return;
        this.attributeAdded.dispatch(comp, attr, changeType);
    },

    // Trigger scene-level attribute removed signal. Called by Component
    emitAttributeRemoved : function(comp, attr, changeType) {
        if (changeType == AttributeChange.Disconnected)
            return;
        this.attributeRemoved.dispatch(comp, attr, changeType);
    },
    
    // Trigger scene-level component added signal. Called by Entity
    emitComponentAdded : function(entity, comp, changeType) {
        if (changeType == AttributeChange.Disconnected)
            return;
        this.componentAdded.dispatch(entity, comp, changeType);
    },

    // Trigger scene-level component removed signal. Called by Entity
    emitComponentRemoved : function(entity, comp, changeType) {
        if (changeType == AttributeChange.Disconnected)
            return;
        this.componentRemoved.dispatch(entity, comp, changeType);
    }
}