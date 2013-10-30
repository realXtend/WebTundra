// For conditions of distribution and use, see copyright notice in LICENSE

var client = new WebSocketClient();

client.connected.add(onConnect);
client.messageReceived.add(onMessageReceived);
client.connect("localhost", 2345);

function onConnect() {
    console.log("Connected to server");
    var ds = client.startNewMessage(cLoginMessage, 1024); // Login
    var loginData = {"name": "Test User"};
    var loginText = JSON.stringify(loginData);
    ds.addUtf8String(loginText);
    client.endAndQueueMessage(ds);
}

function onMessageReceived(dd) {
    console.log("Got message, data size " + dd.size + " message ID " + dd.readU16());

}
