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
var cRegisterComponentType = 123;
var cSetEntityParent = 124;

function SyncManager(client, scene) {
    this.client = client;
    this.scene = scene;
    this.client.messageReceived.add(this.onMessageReceived, this);
    this.logDebug = false;
    this.pendingComponentTypeNames = {};

    // Attach to scene change signals for determining what changes to send to the server
    this.ensureSyncState(scene);
    scene.attributeChanged.add(this.onAttributeChanged, this);
    scene.attributeAdded.add(this.onAttributeAdded, this);
    scene.attributeRemoved.add(this.onAttributeRemoved, this);
    scene.componentAdded.add(this.onComponentAdded, this);
    scene.componentRemoved.add(this.onComponentRemoved, this);
    scene.entityCreated.add(this.onEntityCreated, this);
    scene.entityRemoved.add(this.onEntityRemoved, this);
    scene.actionTriggered.add(this.onActionTriggered, this);
    scene.entityParentChanged.add(this.onEntityParentChanged, this);
    client.loginReplyReceived.add(this.onLoginReplyReceived, this);
    customComponentRegistered.add(this.onCustomComponentRegistered, this);
}

SyncManager.prototype = {
    sendChanges : function() {
        // No-op if the scene does not have a syncstate yet or if the connection is not live
        if (!this.scene.syncState || !this.client.webSocket)
            return;
        
        // Pending custom component types to send to server
        for (var typeName in this.pendingComponentTypeNames) {
            this.replicateComponentType(typeName);
            delete this.pendingComponentTypeNames[typeName];
        }

        // Removed entities
        for (var id in this.scene.syncState.removed)
        {
            // If entity was also created/modified, remove takes precedence
            this.scene.syncState.removeCreated(id);
            this.scene.syncState.removeModified(id);
            
            var ds = this.client.startNewMessage(cRemoveEntity, 256);
            ds.addVLE(0); // Dummy scene ID
            ds.addVLE(id);
            this.client.endAndQueueMessage(ds);
            if (this.logDebug)
                console.log("Sent RemoveEntity message for entity id " + id);
        }
        this.scene.syncState.clearRemoved();

        // Created entities
        for (var id in this.scene.syncState.created)
        {
            var entity = scene.entityById(id);
            if (entity == null)
            {
                console.log("Warning: entity id " + id + " not found for sending create");
                continue;
            }
            var ds = this.client.startNewMessage(cCreateEntity, 64 * 1024);
            ds.addVLE(0); // Dummy scene ID
            ds.addVLE(id);
            ds.addU8(entity.temporary ? 1 : 0);

            // If supported in the protocol, add parent entity ID here
            if (this.client.protocolVersion >= cProtocolHierarchicScene) {
                var parentEntityId = entity.parent ? entity.parent.id : 0;
                ds.addU32(parentEntityId);
            }

            var numReplicatedComponents = 0;
            for (var compId in entity.components)
            {
                var comp = entity.componentById(compId);
                if (comp && !comp.local)
                    numReplicatedComponents++;
            }
            ds.addVLE(numReplicatedComponents);
            for (var compId in entity.components)
            {
                var comp = entity.componentById(compId);
                if (comp == null)
                {
                    console.log("Warning: component id " + compId + " not found in entity id " + id + " for sending create");
                    continue;
                }
                if (comp.local)
                    continue;
                this.writeComponentFullUpdate(comp, ds);
                this.ensureSyncState(comp);
                comp.syncState.clearAll();
            }
            this.client.endAndQueueMessage(ds);
            if (this.logDebug)
                console.log("Sent CreateEntity message for entity id " + id);

            this.ensureSyncState(entity);
            entity.syncState.clearAll();
        }
        this.scene.syncState.clearCreated();

        // Modified entities
        for (var id in this.scene.syncState.modified)
        {
            var entity = scene.entityById(id);
            if (entity == null)
            {
                console.log("Warning: entity " + id + " not found for sending modify");
                continue;
            }
            if (entity.syncState == null)
                continue;
            // Removed components
            for (var compId in entity.syncState.removed)
            {
                var ds = this.client.startNewMessage(cRemoveComponents, 256);
                ds.addVLE(0); // Dummy scene ID
                ds.addVLE(id);
                ds.addVLE(compId);
                this.client.endAndQueueMessage(ds);
                if (this.logDebug)
                    console.log("Sent RemoveComponent message for entity id " + id + " component id " + compId);
            }
            entity.syncState.clearRemoved();
            // Created components
            for (var compId in entity.syncState.created)
            {
                var comp = entity.componentById(compId);
                if (comp == null)
                {
                    console.log("Warning: component id " + compId + " not found in entity id " + id + " for sending create");
                    continue;
                }
                if (comp.local)
                    continue;
                var ds = this.client.startNewMessage(cCreateComponents, 16384);
                ds.addVLE(0); // Dummy scene ID
                ds.addVLE(id);
                this.writeComponentFullUpdate(comp, ds);
                this.client.endAndQueueMessage(ds);
                if (this.logDebug)
                    console.log("Sent CreateComponent message for entity id " + id + " component id " + comp.id);

                this.ensureSyncState(comp);
                comp.syncState.clearAll();
            }
            entity.syncState.clearCreated();

            // Modified components
            for (var compId in entity.syncState.modified)
            {
                var comp = entity.componentById(compId);
                if (comp == null)
                {
                    console.log("Warning: component id " + compId + " not found in entity id " + id + " for sending modify");
                    continue;
                }
                if (comp.syncState == null)
                    continue;
                // Removed attributes
                for (var attrIndex in comp.syncState.removed)
                {
                    var ds = this.client.startNewMessage(cRemoveAttributes, 256);
                    ds.addVLE(0); // Dummy scene ID
                    ds.addVLE(id);
                    ds.addVLE(compId);
                    ds.addU8(attrIndex);
                    this.client.endAndQueueMessage(ds);
                    if (this.logDebug)
                        console.log("Sent RemoveAttributes message for entity id " + id + " component id " + comp.id);
                }
                comp.syncState.clearRemoved();

                // Created attributes
                for (var attrIndex in comp.syncState.created)
                {
                    var attr = comp.attributes[attrIndex];
                    if (attr == null)
                        continue;
                    var ds = this.client.startNewMessage(cCreateAttributes, 16384);
                    ds.addVLE(0); // Dummy scene ID
                    ds.addVLE(id);
                    ds.addVLE(compId);
                    ds.addU8(attrIndex);
                    ds.addU8(attr.typeId);
                    ds.addString(attr.name);
                    attr.toBinary(ds);
                    this.client.endAndQueueMessage(ds);
                    if (this.logDebug)
                        console.log("Sent CreateAttributes message for entity id " + id + " component id " + comp.id);
                }
                comp.syncState.clearCreated();

                // Modified attributes
                var numModifiedAttrs = 0;
                for (var attrIndex in comp.syncState.modified)
                    numModifiedAttrs++;
                if (numModifiedAttrs > 0)
                {
                    var ds = this.client.startNewMessage(cEditAttributes, 16384);
                    ds.addVLE(0); // Dummy scene ID
                    ds.addVLE(id);
                    ds.addVLE(compId);
                    
                    // Attribute data is sent in separate databuffer
                    var compDs = new DataSerializer(16384);
                    compDs.addBit(0); // Always use the index method for simplicity
                    compDs.addU8(numModifiedAttrs);
                    for (var attrIndex in comp.syncState.modified)
                    {
                        var attr = comp.attributes[attrIndex];
                        compDs.addU8(attrIndex);
                        attr.toBinary(compDs);
                    }
                    ds.addVLE(compDs.bytesFilled);
                    ds.addArrayBuffer(compDs.arrayBuffer, compDs.bytesFilled);

                    this.client.endAndQueueMessage(ds);
                    if (this.logDebug)
                        console.log("Sent EditAttributes message for entity id " + id + " component id " + comp.id + " (" + numModifiedAttrs + " modified attributes)");
                }
                comp.syncState.clearModified();
            }
            
            // Parent change
            if (entity.syncState.parentChanged) {
                // Send parent change message if supported
                if (this.client.protocolVersion >= cProtocolHierarchicScene) {
                    var ds = this.client.startNewMessage(cSetEntityParent, 256);
                    ds.addVLE(0); // Dummy scene ID
                    ds.addU32(entity.id);
                    var parentEntityId = entity.parent ? entity.parent.id : 0;
                    ds.addU32(parentEntityId);

                    this.client.endAndQueueMessage(ds);
                    if (this.logDebug)
                        console.log("Sent SetEntityParent message for entity id " + id + " new parent id " + parentEntityId);
                }

                entity.syncState.parentChanged = false;
            }
            entity.syncState.clearModified();
        }
        this.scene.syncState.clearModified();
    },

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
        case cCreateEntityReply:
            this.handleCreateEntityReply(dd);
            break;
        case cCreateComponentsReply:
            this.handleCreateComponentsReply(dd);
            break;
        case cEntityAction:
            this.handleEntityAction(dd);
            break;
        case cRegisterComponentType:
            this.handleRegisterComponentType(dd);
            break;
        case cSetEntityParent:
            this.handleSetEntityParent(dd);
            break;
        }
    },

    handleCreateEntity : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
        var tempFlag = dd.readU8(); /// \todo Handle
        var parentEntityId = 0;

        // Read parent entity ID if supported in protocol
        if (this.client.protocolVersion >= cProtocolHierarchicScene)
            parentEntityId = dd.readU32();
       
        var numComponents = dd.readVLE();

        // Changes from the server are localonly on the client to not trigger further replication back
        var entity = scene.createEntity(entityId, AttributeChange.LocalOnly);
        if (entity == null)
            return;
        if (this.logDebug)
            console.log("Created entity id " + entity.id);

        // If nonzero parent ID, parent the entity now
        if (parentEntityId != 0) {
            var parentEntity = scene.entityById(parentEntityId);
            if (parentEntity) {
                entity.setParent(parentEntity, AttributeChange.LocalOnly);
                if (this.logDebug)
                    console.log("Parented entity id " + entityId + " to entity id " + parentEntityId);
            }
            else
                console.log("Parent entity id " + parentEntityId + " not found from scene when handling CreateEntity message");
        }


        for (var i = 0; i < numComponents; i++) {
            this.readComponentFullUpdate(entity, dd);
        }
    },

    handleCreateComponents : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
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
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling CreateAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readVLE();
            var component = entity.componentById(compId);
            if (component == null) {
                console.log("Component id " + compId + " not found in entity id " + entityId + " when handling CreateAttributes message");
                return;
            }
            var attrIndex = dd.readU8();
            var attrTypeId = dd.readU8();
            var attrName = dd.readString();
            // Changes from the server are localonly on the client to not trigger further replication back
            var attr = component.createAttribute(attrIndex, attrTypeId, attrName, null, AttributeChange.LocalOnly);
            if (attr != null)
            {
                // Changes from the server are localonly on the client to not trigger further replication back
                attr.fromBinary(dd, AttributeChange.LocalOnly);
                if (this.logDebug)
                    console.log("Created attribute " + attr.name + " in component " + component.typeName + " entity id " + entityId);
            }
        }
    },

    handleEditAttributes : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling EditAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readVLE();
            var component = entity.componentById(compId);
            if (component == null) {
                console.log("Component id " + compId + " not found in entity id " + entityId + " when handling EditAttributes message");
                return;
            }
            var compDataSize = dd.readVLE();
            var compDd = new DataDeserializer(dd.readArrayBuffer(compDataSize));
            // Choose index or bitmask method
            var methodBit = compDd.readBit();
            // Index method
            if (methodBit == 0) {
                var numAttr = compDd.readU8();
                for (var i = 0; i < numAttr; i++) {
                    var attr = component.attributes[compDd.readU8()];
                    // Changes from the server are localonly on the client to not trigger further replication back
                    attr.fromBinary(compDd, AttributeChange.LocalOnly);
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
                        attr.fromBinary(compDd, AttributeChange.LocalOnly);
                        if (this.logDebug)
                            console.log("Updated attribute " + attr.name + " in component " + component.typeName + " entity id " + entityId);
                    }
                }
            }
        }
    },
    
    handleRemoveAttributes : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling RemoveAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readVLE();
            var component = entity.componentById(compId);
            if (component == null) {
                console.log("Component id " + compId + " not found in entity id " + entityId + " when handling CreateAttributes message");
                return;
            }
            var attrIndex = dd.readU8();
            // Changes from the server are localonly on the client to not trigger further replication back
            component.removeAttribute(attrIndex, AttributeChange.LocalOnly);
            if (this.logDebug)
                console.log("Removed attribute index " + attrIndex + " in component " + component.typeName + " entity id " + entityId);
        }
    },

    handleRemoveComponents : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling EditAttributes message");
            return;
        }
        while (dd.bytesLeft > 0) {
            var compId = dd.readVLE();
            // Changes from the server are localonly on the client to not trigger further replication back
            entity.removeComponent(compId, AttributeChange.LocalOnly);
            if (this.logDebug)
                console.log("Removed component id " + compId + " in entity id " + entityId);
        }
    },

    handleRemoveEntity : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
        scene.removeEntity(entityId);
        if (this.logDebug)
            console.log("Removed entity id " + entityId);
    },
    
    handleCreateEntityReply : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE() + cFirstUnackedId;
        var serverEntityId = dd.readVLE();
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling CreateEntityReply message");
            return;
        }
        if (this.logDebug)
            console.log("Server sent authoritative entity id " + serverEntityId + " for pending entity id " + entityId + ", reassigning");
        scene.changeEntityId(entityId, serverEntityId);
        var numComponentIdRewrites = dd.readVLE();
        for (var i = 0; i < numComponentIdRewrites; i++)
        {
            var compId = dd.readVLE() + cFirstUnackedId;
            var serverCompId = dd.readVLE();
            if (this.logDebug)
                console.log("Server sent authoritative component id " + serverCompId + " for pending component id " + compId + ", reassigning");
            entity.changeComponentId(compId, serverCompId);
        }
    },
    
    handleCreateComponentsReply : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readVLE();
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling CreateComponentsReply message");
            return;
        }
        var numComponentIdRewrites = dd.readVLE();
        for (var i = 0; i < numComponentIdRewrites; i++)
        {
            var compId = dd.readVLE() + cFirstUnackedId;
            var serverCompId = dd.readVLE();
            if (this.logDebug)
                console.log("Server sent authoritative component id " + serverCompId + " for pending component id " + compId + ", reassigning");
            entity.changeComponentId(compId, serverCompId);
        }
    },
    
    handleEntityAction : function(dd) {
        var entityId = dd.readU32();
        var name = dd.readString();
        var execType = dd.readU8();
        var numParams = dd.readU8();
        var params = [];
        for (var i = 0; i < numParams; i++)
            params.push(dd.readStringVLE());
        // Make sure the exectype is local so that we do not circulate the action back to server
        execType = cExecTypeLocal;
        var entity = scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling EntityAction message");
            return;
        }
        entity.triggerAction(name, params, execType);
        if (this.logDebug)
            console.log("Triggered action " + name + " on entity id " + entityId);
    },
    
    handleRegisterComponentType : function(dd) {
        var typeId = dd.readVLE();
        var typeName = dd.readString();

        var blueprint = new Component(typeId);
        var numAttrs = dd.readVLE();
        for (var i = 0; i < numAttrs; i++) {
            var typeId = dd.readU8();
            var id = dd.readString();
            var name = dd.readString();
            blueprint.addAttribute(typeId, id, name);
        }

        // Register as local only -> don't echo back to server
        registerCustomComponent(typeName, blueprint, AttributeChange.LocalOnly);
    },
    
    handleSetEntityParent : function(dd) {
        var sceneId = dd.readVLE(); // Dummy sceneID for multi-scene support, yet unused
        var entityId = dd.readU32();
        var parentEntityId = dd.readU32();
        
        var entity = this.scene.entityById(entityId);
        if (entity == null) {
            console.log("Entity id " + entityId + " not found when handling SetEntityParent message");
            return;
        }

        if (parentEntityId) {
            var parentEntity = this.scene.entityById(parentEntityId);
            if (parentEntity == null) {
                console.log("Parent entity id " + parentEntityId + " not found when handling SetEntityParent message");
                return;
            }
            // Perform change as local only -> don't echo back to server
            entity.setParent(parentEntity, AttributeChange.LocalOnly);
            if (this.logDebug)
                console.log("Parented entity id " + entityId + " to entity id " + parentEntityId);
        }
        else {
            entity.setParent(null, AttributeChange.LocalOnly);
            if (this.logDebug)
                console.log("Unparented entity id " + entityId);
        }

    },

    readComponentFullUpdate : function(entity, dd) {
        var compId = dd.readVLE();
        var compTypeId = dd.readVLE();
        var compName = dd.readString();

        // Get the nested serializer for component data
        var compDataSize = dd.readVLE();
        var compDd = new DataDeserializer(dd.readArrayBuffer(compDataSize));

        // Changes from the server are localonly on the client to not trigger further replication back
        var component = entity.createComponent(compId, compTypeId, compName, AttributeChange.LocalOnly);
        if (component) {
            if (this.logDebug)
                console.log("Created component type " + component.typeName + " id " + component.id);

            // Fill static attributes
            for (var j = 0; j < component.attributes.length; j++) {
                if (compDd.bytesLeft > 0) {
                    component.attributes[j].fromBinary(compDd, AttributeChange.LocalOnly);
                    if (this.logDebug)
                        console.log("Read attribute " + component.attributes[j].name);
                }
            }
            // Create dynamic attributes
            while (compDd.bitsLeft > 2*8) {
                var attrIndex = compDd.readU8();
                var attrTypeId = compDd.readU8();
                var attrName = compDd.readString();
                var attr = component.createAttribute(attrIndex, attrTypeId, attrName, null, AttributeChange.LocalOnly);
                if (attr != null)
                {
                    attr.fromBinary(compDd, AttributeChange.LocalOnly);
                    if (this.logDebug)
                        console.log("Created attribute " + attr.name + " in component " + component.typeName + " entity id " + entity.id);
                }
            }
        }
    },
    
    writeComponentFullUpdate : function(comp, ds) {
        ds.addVLE(comp.id);
        ds.addVLE(comp.typeId);
        ds.addString(comp.name);

        // Create nested dataserializer for writing the attribute data
        var compDs = new DataSerializer(16 * 1024);

        for (var i = 0; i < comp.attributes.length; i++) {
            var attr = comp.attributes[i];
            if (attr == null)
                continue;
            // For static structured attributes write only the binary data
            if (!attr.dynamic) {
                attr.toBinary(compDs);
            }
            // For dynamic attributes write all info
            else {
                compDs.addU8(attr.index);
                compDs.addU8(attr.typeId);
                compDs.addString(attr.name);
                attr.toBinary(compDs);
            }
        }

        ds.addVLE(compDs.bytesFilled);
        ds.addArrayBuffer(compDs.arrayBuffer, compDs.bytesFilled);
    },

    replicateComponentType : function(typeId) {
        var component = createComponent(typeId);
        if (!component)
        {
            console.log("Custom component type " + typeId + " not registered as a factory, can not replicate");
            return;
        }
        if (this.client.protocolVersion < cProtocolCustomComponents)
        {
            console.log("Server does not support registering custom component types");
            return;
        }

        var ds = this.client.startNewMessage(cRegisterComponentType, 65536);
        ds.addVLE(component.typeId);
        // For now the native Tundra server expects typenames with the EC_ prefix
        ds.addString(ensureTypeNameWithPrefix(component.typeName));
        ds.addVLE(component.attributes.length);
        for (var i = 0; i < component.attributes.length; i++) {
            var attr = component.attributes[i];
            ds.addU8(attr.typeId);
            ds.addString(attr.id);
            ds.addString(attr.name);
        }
        this.client.endAndQueueMessage(ds);
        return true;
    },

    ensureSyncState : function(object) {
        if (object.syncState === undefined)
            object.syncState = new SyncState(object);
    },

    onEntityCreated : function(entity, changeType) {
        if (changeType == AttributeChange.Replicate && !entity.local)
            this.scene.syncState.addCreated(entity.id);
    },

    onEntityRemoved : function(entity, changeType) {
        if (changeType == AttributeChange.Replicate && !entity.local)
            this.scene.syncState.addRemoved(entity.id);
    },

    onComponentAdded : function(entity, comp, changeType) {
        if (changeType == AttributeChange.Replicate && !entity.local && !comp.local) {
            this.scene.syncState.addModified(entity.id);
            this.ensureSyncState(entity);
            entity.syncState.addCreated(comp.id);
        }
    },

    onComponentRemoved : function(entity, comp, changeType) {
        if (changeType == AttributeChange.Replicate && !entity.local && !comp.local) {
            this.scene.syncState.addModified(entity.id);
            this.ensureSyncState(entity);
            entity.syncState.addRemoved(comp.id);
        }
    },

    onAttributeChanged : function(comp, attr, changeType) {
        if (changeType == AttributeChange.Replicate && !comp.local && comp.parentEntity && !comp.parentEntity.local) {
            var entity = comp.parentEntity;
            this.scene.syncState.addModified(entity.id);
            this.ensureSyncState(entity);
            entity.syncState.addModified(comp.id);
            this.ensureSyncState(comp);
            comp.syncState.addModified(attr.index);
        }
    },
    
    onAttributeAdded : function(comp, attr, changeType) {
        if (changeType == AttributeChange.Replicate && !comp.local && comp.parentEntity && !comp.parentEntity.local) {
            var entity = comp.parentEntity;
            this.scene.syncState.addModified(comp.parentEntity.id);
            this.ensureSyncState(entity);
            entity.syncState.addModified(comp.id);
            this.ensureSyncState(comp);
            comp.syncState.addCreated(attr.index);
        }
    },
    
    onAttributeRemoved : function(comp, attr, changeType) {
        if (changeType == AttributeChange.Replicate && !comp.local && comp.parentEntity && !comp.parentEntity.local) {
            var entity = comp.parentEntity;
            this.scene.syncState.addModified(comp.parentEntity.id);
            this.ensureSyncState(entity);
            entity.syncState.addModified(comp.id);
            this.ensureSyncState(comp);
            comp.syncState.addRemoved(attr.index);
        }
    },

    onActionTriggered : function(entity, name, params, execType) {
        if (entity != null && execType > cExecTypeLocal) {
            var ds = this.client.startNewMessage(cEntityAction, 4096);
            ds.addU32(entity.id);
            ds.addString(name);
            ds.addU8(execType & (cExecTypeServer | cExecTypePeers));
            if (params != null) {
                ds.addU8(params.length);
                for (var i = 0; i < params.length; i++)
                    ds.addStringVLE(params[i].toString());
            }
            else
                ds.addU8(0); // No parameters
            this.client.endAndQueueMessage(ds);
            if (this.logDebug)
                console.log("Sent entity action " + name + " on entity id " + entity.id + " to server");
        }
    },

    onEntityParentChanged : function(entity, newParent, changeType) {
        if (changeType == AttributeChange.Replicate && !entity.local) {
            this.ensureSyncState(entity);
            entity.syncState.parentChanged = true;
            this.scene.syncState.addModified(comp.parentEntity.id);
        }
    },
    
    onLoginReplyReceived : function() {
        // When login happens, we should send all our custom component types on the next update
        for (var typeId in customComponentTypes)
            this.pendingComponentTypeNames[componentTypeNames[typeId]] = true;
    },

    onCustomComponentRegistered : function(typeId, typeName, changeType) {
        if (changeType == AttributeChange.Default || changeType == AttributeChange.Replicate)
            this.pendingComponentTypeNames[typeName] = true;
    }
}

