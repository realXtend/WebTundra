"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals, Stats, Detector */
/* global check, checkDefined, EC_Placeable, EC_Mesh, EC_Camera, EC_Light */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Erno Kuusela
 *      @author Tapani Jamsa
 */

var useCubes = false;

function ThreeView(scene, camera) {
    this.o3dByEntityId = {}; // Three.Object3d's that correspond to Placeables and have Meshes etc as children
    this.pendingLoads = {};

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
        var intersects = ray.intersectObjects(attributeValues(thisIsThis.o3dByEntityId));
    }, false );

    // Hack for Physics2 scene
    this.pointLight = new THREE.PointLight(0xffffff);
    this.pointLight.position.set(-100,200,100);
    this.scene.add(this.pointLight);
}

ThreeView.prototype = {

    constructor: ThreeView,

    render: function() {
        // checkDefined(this.scene, this.camera);
        this.renderer.render(this.scene, this.camera);
    },

    onComponentAdded: function(entity, component) {
        checkDefined(component, entity);
        var threeObject = this.o3dByEntityId[entity.id];
        var isNewEntity = false;
        if(!threeObject) {
            this.o3dByEntityId[entity.id] = threeObject = new THREE.Object3D();
            this.scene.add(threeObject);
            isNewEntity = true;
            threeObject.userData.entityId = entity.id;
        } 
        
        if (isNewEntity && component instanceof EC_Placeable)
            this.connectToPlaceable(threeObject, component)
        else if (component instanceof EC_Mesh)
            this.onMeshAdded(threeObject, component);
        else if (component instanceof EC_Camera)
            this.onCameraAdded(threeObject, component);
        else if (component instanceof EC_Light)
            this.onLightAdded(threeObject, component);
        else
            2 > 1;
    },

    onMeshAdded: function(threeObject, meshComp) {
      
        var url = meshComp.meshRef.value.ref;
        url = url.replace(/\.mesh$/i, ".json");
        var thisIsThis = this;
        var loadedSig = this.pendingLoads[url];
        if (loadedSig === undefined) {
            loadedSig = new signals.Signal();
            loadedSig.addOnce(this.onMeshLoaded);
            this.pendingLoads[url] = loadedSig;
            this.jsonLoad(url, loadedSig.dispatch.bind(this, threeObject, meshComp));
        } else
            loadedSig.addOnce(this.onMeshLoaded);       

        var thisIsThis = this;
        meshComp.attributeChanged.addOnce(function(changedAttr, changeType) {
            if (meshComp.threeMesh) {
                threeObject.remove(meshComp.threeMesh);
                console.log("remove old mesh on mesh attr change", changedAttr);
                /* todo: take care to unload everything so memory is actually freed */
            }
            thisIsThis.onMeshAdded(threeObject, meshComp);
        });
    },

    onMeshLoaded: function(threeParent, meshComp, geometry, material) {
        if (geometry === undefined) {
            console.log("mesh load failed");
            return;
        }
        checkDefined(geometry, material, meshComp, threeParent);
        console.log("Mesh loaded:", meshComp.meshRef.value.ref);
        checkDefined(threeParent, meshComp, geometry, material);
        var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));
        meshComp.threeMesh = mesh;
        mesh.applyMatrix(threeParent.matrixWorld);
        mesh.needsUpdate = 1;
        threeParent.add(mesh);
        threeParent.needsUpdate = 1;
        // we need to set up signal that does mesh.applyMatrix(threeParent.matrixWorld) when
        // placeable changes?
    },
    
    jsonLoad: function(url, addedCallback) {
        var loader = new THREE.JSONLoader();
        check(typeof(url) == "string");
        if (url === "") {
            addedCallback(undefined, undefined);
            return;
        }
        console.log("json load", url);
        loader.load(url, function(geometry, material) {
            console.log("call back");
            checkDefined(geometry, material);
            addedCallback(geometry, material);
        });
    },

    onLightAdded: function(threeObject, meshComp) {
        console.log("onLightAdded stub");
    },

    onCameraAdded: function(threeObject, meshComp) {
        console.log("onLightAdded stub");
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

