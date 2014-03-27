var client = new WebSocketClient();
var scene = new Scene();
var syncManager = new SyncManager(client, scene);
var loginData = {"name": "Test User"};

// Connect to a localhost Tundra server, once connected start making scene changes
client.connect("localhost", 2345, loginData);
client.connected.add(createEntities);

function createEntities() {
    console.log("Create entities");

    for (var i = 1; i <= 5; i++)
    {
        // ID 0 = let scene assign
        var ent = scene.createEntity(0);
        // Assigning the entity's name creates the Name component
        ent.name = "Entity" + i;
    }

    // Send the entity creations
    syncManager.sendChanges();
    
    // Wait for server to process the creations, then modify
    setTimeout(manipulateEntities, 500);
}

function manipulateEntities() {
    console.log("Manipulate entities, part 1");

    // In the meanwhile the server has assigned an authoritative ID for the entities. Remove the first of them
    var ent = scene.entityByName("Entity1");
    scene.removeEntity(ent.id);
    
    // Create components to the second entity
    ent = scene.entityByName("Entity2");
    ent.createComponent(0, cComponentTypePlaceable, "");
    var rigidBody = ent.createComponent(0, cComponentTypeRigidBody, "");
    // Modify the "mass" attribute of the rigidbody to make it movable on the server
    rigidBody.mass = 1.0;
    // Also give it a valid (nonzero) size
    rigidBody.size = { x: 1.0, y: 1.0, z: 1.0 };

    // Create a dynamic component to the third entity
    ent = scene.entityByName("Entity3");
    var dc = ent.createComponent(0, cComponentTypeDynamicComponent, "");
    dc.createAttribute(0, Tundra.cAttributeString, "Test String", "test");
    dc.createAttribute(1, Tundra.cAttributeInt, "Test Int", 100);
    dc.createAttribute(2, Tundra.cAttributeBool, "Test Bool", false);

    // Create component to the fourth entity, which we will remove later
    ent = scene.entityByName("Entity4");
    ent.createComponent(0, cComponentTypePlaceable, "");

    // Send the modifications to server
    syncManager.sendChanges();

    // Perform final manipulation after further 0.5 second
    setTimeout(manipulateEntities2, 500);
}

function manipulateEntities2() {
    console.log("Manipulate entities, part 2");

    // Remove attribute index 1 from the dynamic component. This leaves a hole (null attribute), then modify the rest
    var ent = scene.entityByName("Entity3");
    var dc = ent.dynamicComponent;
    dc.removeAttribute(1);
    dc.attributes[0].value = "testmodified";
    dc.attributes[2].value = true;
    
    // Manipulate the rigidbody component in Entity2
    ent = scene.entityByName("Entity2");
    var rigidBody = ent.rigidBody;
    rigidBody.size = { x: 2.0, y: 2.0, z: 2.0 };

    ent = scene.entityByName("Entity4");
    ent.removeComponent(ent.componentByType(cComponentTypePlaceable).id);

    syncManager.sendChanges();

    console.log("Send EntityAction");
    
    // Trigger a remote entity action on the fifth entity
    var params = ["Param1", "Param2", "Param3"];
    ent = scene.entityByName("Entity5");
    ent.triggerAction("TestAction", params, Tundra.cExecTypeServer | cExecTypePeers);
}
