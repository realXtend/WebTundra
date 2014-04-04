var client = new Tundra.WebSocketClient();
var scene = new Tundra.Scene();
var syncManager = new Tundra.SyncManager(client, scene);
var loginData = {"name": "Test User"};
var gotEntityAction = false;

client.connect("localhost", 2345, loginData);
console.log("Waiting for second client to start creating objects");
scene.entityCreated.add(startTest);

function startTest() {
    scene.entityCreated.remove(startTest);
    console.log("Starting test");
    setTimeout(finishTest, 1000);
}

function finishTest() {
    var parent = scene.entityByName("Parent");
    if (parent)
        console.log("PASS: Parent entity found");
    else
        console.log("FAIL: Parent entity not found");
    
    var child = scene.entityByName("Child");
    if (child)
        console.log("PASS: Child entity found");
    else
        console.log("FAIL: Child entity not found");

    if (child.parent == parent)
        console.log("PASS: Child entity has correct parent assignment");
    else
        console.log("FAIL: Child entity has wrong parent assignment");
    
    var comp = child.componentByType("TestComponent");
    if (comp) {
        console.log("PASS: Child entity has TestComponent");
        if (comp.attr1 == 100 && comp.attr2 == "Test" && comp.attr3 == true)
            console.log("PASS: TestComponent has correct attribute values");
        else
            console.log("FAIL: TestComponent has wrong attribute values");
    }
    else
        console.log("FAIL: Child entity does not have TestComponent");

    console.log("Test finished");
}