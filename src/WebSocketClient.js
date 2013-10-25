// For conditions of distribution and use, see copyright notice in LICENSE

var cLoginMessage = 100;

function WebSocketClient() {
    this.webSocket = null;
    this.url = "";
    this.callbacks = [];
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
            this.triggerCallbacks("Connect");
        }.bind(this);

        this.webSocket.onclose = function(evt) {
            this.triggerCallbacks("Disconnect");
            this.webSocket = null;
        }.bind(this);

        this.webSocket.onmessage = function(evt) {
            var dd = new DataDeserializer(evt.data);
            this.triggerCallbacks("Message", dd);
        }.bind(this);

        this.webSocket.onerror = function(evt) {
            this.triggerCallbacks("Error");
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
    },

    // Add networking callback. Eventname is "Connect", "Disconnect", "Message" or "Error"
    addCallback : function(eventName, callback) {
        if (this.callbacks[eventName] === undefined)
            this.callbacks[eventName] = [];
        this.callbacks[eventName].push(callback);
    },

    // Remove networking callback.
    removeCallback : function(eventName, callback) {
        if (this.callbacks[eventName] !== undefined)
        {
            var callbacks = this.callbacks[eventName];
            for (var i = 0; i < callbacks.length; ++i)
            {
                if (callbacks[i] === callback)
                {
                    callbacks.splice(i, 1);
                    break;
                }
            }
        }
    },
    
    // Internal function to trigger networking callbacks
    triggerCallbacks : function(eventName, data) {
        if (this.callbacks[eventName] !== undefined)
        {
            var callbacks = this.callbacks[eventName];
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](data);
        }
    }
}