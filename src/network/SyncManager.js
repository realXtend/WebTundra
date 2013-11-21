// For conditions of distribution and use, see copyright notice in LICENSE

var cCreateEntity = 110;
var cCreateComponents = 111;
var cCreateAttributes = 112;
var cEditAttributes = 113;
var cRemoveAttributes = 114;
var cRemoveComponents = 115;
var cRemoveEntity = 116;
var cCreateEntityReply = 117;
var cCreateComponentsReply = 118;
var cRigidBodyUpdate = 119;
var cEntityAction = 120;

function SyncManager(client, scene) {
    this.client = client;
    this.scene = scene;
    this.client.messageReceived.add(this.onMessageReceived, this);
    /// \todo Connect to scene change signals
}

SyncManager.prototype = {
    onMessageReceived : function(msgId, dd) {
        switch (msgId) {
        case cCreateEntity:
            this.handleCreateEntity(dd);
            break;
        case cCreateComponents:
            this.handleCreateComponents(dd);
            break;
        case cEditAttributes:
            this.handleEditAttributes(dd);
            break;
        case cRemoveComponents:
            this.handleRemoveComponents(dd);
            break;
        case cRemoveEntity:
            this.handleRemoveEntity(dd);
            break;
        }
    },
    
    handleCreateEntity : function(dd) {
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var tempFlag = dd.readU8(); /// \todo Handle
        var numComponents = dd.readU16(); /// \todo Should be VLE as in native client protocol

        var entity = scene.createEntity(entityId);
        if (entity == null)
            return;
        console.log("Created entity id " + entity.id);

        for (var i = 0; i < numComponents; i++) {
            this.readComponentFullUpdate(entity, dd);
        }
    },

    handleCreateComponents : function(dd) {
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling CreateComponents message");
            return;
        }
        while (dd.bytesLeft > 0) {
            this.readComponentFullUpdate(entity, dd);
        }
    },

    handleEditAttributes : function(dd) {
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling EditAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readU16(); /// \todo Should be VLE as in native client protocol
            var component = entity.componentById(compId);
            if (component == null) {
                console.log("Component id " + compId + " not found in entity id " + entityId + " when handling EditAttributes message");
                return;
            }
            var compDataSize = dd.readU16(); /// \todo Should be VLE as in native client protocol
            var compDd = new DataDeserializer(dd.readArrayBuffer(compDataSize));
            // Choose index or bitmask method
            var methodBit = compDd.readBit();
            // Index method
            if (methodBit == 0) {
                var numAttr = compDd.readU8();
                for (var i = 0; i < numAttr; i++) {
                    var attr = component.attributes[compDd.readU8()];
                    attr.fromBinary(compDd);
                    //console.log("Attribute " + attr.name + " in component " + component.typeName + " entity " + entityId + " updated with index method");
                }
            }
            // Bitmask method
            else {
                for (var i = 0; i < component.attributes.length; i++) {
                    var changeBit = compDd.readBit();
                    if (changeBit) {
                        var attr = component.attributes[i];
                        attr.fromBinary(compDd);
                        //console.log("Attribute " + attr.name + " in component " + component.typeName + " entity " + entityId + " updated with bitmask method");
                    }
                }
            }
        }
    },

    handleRemoveComponents : function(dd) {
        console.log("RemoveComponents");
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling EditAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readU16(); /// \todo Should be VLE as in native client protocol
            entity.removeComponent(compId);
            console.log("Removed component id " + compId + " in entity id " + entityId);
        }
    },

    handleRemoveEntity : function(dd) {
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        scene.removeEntity(entityId);
        console.log("Removed entity id " + entityId);
    },
    
    readComponentFullUpdate : function(entity, dd) {
        var compId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var compTypeId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var compName = dd.readString();

        // Get the nested serializer for component data
        var compDataSize = dd.readU32(); /// \todo Should be VLE as in native client protocol
        var compDd = new DataDeserializer(dd.readArrayBuffer(compDataSize));

        var component = entity.createComponent(compId, compTypeId, compName);
        if (component) {
            console.log("Created component type " + component.typeName + " id " + component.id);
            /// \todo Handle dynamic attributes, now only loops through static
            for (var j = 0; j < component.attributes.length; j++) {
                if (compDd.bytesLeft > 0) {
                    component.attributes[j].fromBinary(compDd);
                    //console.log("Read attribute " + component.attributes[j].name);
                }
            }
        }
    }

}