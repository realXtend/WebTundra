var client = new Tundra.WebSocketClient();
var scene = new Tundra.Scene();
var syncManager = new Tundra.SyncManager(client, scene);
var loginData = {"name": "Test User"};

// Connect to a localhost Tundra server, once connected start making scene changes
client.connect("localhost", 2345, loginData);
client.connected.add(createEntities);

function createEntities() {
    console.log("Register custom component");

    var blueprint = new Tundra.Component();
    blueprint.addAttribute("int", "attr1", "Attribute 1");
    blueprint.addAttribute("string", "attr2", "Attribute 2");
    blueprint.addAttribute("bool", "attr3", "Attribute 3");
    Tundra.registerCustomComponent("TestComponent", blueprint);

    console.log("Create parent and child entity");
    var parent = scene.createEntity(0);
    parent.name = "Parent";
    var child = parent.createChild(0);
    child.name = "Child";
    child.createComponent(0, "TestComponent");
    child.testComponent.attr1 = 100;
    child.testComponent.attr2 = "Test";
    child.testComponent.attr3 = true;

    // Send the custom type + entity changes
    syncManager.sendChanges();
}