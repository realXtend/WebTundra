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
        console.log("CreateEntity");
        var sceneId = dd.readU8(); // Dummy sceneID for multi-scene support, yet unused /// \todo Should be VLE as in native client protocol
        var entityId = dd.readU16(); /// \todo Should be VLE as in native client protocol
        var tempFlag = dd.readU8(); /// \todo Handle
        var numComponents = dd.readU16(); /// \todo Should be VLE as in native client protocol

        var entity = scene.createEntity(entityId);
        if (entity == null)
            return;
        console.log("Created entity id " + entity.id);

        for (var i = 0; i < numComponents; i++) {
            var compId = dd.readU16(); /// \todo Should be VLE as in native client protocol
            var compTypeId = dd.readU16(); /// \todo Should be VLE as in native client protocol
            var compName = dd.readString();

            // Get the nested serializer for component data
            var compDataSize = dd.readU32(); /// \todo Should be VLE as in native client protocol
            var compDs = new DataDeserializer(dd.readArrayBuffer(compDataSize));

            var component = entity.createComponent(compId, compTypeId, compName);
            if (component) {
                console.log("Created component type " + component.typeName + " id " + component.id);
                /// \todo Handle dynamic attributes, now only loops through static
                for (var j = 0; j < component.attributes.length; j++) {
                    if (compDs.bytesLeft > 0) {
                        component.attributes[j].fromBinary(compDs);
                        console.log("Read attribute " + component.attributes[j].name);
                    }
                }
            }
        }
    },

    handleCreateComponents : function(dd) {
        console.log("CreateComponents");
    },

    handleEditAttributes : function(dd) {
        console.log("EditAttributes");
    },

    handleRemoveComponents : function(dd) {
        console.log("RemoveComponents");
    },

    handleRemoveEntity : function(dd) {
        console.log("RemoveEntity");
    }

}