"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals, Stats, Detector */
/* global check, checkDefined, EC_Placeable, EC_Mesh, EC_Camera, EC_Light,
   LT_Point, LT_Spot, LT_Directional */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Erno Kuusela
 *      @author Tapani Jamsa
 */

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
        try {
            return this.onComponentAddedInternal(entity, component);
        } catch (e) {
            debugger;
        }
    },
    onComponentAddedInternal: function(entity, component) {
        checkDefined(component, entity);
        var threeGroup = this.o3dByEntityId[entity.id];
        var isNewEntity = false;
        if(!threeGroup) {
            this.o3dByEntityId[entity.id] = threeGroup = new THREE.Object3D();
            isNewEntity = true;
            threeGroup.userData.entityId = entity.id;
            //console.log("registered o3d for entity", entity.id);
        }
        
        if (component instanceof EC_Placeable)
            this.connectToPlaceable(threeGroup, component);
        else if (component instanceof EC_Mesh) {
            //console.log("mesh added for o3d", threeGroup.userData.entityId);
            this.onMeshAddedOrChanged(threeGroup, component);
        } else if (component instanceof EC_Camera)
            this.onCameraAddedOrChanged(threeGroup, component);
        else if (component instanceof EC_Light)
            this.onLightAddedOrChanged(threeGroup, component);
        else
            2 > 1;
    },

    onMeshAddedOrChanged: function(threeGroup, meshComp) {
        if (meshComp.threeMesh) {
            /* remove previous mesh if it existed */
            /* async hazard: what if two changes for same mesh come in
               order A, B and loads finish in order B, A */
            threeGroup.remove(meshComp.threeMesh);
            //console.log("removed old mesh on mesh attr change", changedAttr);
        }

        var url = meshComp.meshRef.value.ref;
                 
        url = url.replace(/\.mesh$/i, ".json");

        var thisIsThis = this;
        var loadedSig = this.pendingLoads[url];
        if (loadedSig === undefined) {
            loadedSig = new signals.Signal();
            loadedSig.addOnce(this.onMeshLoaded.bind(this, threeGroup, meshComp));
            this.pendingLoads[url] = loadedSig;
            this.jsonLoad(url, loadedSig.dispatch.bind(this));
        } else {
            //console.log("will call onMeshLoaded with threeGroup for eid=", threeGroup.userData.entityId);
            loadedSig.addOnce(this.onMeshLoaded.bind(this, threeGroup, meshComp));
        }
        var onMeshAttributeChanged = function(changedAttr, changeType) {
            if (changedAttr.id != "meshRef")
                return;
            //console.log("onMeshAddedOrChanged due to attributeChanged ->", changedAttr.value.ref);
            thisIsThis.onMeshAddedOrChanged(threeGroup, meshComp);
        };
        meshComp.attributeChanged.remove(onMeshAttributeChanged);
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
        // console.log("Mesh loaded:", meshComp.meshRef.value.ref, "- adding to o3d of entity "+ threeParent.userData.entityId);
        checkDefined(threeParent, meshComp, geometry, material);
        var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));
        meshComp.threeMesh = mesh;
        //mesh.applyMatrix(threeParent.matrixWorld);
        mesh.needsUpdate = 1;
        threeParent.add(mesh);
        // threeParent.needsUpdate = 1;

        // do we need to set up signal that does
        // mesh.applyMatrix(threeParent.matrixWorld) when placeable
        // changes?
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
            checkDefined(geometry, material);
            addedCallback(geometry, material);
            delete thisIsThis.pendingLoads[url];
        });
    },

    onLightAddedOrChanged: function(threeGroup, lightComp) {
        var prevThreeLight = lightComp.threeLight;
        if (prevThreeLight) {
            // console.log("removed existing light");
            threeGroup.remove(prevThreeLight);
        }
        if (lightComp.type.value != LT_Point) {
            console.log("not implemented: light type " + lightComp.type.value);
            return;
        }
        var threeColor = THREE.Color();
        /* for story about diffuse color and Three, see
           https://github.com/mrdoob/three.js/issues/1595 */
        lightComp.threeLight = new THREE.PointLight(threeColor,
                                          lightComp.brightness.value,
                                          lightComp.range.value);
        threeGroup.add(lightComp.threeLight);
        var thisIsThis = this;
        var onLightAttributeChanged = function(changedAttr, changeType) {
            //console.log("onLightAddedOrChanged due to attributeChanged ->", changedAttr.value.ref);
            var id = changedAttr.id;
            if (id === "range" || id === "brightness" ||
                id === "diffuseColor" || id === "type")
                thisIsThis.onLightAddedOrChanged(threeGroup, lightComp);
        };
        lightComp.attributeChanged.remove(onLightAttributeChanged);
        lightComp.attributeChanged.add(onLightAttributeChanged);
    },

    onCameraAddedOrChanged: function(threeGroup, cameraComp) {
        var prevThreeCamera = cameraComp.threeCamera;
        if (prevThreeCamera) {
            console.log("removed existing camera");
            threeGroup.remove(prevThreeCamera);
        }
        console.log("make camera");
        var threeAspectRatio = cameraComp.aspectRatio.value;
        if (threeAspectRatio === "")
            threeAspectRatio = 1.0;
        cameraComp.threeCamera = new THREE.PerspectiveCamera(
            cameraComp.verticalFov.value, threeAspectRatio,
            cameraComp.nearPlane.value, cameraComp.farPlane.value);
       
        this.camera = cameraComp.threeCamera;
        threeGroup.add(cameraComp.threeCamera);
        var thisIsThis = this;
        var onCameraAttributeChanged = function(changedAttr, changeType) {
            //console.log("onCameraAddedOrChanged due to attributeChanged ->", changedAttr.value.ref);
            var id = changedAttr.id;
            if (id === "aspectRatio" || id === "verticalFov" ||
                id === "nearPlane" || id === "farPlane")
                thisIsThis.onCameraAddedOrChanged(threeGroup, cameraComp);
        };
        var removed = cameraComp.attributeChanged.remove(onCameraAttributeChanged);
        if (removed)
            console.log("removed old camera attr change hook");
        cameraComp.attributeChanged.add(onCameraAttributeChanged);
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
        //NOTE: this depends on component handling being done here before the componentReady signal fires
        var thisIsThis = this;
        placeable.parentRefReady.add(function() { 
            var parent = thisIsThis.parentForPlaceable(placeable);
            //NOTE: assumes first call -- add removing from prev parent to support live changes! XXX
            parent.add(threeObject);
            thisIsThis.updateFromTransform(threeObject, placeable);
            placeable.attributeChanged.add(function(attr, changeType) {
                thisIsThis.updateFromTransform(threeObject, placeable); //Todo: pass attr to know when parentRef changed
            });
        });
    },

    parentForPlaceable: function(placeable) {
        var parent;
        if (placeable.parentRef.value) {
            var parentOb = this.o3dByEntityId[placeable.parentRef.value];
            if (!parentOb) {
                console.log("ThreeView parentForPlaceable ERROR: adding object but parent not there yet -- even though this is called only after the parent was reported being there in the EC scene data. Falling back to add to scene.");
                parent = this.scene;
            } else {
                parent = parentOb;
            }
        } else {
            parent = this.scene;
        }

        return parent;
    }
};
