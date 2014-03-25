"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global requestAnimationFrame */
/* global ThreeView, WebTundraModel */
/* global EC_Mesh, EC_Placeable */
/* global THREE, THREEx, Stats, Detector */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

function Application() {}

Application.prototype = {

    constructor: Application,

    init: function() {
        this.keyboard = new THREEx.KeyboardState();
        this.clock = new THREE.Clock();

        // SCENE
        // moved to viewer

        // CAMERA
        // moved to viewer

        // VIEWER
        this.viewer = this.createViewer();
        this.viewer.objectClicked.add(this.onObjectClicked.bind(this));
		this.viewer.renderer.setClearColor( 0x9999D6, 1 );

        // MODEL
        this.connected = false;
        this.dataConnection = new WebTundraModel(this);
        this.dataConnection.client.connected.add(this.onConnected.bind(this));
        this.dataConnection.client.disconnected.add(this.onDisconnected.bind(this));
        this.dataConnection.scene.componentAdded.add(this.viewer.onComponentAdded.bind(this.viewer));
        this.dataConnection.scene.componentRemoved.add(this.viewer.onComponentRemoved.bind(this.viewer));
    },

    createViewer: function() {
        return new ThreeView();
    },

    start: function() {
        this.init();
        this.logicInit();
        this.frameCount = 0;
        this.update();
    },

    logicInit: function() {
        /* override this and put app initialization code here */
    },

    connect: function(host, port) {
        console.log("connect");
        this.dataConnection.connectClient(host, port);
    },

    onConnected: function() {
        console.log("connected");
        this.connected = true;
    },

    onDisconnected: function() {
        console.log("disconnected");
        this.connected = false;
    },

    update: function() {
        var delta = this.clock.getDelta(); // seconds

        this.logicUpdate(delta);

        this.viewer.stats.update();

        requestAnimationFrame(function() {
            this.update();
        }.bind(this));

        this.viewer.render(delta);
        this.frameCount++;
    },

    logicUpdate: function(timeDelta) {
        /* put frame update code for app logic here */
    },

    dataToViewerUpdate: function() {
        var sceneData = this.dataConnection.scene;
        for (var i in sceneData.entities) {
            if (!sceneData.entities.hasOwnProperty(i))
                continue;
            var entity = sceneData.entities[i];
            checkDefined(entity);
            var placeable = entity.componentByType("Placeable");
            var meshes = [];
            var j;
            for (j in entity.components) {
                if (!entity.components.hasOwnProperty(j))
                    continue;
                var comp = entity.components[j];
                checkDefined(comp);
                if (comp instanceof EC_Mesh)
                    meshes.push(comp);
                else if (comp instanceof EC_Placeable)
                    placeable = comp;
            }
            if (placeable !== null) {
                for (j in Object.keys(meshes)) {
                    this.viewer.addOrUpdate(entity, placeable, meshes[j]);
                }
            }
        }
    },

    onObjectClicked: function(entID, params) {
        var ent = this.dataConnection.scene.entityById(entID);
        if (ent === null)
            console.log("objectClicked got nonexistent entity id " + entID);
        else
            ent.triggerAction("MousePress", params, cExecTypeServer);
    },

};

var debugOnCheckFail = true;

function checkDefined() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] === undefined) {
            if (debugOnCheckFail) {
                debugger;
            } else {
                throw ("undefined value, arg #" + i);
            }
        }
    }
}

function check() {
    for (var i = 0; i < arguments.length; i++)
        if (arguments[i] !== true)
            if (debugOnCheckFail) {
                debugger;
            } else {
                throw ("untrue value" + arguments[i] + ", arg #" + i);
            }
}

