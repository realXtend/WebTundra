"use strict";
// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *	@author Erno Kuusela
 *      @author Tapani Jamsa
 */

var scene = null; // for networking code

function WebTundraModel() {
    this.client = new WebSocketClient();
    this.scene = new Scene();
    scene = this.scene;
    this.syncManager = new SyncManager(this.client, this.scene);
    this.syncManager.logDebug = false;
    this.loginData = {
	"name": "Test User"
    };
    this.host = "localhost";
    this.port = 2345;
}

WebTundraModel.prototype = {
    constructor: WebTundraModel,

    connectClient: function() {
	this.client.connect(this.host, this.port, this.loginData);
    }
}
