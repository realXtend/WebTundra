// Connect to a localhost Tundra server

var client = new WebSocketClient();
var scene = new Scene();
var syncManager = new SyncManager(client, scene);
var loginData = {"name": "Test User"};

client.connect("localhost", 2345, loginData);
client.connected.add(createEntities);

function createEntities() {
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
    // In the meanwhile the server has assigned an authoritative ID for the entities. Remove the first of them
    var ent = scene.entityByName("Entity1");
    scene.removeEntity(ent.id);
    
    // Create components to the second entity
    ent = scene.entityByName("Entity2");
    ent.createComponent(0, cComponentTypePlaceable, "");
    var rigidBody = ent.createComponent(0, cComponentTypeRigidBody, "");
    // Modify the "mass" attribute of the rigidbody to make it movable on the server
    rigidBody.mass.value = 1.0;
    // Also give it a valid (nonzero) size
    rigidBody.size.value = { x: 1.0, y: 1.0, z: 1.0 };

    // Send the modifications to server
    syncManager.sendChanges();
}
