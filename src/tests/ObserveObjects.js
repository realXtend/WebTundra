var client = new WebSocketClient();
var scene = new Scene();
var syncManager = new SyncManager(client, scene);
var loginData = {"name": "Test User"};

client.connect("localhost", 2345, loginData);