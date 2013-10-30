// For conditions of distribution and use, see copyright notice in LICENSE

var cLoginMessage = 100;

function WebSocketClient() {
    this.webSocket = null;
    this.url = "";
    this.connected = new signals.Signal();
    this.disconnected = new signals.Signal();
    this.messageReceived = new signals.Signal();
}

WebSocketClient.prototype = {
    // Connect to a Tundra server
    connect : function(host, port) {
        this.url = "ws://" + host + ":" + port;

        try {
            if (window.WebSocket)
                this.webSocket = new window.WebSocket(this.url);
            else if (window.MozWebSocket)
                this.webSocket = new window.MozWebSocket(this.url);
            else
            {
                console.log("Browser does not support WebSocket");
                return false;
            }
            this.webSocket.binaryType = 'arraybuffer';
        }
        catch (e) {
            console.error("Exception while connecting WebSocket: " + e.stack);
        }

        this.webSocket.onopen = function(evt) {
            this.connected.dispatch();
        }.bind(this);

        this.webSocket.onclose = function(evt) {
            this.disconnected.dispatch();
            this.webSocket = null;
        }.bind(this);

        this.webSocket.onmessage = function(evt) {
            var dd = new DataDeserializer(evt.data);
            this.messageReceived.dispatch(dd);
        }.bind(this);

        this.webSocket.onerror = function(evt) {
            /// \todo Error reporting
        }.bind(this);
        
        /// \todo use keepalive-timer to avoid disconnection if connection idle for a long time
        return true;
    },

    // Disconnect from a Tundra server
    disconnect : function() {
        if (this.webSocket) {
            this.webSocket.close()
            this.webSocket = null;
        }
    },

    // Begin a new message. Returns the DataSerializer to which the message payload can be written.
    startNewMessage : function(msgId, maxBytes) {
        var ds = new DataSerializer(maxBytes);
        ds.addU16(msgId);
        return ds;
    },

    // Send the message to the server using a filled DataSerializer
    endAndQueueMessage : function(ds) {
        if (this.webSocket) {
            ds.truncate();
            this.webSocket.send(ds.arrayBuffer);
        }
        else
            console.error("No connection, can not send message");
    }
}