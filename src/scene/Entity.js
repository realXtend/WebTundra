// For conditions of distribution and use, see copyright notice in LICENSE

var cExecTypeLocal = 1;
var cExecTypeServer = 2;
var cExecTypePeers = 4;

function Entity() {
    this.components = {};
    this.parentScene = null;
    this.id = 0;
    this.temporary = false;
    this.componentIdGenerator = new UniqueIdGenerator();
    this.componentAdded = new signals.Signal();
    this.componentRemoved = new signals.Signal();
    this.actionTriggered = new signals.Signal();
    this.componentIdChanged = new signals.Signal();
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
}