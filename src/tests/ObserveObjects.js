var client = new WebSocketClient();
var scene = new Scene();
var syncManager = new SyncManager(client, scene);
var loginData = {"name": "Test User"};
var gotEntityAction = false;

client.connect("localhost", 2345, loginData);
console.log("Waiting for second client to start creating objects");
scene.entityCreated.add(startTest);

function startTest() {
    scene.entityCreated.remove(startTest);
    console.log("Starting test");
    scene.actionTriggered.add(handleEntityAction);
    setTimeout(finishTest, 2000);
}
function finishTest() {
    var ent = scene.entityByName("Entity1");
    if (ent == null)
        console.log("PASS: Entity1 has been removed");
    else
        console.log("FAIL: Entity1 exists though it should have been removed");

    var ent = scene.entityByName("Entity2");
    if (ent != null) {
        var rigidBody = ent.rigidBody;
        var placeable = ent.placeable;
        if (rigidBody && placeable) {
            console.log("PASS: Entity2 has RigidBody and Placeable components");
            if (rigidBody.size.x > 1.0 && rigidBody.size.y > 1.0 && rigidBody.size.z > 1.0)
                console.log("PASS: RigidBody size has been modified to be larger than 1x1x1");
            else
                console.log("FAIL: RigidBody size attribute is wrong");
        }
        else
            console.log("FAIL: Entity2 does not have correct components");
    }
    else
        console.log("FAIL: Entity2 does not exist");

    ent = scene.entityByName("Entity3");
    if (ent != null) {
        var dc = ent.dynamicComponent;
        if (dc) {
            console.log("PASS: Entity3 has DynamicComponent");
            var attr0 = dc.attributes[0];
            var attr1 = dc.attributes[1];
            var attr2 = dc.attributes[2];
            if (attr0.typeName == "string" && attr0.value == "testmodified" && attr1 == null && attr2.typeName == "bool" && attr2.value == true)
                console.log("PASS: DynamicComponent attributes have right types and values");
            else
                console.log("FAIL: DynamicComponent attributes do not have right types and values");
        }
        else
            console.log("FAIL: Entity3 does not have DynamicComponent");
    }

    ent = scene.entityByName("Entity4");
    if (ent != null) {
        if (ent.placeable === undefined)
            console.log("PASS: Entity4's Placeable component has been removed");
        else
            console.log("FAIL: Entity4's Placeable component exists though it should have been removed");
    }
    else
        console.log("FAIL: Entity3 does not exist");

    if (!gotEntityAction)
        console.log("FAIL: never received entity action");

    console.log("Test finished");
}

function handleEntityAction(entity, actionName, params) {
    scene.actionTriggered.remove(handleEntityAction);
    if (actionName == "TestAction") {
        if (entity.name != "Entity5")
            console.log("FAIL: entity action sender has wrong name");
        else if (params.length != 3)
            console.log("FAIL: wrong number of action parameters");
        else if (params[0] != "Param1" || params[1] != "Param2" || params[2] != "Param3")
            console.log("FAIL: wrong entity action parameters");
        else
            console.log("PASS: got entity action with correct parameters");
        gotEntityAction = true;
    }
}
