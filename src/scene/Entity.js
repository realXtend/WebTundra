// For conditions of distribution and use, see copyright notice in LICENSE

function Entity() {
    this.components = {};
    this.parentScene = null;
    this.id = 0;
}

Entity.prototype = {
    createComponent: function(id, typeId, name) {
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
        return newComp;
    },

    removeComponent: function(id) {
        if (this.components.hasOwnProperty(id))
        {
            var comp = this.components[id];
            delete this.components[id];
            // Remove direct access by type
            var propName = sanitatePropertyName(comp.typeName);
            if (this[propName] === comp)
                delete this[propName];
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