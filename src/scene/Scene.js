"use strict";
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
    this.actionTriggered = new signals.Signal();
    this.entityIdChanged = new signals.Signal();
    this.componentIdChanged = new signals.Signal();
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
            if (changeType != AttributeChange.Disconnected) {
                this.entityRemoved.dispatch(entity, changeType);
                entity.removeAllComponents(changeType);
            }
        }
        else
            console.log("Entity id " + id + " does not exist in scene, can not remove");
    },
    
    // Change an entity's id. Done in response to server sending back an authoritative id corresponding to an unacked id
    changeEntityId: function(oldId, newId) {
        if (oldId != newId)
        {
            var entity = this.entities[oldId];
            if (entity == null)
            {
                console.log("Entity id " + oldId + " not found, can not assign new id");
                return;
            }
            delete this.entities[oldId];
            entity.id = newId;
            this.entities[newId] = entity;
            
            this.entityIdChanged.dispatch(oldId, newId);
        }
    },

    // Lookup entity by id
    entityById: function(id) {
        if (this.entities.hasOwnProperty(id))
            return this.entities[id];
        else
            return null;
    },
    
    // Lookup entity by name
    entityByName: function(name) {
        for (var entityId in this.entities) {
            if (this.entities.hasOwnProperty(entityId)) {
                if (this.entities[entityId].name == name)
                    return this.entities[entityId];
            }
        }
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
    },
    
    // Trigger scene-level entity-action signal. Called by Entity
    emitActionTriggered: function(entity, name, params, execType) {
        this.actionTriggered.dispatch(entity, name, params, execType);
    },
    
    // Trigger scene-level component id change signal. Called by Entity
    emitComponentIdChanged: function(entity, oldId, newId) {
        this.componentIdChanged.dispatch(entity, oldId, newId);
    }
};
