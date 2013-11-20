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
            this.components[id] = newComp;
            if (name != null)
                newComp.name = name;
        }
        return newComp;
    },

    removeComponent: function(id) {
        if (this.components.hasOwnProperty(id))
            delete this.components[id];
        else
            console.log("Component id " + id + " in entity " + this.id + " does not exist, can not remove");
    },

    componentById: function(id) {
        if (this.components.hasOwnProperty(id))
            return this.components[id];
        else
            return null;
    }
}