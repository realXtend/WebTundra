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
    addAttribute: function(typeId, id, name, value) {
        var newAttr = createAttribute(typeId);
        if (newAttr != null)
        {
            newAttr.name = name;
            newAttr.id = id;
            newAttr.owner = this;
            if (value != null)
                newAttr.value = value;
            this.attributes.push(newAttr);
            // Also register direct named access
            this[id] = newAttr;
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