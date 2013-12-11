"use strict";
// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *	@author Erno Kuusela
 * 	@author Tapani Jamsa
 */

var useCubes = true;
var debugOnCheckFail = true;

function ThreeView(scene, camera) {
	this.objectsByEntityId = {};
	this.meshCache = {};

	// SCENE
	this.scene = scene;
	this.camera = camera;

	// STATS
	this.stats = new Stats();
	this.stats.domElement.style.position = 'absolute';
	this.stats.domElement.style.bottom = '0px';
	this.stats.domElement.style.zIndex = 100;

	// RENDERER    
	if (Detector.webgl)
		this.renderer = new THREE.WebGLRenderer({
			antialias: true
		});
	else
		this.renderer = new THREE.CanvasRenderer();
	this.renderer.setSize(window.innerWidth, window.innerHeight);

	// EVENTS
	THREEx.WindowResize(this.renderer, this.camera);
	THREEx.FullScreen.bindKey({
		charCode: 'm'.charCodeAt(0)
	});

	// CONTAINER
	this.container = document.getElementById('ThreeJS');
	this.container.appendChild(this.stats.domElement);
	this.container.appendChild(this.renderer.domElement);
	document.body.appendChild(this.container);

	// GEOMETRY AND MATERIAL
	this.cubeGeometry = new THREE.CubeGeometry( 2,2, 2 );
	this.wireframeMaterial = new THREE.MeshBasicMaterial({
		color: 0x00ee00,
		wireframe: true,
		transparent: true
	});

	// DEBUG
	this.entitiesSeen = {};
	this.entitiesWithMeshesSeen = {};
}

ThreeView.prototype = {

	constructor: ThreeView,

	render: function() {
		// this.checkDefined(this.scene, this.camera);
		this.renderer.render(this.scene, this.camera);
	},

	addOrUpdate: function(entity, placeable, meshComp) {
		// console.log(placeable.parentRef.index);

		// this.checkDefined(entity, placeable, meshComp);
		// this.checkDefined(entity.id);

		// var url = meshComp.meshRef.value.ref;
		// if (url === 'Sphere.mesh') {
		// 	this.updateFromTransform(this.ball.sphereMesh, placeable);
		// } else if (url === 'local://newRacket.mesh') {
		// 	// console.clear();
		// 	// console.log(entity);
		// 	// console.log(placeable);
		// 	// console.log(meshComp);


		// 	if(placeable.parentRef.valueInternal === '3'){
		// 		console.log(placeable.parentRef.valueInternal);
		// 		this.updateFromTransform(this.playerAreas[0].racketMesh, placeable);
		// 	} else if(placeable.parentRef.valueInternal === '4'){
		// 		this.updateFromTransform(this.playerAreas[1].racketMesh, placeable);
		// 	}
		// }

		this.checkDefined(entity, placeable, meshComp);
		this.checkDefined(entity.id);
		var cube = this.objectsByEntityId[entity.id];
		var url = meshComp.meshRef.value.ref;
		if (cube === undefined) {
			if (useCubes) {
				cube = new THREE.Mesh(this.cubeGeometry, this.wireframeMaterial);
				this.objectsByEntityId[entity.id] = cube;
				
				//tundra parenting - should be somewhere else for all cases but devving here first
				var container = null; //either the scene or a parent mesh - or should be parent but that's not available yet
				var parentRefVal = placeable.parentRef.value;
				console.log("parentRef: " + parentRefVal);
				if (parentRefVal) {
                    			var parentEnt = this.objectsByEntityId[parentRefVal];
					if (parentEnt) {
						container = parentEnt;
					} else {
						container = null;
						var applyParent = function(addedEntity, changeType) {
							if (addedEntity.id === parentRefVal) {
								addedEntity.add(cube);
							}
							this.scene.entityCreated.remove(applyParent);
						}
						this.scene.entityCreated.add(applyParent);
					}
				} else {
					container = this.scene;
				}

				debugger;
				if (container) {
					container.add(cube);
				}
			} else if (url === 'lightsphere.mesh') {
				this.objectsByEntityId[entity.id] = this.pointLight;
				this.scene.add(this.pointLight);
				this.updateFromTransform(this.pointLight, placeable);
			} else {
				url = url.replace(/\.mesh$/i, ".json")
				var entitiesForUrl = this.meshCache[url];
				var firstRef = false;
				if (entitiesForUrl === undefined) {
					this.meshCache[url] = entitiesForUrl = [];
					firstRef = true;
				}
				entitiesForUrl.push(entity);
				if (!firstRef)
					return;
				console.log("new mesh ref:", url);
				var thisIsThis = this;
				jsonLoad(url, function(geometry, material) {
					thisIsThis.addMeshToEntities(geometry, material, url);
					//this.updateFromTransform(threeMesh, placeable);
					console.log("loaded & updated to scene:", url);
				});
			}
		} else {
			this.updateFromTransform(cube, placeable);
		}
	},

	addMeshToEntities: function(geometry, material, url) {
		console.log("..");
		var entities = this.meshCache[url];
		this.checkDefined(entities);
		//material = new THREE.MeshBasicMaterial( { vertexColors: THREE.FaceColors, overdraw: 0.5 } );
		for (var i = 0; i < entities.length; i++) {
			var ent = entities[i];
			check(ent instanceof Entity);
			var pl = ent.componentByType("Placeable");
			var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));						
                        this.updateFromTransform(mesh, pl);
			this.scene.add(mesh);
			this.objectsByEntityId[ent.id] = mesh;
			mesh.userData.entityId = ent.id;
		}
		entities.length = 0;
	},

	checkDefined: function() {
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i] === undefined) {
				if (debugOnCheckFail) {
					debugger;
				} else {
					throw ("undefined value, arg #" + i);
				}
			}
		}
	},

	jsonLoad: function(url, addCallback) {
		var loader = new THREE.JSONLoader();
		loader.load(url, function(geometry, material) {
			addCallback(geometry, material);
		});
	},

	copyXyz: function(src, dst) {
		dst.x = src.x;
		dst.y = src.y;
		dst.z = src.z;
	},

	copyXyzMapped: function(src, dst, mapfun) {
		dst.x = mapfun(src.x);
		dst.y = mapfun(src.y);
		dst.z = mapfun(src.z);
	},

	degToRad: function(val) {
		return val * (Math.PI / 180);
	},

	updateFromTransform: function(threeMesh, placeable) {
		this.checkDefined(placeable, threeMesh);
		this.copyXyz(placeable.transform.value.pos, threeMesh.position);
		this.copyXyz(placeable.transform.value.scale, threeMesh.scale);
		this.copyXyzMapped(placeable.transform.value.rot, threeMesh.rotation, this.degToRad);
		threeMesh.needsUpdate = true;
	}
}