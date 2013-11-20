// For conditions of distribution and use, see copyright notice in LICENSE

function Scene() {
    this.entities = {};
}

Scene.prototype = {
    createEntity: function(id) {
        if (this.entityById(id))
        {
            console.log("Entity id " + id + " already exists in scene, can not create");
            return null;
        }
        var newEntity = new Entity();
        newEntity.parentScene = this;
        newEntity.id = id;
        this.entities[id] = newEntity;
        return newEntity;
    },
    
    removeEntity: function(id) {
        if (this.entities.hasOwnProperty(id))
            delete this.entities[id];
        else
            console.log("Entity id " + id + " does not exist in scene, can not remove");
    },

    entityById: function(id) {
        if (this.entities.hasOwnProperty(id))
            return this.entities[id];
        else
            return null;
    }
}