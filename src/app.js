"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global requestAnimationFrame */
/* global Tundra */
/* global THREE, THREEx, signals, Stats, Detector */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

if (Tundra === undefined)
    var Tundra = {};

Tundra.trackRigidBodyBoxes = false;

Tundra.Application = function() {};

Tundra.Application.prototype = {

    constructor: Tundra.Application,

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
        this.dataConnection = new Tundra.WebTundraModel(this);
        this.dataConnection.client.connected.add(this.onConnected.bind(this));
        this.dataConnection.client.disconnected.add(this.onDisconnected.bind(this));
        this.dataConnection.scene.componentAdded.add(this.viewer.onComponentAddedOrChanged.bind(this.viewer));
        this.dataConnection.scene.componentRemoved.add(this.viewer.onComponentRemoved.bind(this.viewer));
        this.dataConnection.scene.threeScene = this.viewer.scene;


        if (Tundra.trackRigidBodyBoxes)
            this.dataConnection.scene.componentAdded.add(
                this.onRigidBodyPossiblyAdded.bind(this));

        // an alternative to hooking per component attributeChanged signals,
        // would simplify business registering/unregistering handlers in
        // component lifetime mgmt:
        //
        // this.dataConnection.scene.attributeChanged.add(function(comp, attr, ctype) {
        //     this.onComponentAddedOrChanged(comp.parentEntity, comp, ctype, attr);
        // }.bind(this.viewer));
    },

    createViewer: function() {
        return new Tundra.ThreeView();
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

        this.viewer.stats.update();

        requestAnimationFrame(function() {
            this.update();
        }.bind(this));

        this.viewer.render(delta);
        this.frameCount++;
    },

    logicUpdate: function() {
        var posIncrement;
        Tundra.checkDefined(this.frameCount);
        if (this.frameCount % 100 === 0) {
            posIncrement = 50;
        } else {
            posIncrement = -0.5;
        }
        for (var i = 0; i < this.testEntities.length; i++) {
            var ent = this.testEntities[i];
            Tundra.checkDefined(ent);
            ent.components.placeable.transform.pos.y += posIncrement;
            ent.components.placeable.transform.rot.y += 0.01;
        }
    },

    onObjectClicked: function(entID, params) {
        var ent = this.dataConnection.scene.entityById(entID);
        if (ent === null)
            console.log("objectClicked got nonexistent entity id " + entID);
        else
            ent.triggerAction("MousePress", params, Tundra.cExecTypeServer);
    },

};

Tundra.debugOnCheckFail = true;

Tundra.checkDefined = function() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] === undefined) {
            if (Tundra.debugOnCheckFail) {
                debugger;
            } else {
                throw ("undefined value, arg #" + i);
            }
        }
    }
};

Tundra.check = function() {
    for (var i = 0; i < arguments.length; i++)
        if (arguments[i] !== true)
            if (Tundra.debugOnCheckFail) {
                debugger;
            } else {
                throw ("untrue value" + arguments[i] + ", arg #" + i);
            }
};

Tundra.Application.prototype.onRigidBodyPossiblyAdded = function(entity, component) {
    if (! (component instanceof Tundra.EC_RigidBody))
        return;


    var onRigidBodyAttributeChanged = function(changedAttr, changeType) {
        //console.log("onRigidBodyAddedOrChanged due to attributeChanged ->", changedAttr.ref);
        if (component.shapeType !== 0) {
            console.log("unhandled shape type " + component.shapeType);
            return;
        }
        var physiCube = component.physiCube;
        if (!physiCube) {
            component.physiCube = physiCube = new THREE.Mesh(
                new THREE.CubeGeometry(1, 1, 1),
                this.viewer.wireframeMaterial);
            physiCube.mass = 0;
            var threeGroup = this.viewer.o3dByEntityId[entity.id];
            threeGroup.add(physiCube);
        }
        console.log("ok, have cube");
        var boxSize = component.size;
        if (!(boxSize.x && boxSize.y && boxSize.z))
            console.log("RigidBody of entity " + entity.id + ": one or more dimensions are zero");
        physiCube.scale.set(boxSize.x, boxSize.y, boxSize.z);
        console.log("box updated");
    }.bind(this);
    onRigidBodyAttributeChanged();
    component.attributeChanged.add(onRigidBodyAttributeChanged);
};
