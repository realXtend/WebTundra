// For conditions of distribution and use, see copyright notice in LICENSE

function Entity() {
    this.components = {};
    this.parentScene = null;
    this.id = 0;
    this.componentIdGenerator = new UniqueIdGenerator();
    this.componentAdded = new signals.Signal();
    this.componentRemoved = new signals.Signal();
}

Entity.prototype = {
    createComponent: function(id, typeId, name, changeType) {
        // If zero ID, assign ID now
        if (id == 0)
        {
            // If entity itself is local, create only local components
            if (local == true || changeType == AttributeChange.LocalOnly)
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

    componentById: function(id) {
        if (this.components.hasOwnProperty(id))
            return this.components[id];
        else
            return null;
    },
    
    componentByType: function(typeId) {
        // Convert typename to numeric ID if necessary
        if (typeof typeId == 'string' || typeId instanceof String)
            typeId = componentTypeIds[typeId];
        for (var compId in this.components) {
            if (this.components.hasOwnProperty(compId) && this.components[compId].typeId == typeId) {
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
    }
}