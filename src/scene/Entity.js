"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE

var cExecTypeLocal = 1;
var cExecTypeServer = 2;
var cExecTypePeers = 4;

function Entity() {
    this.components = {};
    this.children = [];
    this.parentScene = null;
    this.parent = null;
    this.id = 0;
    this.temporary = false;
    this.componentIdGenerator = new UniqueIdGenerator();
    this.componentAdded = new signals.Signal();
    this.componentRemoved = new signals.Signal();
    this.actionTriggered = new signals.Signal();
    this.componentIdChanged = new signals.Signal();
    this.parentChanged = new signals.Signal();
}

Entity.prototype = {
    createComponent: function(id, typeId, name, changeType) {
        // If zero ID, assign ID now
        if (id == 0)
        {
            // If entity itself is local, create only local components
            if (this.local == true || changeType == AttributeChange.LocalOnly)
                id = this.componentIdGenerator.allocateLocal();
            else
                id = this.componentIdGenerator.allocateUnacked();
        }

        if (this.componentById(id))
        {
            console.log("Component id " + id + " in entity " + this.id + " already exists, can not create");
            return null;
        }
        var newComp = createComponent(typeId);
        if (newComp)
        {
            newComp.id = id;
            newComp.parentEntity = this;
            if (name != null)
                newComp.name = name;
            this.components[id] = newComp;
            // Register direct access by type
            var propName = sanitatePropertyName(newComp.typeName);
            if (this[propName] === undefined)
                this[propName] = newComp;
        }
        else
        {
            return null;
        }
                
        if (changeType == null || changeType == AttributeChange.Default)
            changeType = newComp.local ? AttributeChange.LocalOnly : AttributeChange.Replicate;
        if (changeType != AttributeChange.Disconnected)
        {
            // Trigger scene level signal
            if (this.parentScene)
                this.parentScene.emitComponentAdded(this, newComp, changeType);
            // Trigger entity level signal
            this.componentAdded.dispatch(newComp, changeType);
        }

        return newComp;
    },

    removeComponent: function(id, changeType) {
        if (this.components.hasOwnProperty(id))
        {
            var comp = this.components[id];
            delete this.components[id];
            // Remove direct access by type
            var propName = sanitatePropertyName(comp.typeName);
            if (this[propName] === comp)
                delete this[propName];
                
            if (changeType == null || changeType == AttributeChange.Default)
                changeType = comp.local ? AttributeChange.LocalOnly : AttributeChange.Replicate;
            if (changeType != AttributeChange.Disconnected)
            {
                // Trigger scene level signal
                if (this.parentScene)
                    this.parentScene.emitComponentRemoved(this, comp, changeType);
                // Trigger entity level signal
                this.componentRemoved.dispatch(comp, changeType);
            }
        }
        else
            console.log("Component id " + id + " in entity " + this.id + " does not exist, can not remove");
    },

    removeAllComponents: function(changeType) {
        for (var compId in this.components) {
            this.removeComponent(compId, changeType);
        }
    },

    triggerAction: function(name, params, execType) {
        if (execType == null)
            execType = cExecTypeLocal;
        this.actionTriggered.dispatch(name, params, execType);
        // Trigger scene level signal
        if (this.parentScene)
            this.parentScene.emitActionTriggered(this, name, params, execType);
    },

    // Change a component's id. Done in response to server sending back an authoritative id corresponding to an unacked id
    changeComponentId: function(oldId, newId) {
        if (oldId != newId)
        {
            var comp = this.components[oldId];
            if (comp == null)
            {
                console.log("Component id " + oldId + " not found, can not assign new id");
                return;
            }
            delete this.components[oldId];
            comp.id = newId;
            this.components[newId] = comp;

            this.componentIdChanged.dispatch(oldId, newId);
            // Trigger scene level signal
            if (this.parentScene)
                this.parentScene.emitComponentIdChanged(this, oldId, newId);
        }
    },

    componentById: function(id) {
        if (this.components.hasOwnProperty(id))
            return this.components[id];
        else
            return null;
    },
    
    componentByType: function(typeId, name) {
        // Convert typename to numeric ID if necessary
        if (typeof typeId == 'string' || typeId instanceof String)
            typeId = componentTypeIds[typeId];
        for (var compId in this.components) {
            if (this.components.hasOwnProperty(compId) && this.components[compId].typeId == typeId) {
                if (name == null || this.components[compId].name == name)
                    return this.components[compId];
            }
        }
        return null;
    },
    
    addChild: function(child, changeType) {
        if (child == null)
            return;

        child.setParent(this, changeType);
    },

    removeChild: function(child, changeType) {
        if (child == null)
            return;
            
        if (child.parent != this) {
            console.log("Entity " + child.id + " is not parented to this entity, can not remove");
            return;
        }

        // Simply remove from the scene, which will also set the child's parent to null
        if (this.parentScene)
            this.parentScene.removeEntity(child.id, changeType);
        else
            console.log("Null parent scene, can not remove child entity");
    },

    removeAllChildren: function(changeType) {
        while (this.children.length > 0)
            removeChild(this.children[this.children.length - 1], changeType);
    },

    detachChild: function(child, changeType) {
        if (child == null)
            return;
            
        if (child.parent != this) {
            console.log("Entity " + child.id + " is not parented to this entity, can not detach");
            return;
        }
        
        child.setParent(null, changeType);
    },
    
    setParent: function(newParent, changeType) {
        if (this.parent == newParent)
            return; // Nothing to do
            
        if (newParent == this) {
            console.log("Attempted to parent entity to self");
            return;
        }

        // Check for and prevent cyclic assignment
        var parentCheck = newParent;
        while (parentCheck) {
            if (parentCheck == this) {
                console.log("Attempted to cyclically parent an entity");
                return;
            }
            parentCheck = parentCheck.parent;
        }

        // Remove from old parent's child vector
        if (this.parent) {
            var index = this.parent.children.indexOf(this);
            if (index > -1)
                this.parent.children.splace(index, 1);
        }
        
        // Add to the new parent's child vector
        if (newParent)
            newParent.children.push(this);
        this.parent = newParent;

        // Signal
        if (changeType == null || changeType == AttributeChange.Default)
            changeType = this.local ? AttributeChange.LocalOnly : AttributeChange.Replicate;
        if (changeType != AttributeChange.Disconnected) {
            this.parentChanged.dispatch(this, newParent, changeType);
            if (this.parentScene)
                this.parentScene.emitEntityParentChanged(this, newParent, changeType);
        }
    },
    
    createChild: function(id, changeType) {
        var childEntity = this.parentScene.createEntity(id, changeType);
        if (childEntity)
            childEntity.setParent(this, changeType);
    },

    get local(){
        return this.id >= cFirstLocalId;
    },

    get unacked(){
        return this.id >= cFirstUnackedId && this.id < cFirstLocalId;
    },

    get name()
    {
        var nameComp = this.componentByType(cComponentTypeName);
        if (nameComp) {
            var nameAttr = nameComp.attributeById("name");
            return nameAttr.value;
        }
        else
            return "";
    },

    set name(value)
    {
        // Name exists in its own component, create if doesn't exist
        var nameComp = this.componentByType(cComponentTypeName);
        if (nameComp == null)
            nameComp = this.createComponent(0, cComponentTypeName, "");
        var nameAttr = nameComp.attributeById("name");
        nameAttr.value = value;
    }
};
