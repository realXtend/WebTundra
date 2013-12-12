"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals, Stats, Detector */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Erno Kuusela
 *      @author Tapani Jamsa
 */

var useCubes = false;

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

    // LIGHT, GEOMETRY AND MATERIAL
    this.cubeGeometry = new THREE.CubeGeometry( 2,2, 2 );
    this.wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ee00,
        wireframe: true,
        transparent: true
    });

    // PROJECTOR

    this.projector = new THREE.Projector();
    var thisIsThis = this;
    document.addEventListener( 'mousedown', function(event) {
        var camera = thisIsThis.camera;
        var mouse = { x: ( event.clientX / window.innerWidth ) * 2 - 1,
                      y: - ( event.clientY / window.innerHeight ) * 2 + 1, };
        var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
        var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
        var mouseVector = new THREE.Vector3( mouse.x, mouse.y, 1 );
        thisIsThis.projector.unprojectVector( mouseVector, camera );
        var intersects = ray.intersectObjects(attributeValues(thisIsThis.objectsByEntityId));
    }, false );

    // Hack for Physics2 scene
    this.pointLight = new THREE.PointLight(0xffffff);
    this.pointLight.position.set(-100,200,100);
}

ThreeView.prototype = {

    constructor: ThreeView,

    render: function() {
        // checkDefined(this.scene, this.camera);
        this.renderer.render(this.scene, this.camera);
    },

    addOrUpdate: function(entity, placeable, meshComp) {
        checkDefined(entity, placeable, meshComp);
        checkDefined(entity.id);
        var threeObject = this.objectsByEntityId[entity.id];
        var url = meshComp.meshRef.value.ref;
        if (threeObject === undefined) {
            if (useCubes) {
                threeObject = new THREE.Mesh(this.cubeGeometry, this.wireframeMaterial);
                this.objectsByEntityId[entity.id] = threeObject;
                this.scene.add(threeObject);
            } else if (url === 'lightsphere.mesh') {
                this.objectsByEntityId[entity.id] = this.pointLight;
                this.scene.add(this.pointLight);
                this.updateFromTransform(this.pointLight, placeable);
                if (useSignals)
                    this.connectToPlaceable(this, this.pointLight, placeable);
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
                this.jsonLoad(url, function (geometry, material) {
                    thisIsThis.addMeshToEntities(geometry, material, url);
                    console.log("loaded & updated to scene:", url);
                });
            }
        } else {
            this.updateFromTransform(threeObject, placeable);
        }
    },

    addMeshToEntities: function(geometry, material, url) {
        var entities = this.meshCache[url];
        checkDefined(entities);
        //material = new THREE.MeshBasicMaterial( { vertexColors: THREE.FaceColors, overdraw: 0.5 } );
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            check(ent instanceof Entity);
            var pl = ent.componentByType(cComponentTypePlaceable);
            var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));
            if (useSignals) {
                this.connectToPlaceable(this, mesh, pl);
            } else {
                this.updateFromTransform(mesh, pl);
            }
            this.scene.add(mesh);
            this.objectsByEntityId[ent.id] = mesh;
            mesh.userData.entityId = ent.id;
        }
        entities.length = 0;
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
        checkDefined(placeable, threeMesh);
        this.copyXyz(placeable.transform.value.pos, threeMesh.position);
        this.copyXyz(placeable.transform.value.scale, threeMesh.scale);
        this.copyXyzMapped(placeable.transform.value.rot, threeMesh.rotation, this.degToRad);
        threeMesh.needsUpdate = true;
    },

    connectToPlaceable: function(thisIsThis, threeObject, placeable) {
        thisIsThis.updateFromTransform(threeObject, placeable);
        placeable.attributeChanged.add(function(attr, changeType) {
            thisIsThis.updateFromTransform(threeObject, placeable);
        });
    },
};

