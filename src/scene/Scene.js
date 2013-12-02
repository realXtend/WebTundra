// For conditions of distribution and use, see copyright notice in LICENSE

function Scene() {
    this.entities = {};
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


        return newEntity;
    },

    // Remove an entity from the scene by id
    removeEntity: function(id, changeType) {
        if (this.entities.hasOwnProperty(id))
            delete this.entities[id];
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
    }
}