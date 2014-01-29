"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global requestAnimationFrame */
/* global ThreeView, WebTundraModel */
/* global EC_Mesh, EC_Placeable */
/* global THREE, THREEx, signals, Stats, Detector */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var useSignals = true; // todo: remove (along with EC_* refs in jslint settings)

function Application() {}

Application.prototype = {

    constructor: Application,

    init: function() {
        this.keyboard = new THREEx.KeyboardState();
        this.clock = new THREE.Clock();

        // SCENE
        this.scene = new THREE.Scene();

        // CAMERA
        // moved to ThreeView

        // VIEWER
        this.viewer = new ThreeView(this.scene);
        this.viewer.objectClicked.add(this.onObjectClicked.bind(this));
		this.viewer.renderer.setClearColor( 0x9999D6, 1 );

        // MODEL
        this.connected = false;
        this.dataConnection = new WebTundraModel(this);
        this.dataConnection.client.connected.add(this.onConnected.bind(this));
        this.dataConnection.client.disconnected.add(this.onDisconnected.bind(this));
        this.dataConnection.scene.componentAdded.add(this.viewer.onComponentAddedOrChanged.bind(this.viewer));
        this.dataConnection.scene.componentRemoved.add(this.viewer.onComponentRemoved.bind(this.viewer));

        // an alternative to hooking per component attributeChanged signals,
        // would simplify business registering/unregistering handlers in
        // component lifetime mgmt:
        //
        // this.dataConnection.scene.attributeChanged.add(function(comp, attr, ctype) {
        //     this.onComponentAddedOrChanged(comp.parentEntity, comp, ctype, attr);
        // }.bind(this.viewer));
    },

    start: function() {
        this.init();
        this.logicInit();
        this.frameCount = 0;
        this.update();
    },

    logicInit: function() {
        this.cubeCount = 0;
        var scene = this.dataConnection.scene;
        this.testEntities = [];
        console.log("in makeEntities");
        for (var i = 0; i < this.cubeCount; i++) {
            var ent = scene.createEntity(i + 1000);
            this.testEntities.push(ent);
            var placeable = ent.createComponent("placeable", "Placeable", "");
            var mesh = ent.createComponent("mesh", "Mesh", "placeable");
            placeable.transform.pos.x = i * 150;
            placeable.transform.pos.y = 150;

            setXyz(placeable.transform.scale, 1, 1, 1);
            mesh.meshRef.ref = "http://kek";
        }
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
        if (!useSignals)
            this.dataToViewerUpdate();

        this.viewer.stats.update();

        requestAnimationFrame(function() {
            this.update();
        }.bind(this));

		this.viewer.update();
        this.viewer.render();
        this.frameCount++;
    },

    logicUpdate: function() {
        var posIncrement;
        checkDefined(this.frameCount);
        if (this.frameCount % 100 === 0) {
            posIncrement = 50;
        } else {
            posIncrement = -0.5;
        }
        for (var i = 0; i < this.testEntities.length; i++) {
            var ent = this.testEntities[i];
            checkDefined(ent);
            ent.components.placeable.transform.pos.y += posIncrement;
            ent.components.placeable.transform.rot.y += 0.01;
			console.log(ent.components);
        }
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


// Todo: move or remove below 

function attributeValues(o) {
    var out = [];
    for (var key in o) {
        if (!o.hasOwnProperty(key))
            continue;
        out.push(o[key]);
    }
    return out;
}

function EventCounter() {
    this.events = {};
}

EventCounter.prototype.add = function(key) {
    var count = this.events[key];
    if (count === undefined)
        count = 0;
    count++;
    this.events[key] = count;
    return count;
};
