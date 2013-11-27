// For conditions of distribution and use, see copyright notice in LICENSE

var componentTypeNames = {};
var componentTypeIds = {};
var componentFactories = {};

function Component(typeId) {
    this.parentEntity = null;
    this.typeId = typeId;
    this.name = "";
    this.id = 0;
    this.attributes = [];
}

Component.prototype = {
    // Add a new static attribute at initialization
    addAttribute: function(typeId, id, name, value) {
        var newAttr = createAttribute(typeId);
        if (newAttr != null) {
            newAttr.name = name;
            newAttr.id = id;
            newAttr.owner = this;
            if (value != null)
                newAttr.value = value;
            this.attributes.push(newAttr);
            // Also register direct named access
            this[id] = newAttr;
            return newAttr;
        }
        else
            return null;
    },
    
    // Create a dynamic attribute during runtime
    createAttribute: function(index, typeId, name, value) {
        var newAttr = createAttribute(typeId);
        if (newAttr != null) {
            newAttr.name = name;
            newAttr.id = name; // For dynamic attributes name == id
            newAttr.owner = this;
            if (value != null)
                newAttr.value = value;
            // If needed, make "holes" to the attribute list
            while (this.attributes.length < index)
                this.attributes.push(null);
            if (this.attributes.length == index)
                this.attributes.push(newAttr)
            else
                this.attributes[index] = newAttr;
            // Also register direct named access
            /// \todo Sanitate case to match native Tundra
            this[newAttr.id] = newAttr;
            return newAttr;
        }
        else
            return null;
    },

    // Remove a dynamic attribute during runtime
    removeAttribute : function(index) {
        if (index < this.attributes.length && this.attributes[index] != null) {
            var attr = this.attributes[index];
            delete this[attr.id]; // Remove direct access
            if (index == this.attributes.length - 1)
                this.attributes.splice(index, 1);
            else
                this.attributes[index] = null; // Leave hole if necessary
        }
    },

    get typeName(){
        return componentTypeNames[this.typeId];
    }
}

function registerComponent(typeId, typeName, factory) {
    console.log("Registering component typeid " + typeId + " typename " + typeName);
    componentTypeNames[typeId] = typeName;
    componentTypeIds[typeName] = typeId;
    componentFactories[typeId] = factory;
}

function createComponent(typeId) {
    // Convert typename to numeric ID if necessary
    if (typeof typeId == 'string' || typeId instanceof String)
        typeId = componentTypeIds[typeId];
    if (componentFactories.hasOwnProperty(typeId))
        return componentFactories[typeId]();
    else
    {
        console.log("Could not create unknown component " + typeId);
        return null;
    }
}