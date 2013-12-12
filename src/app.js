"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 * 	@author Tapani Jamsa
 *	@author Erno Kuusela
 *	@author Toni Alatalo
 *	Date: 2013
 */

function Application(dataConnection, viewer) {
	this.keyboard = new THREEx.KeyboardState();
	this.clock = new THREE.Clock();

	// SCENE
	this.scene = new THREE.Scene();

	// Camera
	var SCREEN_WIDTH = window.innerWidth,
		SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45,
		ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
		NEAR = 0.1,
		FAR = 20000;
	this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
	this.scene.add(this.camera);
	this.camera.position.set(0, 300, 100); // (0, 1000, -375);
	this.camera.lookAt(this.scene.position);

	// VIEWER
	this.viewer = new ThreeView(this.scene, this.camera);

	// MODEL
	this.dataConnection = new WebTundraModel(this);

	// CONTROLS
	this.controls = new THREE.OrbitControls(this.camera, this.viewer.renderer.domElement);
	this.controls.userZoom = true;
}

Application.prototype = {

	constructor: Application,

	start: function() {
		this.dataConnection.connectClient();
		this.logicInit();
		this.frameCount = 0;
		this.update();
	},

	update: function() {
		var delta = this.clock.getDelta(); // seconds

		this.logicUpdate();
		this.dataToViewerUpdate();

		this.controls.update();
		this.viewer.stats.update();

		var scope = this;
		requestAnimationFrame(function() {
			scope.update();
		});

		this.viewer.render();
		this.frameCount++;
	},

	logicUpdate: function() {
		var posIncrement;
		this.viewer.checkDefined(this.frameCount);
		if (this.frameCount % 100 === 0) {
			posIncrement = 50;
		} else {
			posIncrement = -0.5;
		}
		for (var i = 0; i < this.testEntities.length; i++) {
			var ent = this.testEntities[i];
			this.viewer.checkDefined(ent);
			ent.components.placeable.transform.value.pos.y += posIncrement;
			ent.components.placeable.transform.value.rot.y += 0.01;
		}
	},

	dataToViewerUpdate: function() {
		var sceneData = this.dataConnection.scene;
		for (var i in sceneData.entities) {
			if (!sceneData.entities.hasOwnProperty(i))
				continue;
			var entity = sceneData.entities[i];
			this.viewer.entitiesSeen[i] = true;
			this.viewer.checkDefined(entity);
			// if (entity.registeredWithViewer === true)
			//     continue;
			// else
			//     entity.registeredWithViewer = true;
			var placeable = entity.componentByType("Placeable");
			var meshes = [];
			var j;
			for (j in entity.components) {
				if (!entity.components.hasOwnProperty(j))
					continue;
				var comp = entity.components[j];
				this.viewer.checkDefined(comp);
				if (comp instanceof EC_Mesh)
					meshes.push(comp);
				else if (comp instanceof EC_Placeable)
					placeable = comp;
			}
			if (placeable !== null)
				for (j in Object.keys(meshes)) {
					this.viewer.entitiesWithMeshesSeen[i] = true;
					this.viewer.addOrUpdate(entity, placeable, meshes[j]);
			}
		}
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
			placeable.transform.value.pos.x = i * 150;
			placeable.transform.value.pos.y = 150;

			setXyz(placeable.transform.value.scale, 1, 1, 1);
			mesh.meshRef.ref = "http://kek";
		}
	}
}