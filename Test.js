// For conditions of distribution and use, see copyright notice in LICENSE

var client = new WebSocketClient();
var scene = new Scene();
var syncManager = new SyncManager(client, scene);
var loginData = {"name": "Test User"};

syncManager.logDebug = true;
client.connect("localhost", 2345, loginData);

/*
setTimeout(printEntityNames, 2000);

function printEntityNames() {
    for (var entityId in scene.entities) {
        var entity = scene.entities[entityId];
        console.log(entity.name);
    }
}
*/