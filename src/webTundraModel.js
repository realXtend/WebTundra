"use strict";
// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *	@author Erno Kuusela
 * 	@author Tapani Jamsa
 */

 var scene = null;

function WebTundraModel() {
    this.client = new WebSocketClient();
    this.scene = new Scene();
    scene = this.scene;
    this.syncManager = new SyncManager(this.client, this.scene);
    this.syncManager.logDebug = false;
    this.loginData = {"name": "Test User"};
    this.client.connect("10.10.2.13", 2345, this.loginData);
}