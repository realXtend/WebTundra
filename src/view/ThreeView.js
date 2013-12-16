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
            //console.log("registered o3d for entity", entity.id);
        } 
        
        if (component instanceof EC_Placeable)
            this.connectToPlaceable(threeObject, component);
        else if (component instanceof EC_Mesh) {
            //console.log("mesh added for o3d", threeObject.userData.entityId);
            this.onMeshAddedOrChanged(threeObject, component);
        } else if (component instanceof EC_Camera)
            this.onCameraAdded(threeObject, component);
        else if (component instanceof EC_Light)
            this.onLightAdded(threeObject, component);
        else
            2 > 1;
    },

    onMeshAddedOrChanged: function(threeObject, meshComp) {
        if (meshComp.threeMesh) {
            /* remove previous mesh if it existed */
            /* async hazard: what if two changes for same mesh come in
               order A, B and loads finish in order B, A */
            threeObject.remove(meshComp.threeMesh);
            //console.log("removed old mesh on mesh attr change", changedAttr);
        }

        var url = meshComp.meshRef.value.ref;
                 
        url = url.replace(/\.mesh$/i, ".json");
        if (threeObject.children.length > 0)
            debugger;
        var thisIsThis = this;
        var loadedSig = this.pendingLoads[url];
        if (loadedSig === undefined) {
            loadedSig = new signals.Signal();
            loadedSig.addOnce(this.onMeshLoaded.bind(this, threeObject, meshComp));
            this.pendingLoads[url] = loadedSig;
            this.jsonLoad(url, loadedSig.dispatch.bind(this));
        } else {
            //console.log("will call onMeshLoaded with threeObject for eid=", threeObject.userData.entityId);
            loadedSig.addOnce(this.onMeshLoaded.bind(this, threeObject, meshComp));
        }
        var onMeshAttributeChanged = function(changedAttr, changeType) {
            if (changedAttr.id != "meshRef")
                return;
            //console.log("onMeshAddedOrChanged due to attributeChanged ->", changedAttr.value.ref);
            thisIsThis.onMeshAddedOrChanged(threeObject, meshComp);
        };
        var removed = meshComp.attributeChanged.remove(onMeshAttributeChanged);
        if (removed)
            console.log("removed old mesh attr change hook");
        meshComp.attributeChanged.add(onMeshAttributeChanged);
    },

    onMeshLoaded: function(threeParent, meshComp, geometry, material) {
        if (geometry === undefined) {
            console.log("mesh load failed");
            return;
        }
        checkDefined(geometry, material, meshComp, threeParent);
        checkDefined(meshComp.parentEntity);
        check(threeParent.userData.entityId === meshComp.parentEntity.id);
        if (threeParent.children.length > 0) {
            console.log("adding mesh #" + (threeParent.children.length+1) + " to entity #" +threeParent.userData.entityId);
        }
        console.log("Mesh loaded:", meshComp.meshRef.value.ref, "- adding to o3d of entity "+ threeParent.userData.entityId);
        checkDefined(threeParent, meshComp, geometry, material);
        var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));
        meshComp.threeMesh = mesh;
        //mesh.applyMatrix(threeParent.matrixWorld);
        mesh.needsUpdate = 1;
        threeParent.add(mesh);
        if (threeParent.children.length > 1)
            console.log("multiple meshes on entity", threeParent.userData.entityId);
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
        var thisIsThis = this;
        loader.load(url, function(geometry, material) {
            console.log("call back");
            checkDefined(geometry, material);
            addedCallback(geometry, material);
            delete thisIsThis.pendingLoads[url];
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
        var ptv = placeable.transform.value;
        
        this.copyXyz(ptv.pos, threeMesh.position);
        this.copyXyz(ptv.scale, threeMesh.scale);
        this.copyXyzMapped(ptv.rot, threeMesh.rotation, this.degToRad);
        threeMesh.needsUpdate = true;
    },

    connectToPlaceable: function(threeObject, placeable) {
        this.updateFromTransform(threeObject, placeable);
        var thisIsThis = this;
        placeable.attributeChanged.add(function(attr, changeType) {
            thisIsThis.updateFromTransform(threeObject, placeable);
        });
    },
};