function SyncState(parent) {
    this.parent = parent;
    // Created entities/components/attributes
    this.created = {};
    // Removed entities/components/attributes
    this.removed = {};
    // Modified entities/components/attributes
    this.modified = {};
    // Only for entities
    this.parentChanged = false;
}

SyncState.prototype = {
    addCreated : function(id){
        this.created[id] = true;
    },

    addRemoved : function(id){
        this.removed[id] = true;
    },

    addModified : function(id){
        this.modified[id] = true;
    },
    
    removeCreated : function(id){
        if (this.created.hasOwnProperty(id))
            delete this.created[id];
    },

    removeRemoved : function(id){
        if (this.removed.hasOwnProperty(id))
            delete this.removed[id];
    },

    removeModified : function(id){
        if (this.modified.hasOwnProperty(id))
            delete this.modified[id];
    },

    clearCreated : function(){
        this.created = {};
    },

    clearRemoved: function(){
        this.removed = {};
    },

    clearModified: function(){
        this.modified = {};
    },
    
    clearAll: function(){
        this.clearCreated();
        this.clearRemoved();
        this.clearModified();
    },
    
    isCreated : function(id){
        return this.created.hasOwnProperty(id);
    },

    isRemoved : function(id){
        return this.removed.hasOwnProperty(id);
    },

    isModified : function(id){
        return this.modified.hasOwnProperty(id);
    },
    
    getCreated : function() {
        var ret = [];
        for (var key in this.created)
            ret.push(key);
        return ret;
    },

    getRemoved : function() {
        var ret = [];
        for (var key in this.removed)
            ret.push(key);
        return ret;
    },

    getModified : function() {
        var ret = [];
        for (var key in this.modified)
            ret.push(key);
        return ret;
    }
}
