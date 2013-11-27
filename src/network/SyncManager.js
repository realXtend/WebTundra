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
    this.logDebug = true;
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
        case cCreateAttributes:
            this.handleCreateAttributes(dd);
            break;
        case cEditAttributes:
            this.handleEditAttributes(dd);
            break;
        case cRemoveAttributes:
            this.handleRemoveAttributes(dd);
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
        if (this.logDebug)
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
    
    handleCreateAttributes : function(dd) {
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling CreateAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readU16(); /// \todo Should be VLE as in native client protocol
            var component = entity.componentById(compId);
            if (component == null) {
                console.log("Component id " + compId + " not found in entity id " + entityId + " when handling CreateAttributes message");
                return;
            }
            var attrIndex = dd.readU8();
            var attrTypeId = dd.readU8();
            var attrName = dd.readString();
            var attr = component.createAttribute(attrIndex, attrTypeId, attrName);
            if (attr != null)
            {
                attr.fromBinary(dd);
                if (this.logDebug)
                    console.log("Created attribute " + attr.name + " in component " + component.typeName + " entity id " + entityId);
            }
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
                    if (this.logDebug)
                        console.log("Updated attribute " + attr.name + " in component " + component.typeName + " entity id " + entityId);
                }
            }
            // Bitmask method
            else {
                for (var i = 0; i < component.attributes.length; i++) {
                    var changeBit = compDd.readBit();
                    if (changeBit) {
                        var attr = component.attributes[i];
                        attr.fromBinary(compDd);
                        if (this.logDebug)
                            console.log("Updated attribute " + attr.name + " in component " + component.typeName + " entity id " + entityId);
                    }
                }
            }
        }
    },
    
    handleRemoveAttributes : function(dd) {
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling RemoveAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readU16(); /// \todo Should be VLE as in native client protocol
            var component = entity.componentById(compId);
                        var attrIndex = dd.readU8();
            if (component == null) {
                console.log("Component id " + compId + " not found in entity id " + entityId + " when handling CreateAttributes message");
                return;
            }
            var attrIndex = dd.readU8();
            component.removeAttribute(attrIndex);
            if (this.logDebug)
                console.log("Removed attribute index " + attrIndex + " in component " + component.typeName + " entity id " + entityId);
        }
    },

    handleRemoveComponents : function(dd) {
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
            if (this.logDebug)
                console.log("Removed component id " + compId + " in entity id " + entityId);
        }
    },

    handleRemoveEntity : function(dd) {
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        scene.removeEntity(entityId);
        if (this.logDebug)
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

            // Fill static attributes
            for (var j = 0; j < component.attributes.length; j++) {
                if (compDd.bytesLeft > 0) {
                    component.attributes[j].fromBinary(compDd);
                    if (this.logDebug)
                        console.log("Read attribute " + component.attributes[j].name);
                }
            }
            // Create dynamic attributes
            while (compDd.bitsLeft > 2*8) {
                var attrIndex = compDd.readU8();
                var attrTypeId = compDd.readU8();
                var attrName = compDd.readString();
                var attr = component.createAttribute(attrIndex, attrTypeId, attrName);
                if (attr != null)
                {
                    attr.fromBinary(compDd);
                    if (this.logDebug)
                        console.log("Created attribute " + attr.name + " in component " + component.typeName + " entity id " + entity.id);
                }
            }
        }
    }

}