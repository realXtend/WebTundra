"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals, Stats, Detector */
/* global check, checkDefined, EC_Placeable, EC_Mesh, EC_Camera, EC_Light,
   LT_Point, LT_Spot, LT_Directional */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Erno Kuusela
 *      @author Tapani Jamsa
 *      @author Toni Alatalo
 */

var useCubes = false;

function ThreeView(scene) {
    this.o3dByEntityId = {}; // Three.Object3d's that correspond to Placeables and have Meshes etc as children

    // SCENE
    this.scene = scene;

    // Default camera
    var SCREEN_WIDTH = window.innerWidth,
        SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45,
        ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
        NEAR = 0.1,
        FAR = 20000;
    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.scene.add(this.camera);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(this.scene.position);

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
    this.cubeGeometry = new THREE.CubeGeometry(2, 2, 2);
    this.wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ee00,
        wireframe: true,
        transparent: true
    });

    // PROJECTOR
    this.projector = new THREE.Projector();

    // MOUSE EVENTS
    this.objectClicked = new signals.Signal();
    document.addEventListener('mousedown', this.onMouseDown.bind(this), false);

    // INTERPOLATION
    this.interpolations = [];
    this.updatePeriod_ = 1 / 20; // seconds
    this.avgUpdateInterval = 0;
    this.clock = new THREE.Clock();

    // Hack for Physics2 scene
    this.pointLight = new THREE.PointLight(0xffffff);
    this.pointLight.position.set(-100, 200, 100);
    this.scene.add(this.pointLight);

    this.meshReadySig = new signals.Signal();
    this.assetLoader = new ThreeAssetLoader();
}

ThreeView.prototype = {

    constructor: ThreeView,

    render: function(delta) {
        // checkDefined(this.scene, this.camera);

        this.updateInterpolations(delta);

        this.renderer.render(this.scene, this.camera);
    },

    onComponentAddedOrChanged: function(entity, component, changeType, changedAttr) {
        check(component instanceof Component);
        check(entity instanceof Entity);
        var threeGroup = this.o3dByEntityId[entity.id];
        var isNewEntity = false;
        if (!threeGroup) {
            check(entity.id > 0);
            this.o3dByEntityId[entity.id] = threeGroup = new THREE.Object3D();
            //console.log("created new o3d group id=" + threeGroup.id);
            isNewEntity = true;
            threeGroup.userData.entityId = entity.id;
            //console.log("registered o3d for entity", entity.id);
        } else {
            //console.log("got cached o3d group " + threeGroup.id + " for entity " + entity.id);
        }

        if (component instanceof EC_Placeable)
            this.connectToPlaceable(threeGroup, component);
        else if (component instanceof EC_Mesh) {
            // console.log("mesh changed or added for o3d " + threeGroup.userData.entityId);
            this.onMeshAddedOrChanged(threeGroup, component);
        } else if (component instanceof EC_Camera)
            this.onCameraAddedOrChanged(threeGroup, component);
        else if (component instanceof EC_Light)
            this.onLightAddedOrChanged(threeGroup, component);
        else
            console.log("Component not handled by ThreeView:", entity, component);
    },

    onComponentRemoved: function(entity, component, changeType) {
        try {
            return this.onComponentRemovedInternal(entity, component);
        } catch (e) {
            debugger;
        }
    },

    onComponentRemovedInternal: function(entity, component) {
        checkDefined(component, entity);

        if (component instanceof EC_Placeable) {
            var threeGroup = this.o3dByEntityId[entity.id];
            threeGroup.parent.remove(threeGroup);
            delete this.o3dByEntityId[entity.id];
        } else if (component instanceof EC_Mesh) {
            //console.log("mesh added for o3d", threeGroup.userData.entityId);
            // this.onMeshAddedOrChanged(threeGroup, component);
        } else if (component instanceof EC_Camera) {
            // this.onCameraAddedOrChanged(threeGroup, component);
        } else if (component instanceof EC_Light) {
            // this.onLightAddedOrChanged(threeGroup, component);
        } else
            console.log("view doesn't know about removed component " + component);
    },

    onMeshAddedOrChanged: function(threeGroup, meshComp) {
        if (meshComp.threeMesh) {
            /* remove previous mesh if it existed */
            /* async hazard: what if two changes for same mesh come in
               order A, B and loads finish in order B, A */
            if (!useCubes) {
                threeGroup.remove(meshComp.threeMesh);
                //console.log("removing prev three mesh on ec_mesh attr change");
            }
        } else {
            console.log("adding first mesh for o3d id=" + threeGroup.id);
        }

        var url = meshComp.meshRef.ref;

        url = url.replace(/\.mesh$/i, ".json");

        var thisIsThis = this;
        this.assetLoader.cachedLoadAsset(url, function(geometry, material) {
            thisIsThis.onMeshLoaded(threeGroup, meshComp, geometry, material);
        });

        var onMeshAttributeChanged = function(changedAttr, changeType) {
            if (changedAttr.id != "meshRef")
                return;
            //console.log("onMeshAddedOrChanged due to attributeChanged ->", changedAttr.ref);
            thisIsThis.onMeshAddedOrChanged(threeGroup, meshComp);
        };
        meshComp.attributeChanged.remove(onMeshAttributeChanged);
        meshComp.attributeChanged.add(onMeshAttributeChanged);
    },

    onMeshLoaded: function(threeParent, meshComp, geometry, material) {
        if (!useCubes && geometry === undefined) {
            console.log("mesh load failed");
            return;
        }
        var mesh;
        if (useCubes) {
            /*if (meshComp.meshRef.ref === "") {
                console.log("useCubes ignoring empty meshRef");
                return; //hackish fix to avoid removing the cube when the ref gets the data later
            }*/
            mesh = new THREE.Mesh(this.cubeGeometry, this.wireframeMaterial);
        } else {
            checkDefined(geometry, material, meshComp, threeParent);
            mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));
            checkDefined(threeParent, meshComp, geometry, material);
        }
        checkDefined(meshComp.parentEntity);
        check(threeParent.userData.entityId === meshComp.parentEntity.id);
        // console.log("Mesh loaded:", meshComp.meshRef.ref, "- adding to o3d of entity "+ threeParent.userData.entityId);
        meshComp.threeMesh = mesh;
        //mesh.applyMatrix(threeParent.matrixWorld);
        threeParent.add(mesh);
        this.meshReadySig.dispatch(meshComp, mesh);
        mesh.needsUpdate = 1;
        console.log("added mesh to o3d id=" + threeParent.id);
        // threeParent.needsUpdate = 1;

        // do we need to set up signal that does
        // mesh.applyMatrix(threeParent.matrixWorld) when placeable
        // changes?
    },

    onLightAddedOrChanged: function(threeGroup, lightComp) {
        var prevThreeLight = lightComp.threeLight;
        if (prevThreeLight) {
            // console.log("removed existing light");
            threeGroup.remove(prevThreeLight);
        }
        if (lightComp.type != LT_Point) {
            console.log("not implemented: light type " + lightComp.type);
            return;
        }
        var threeColor = THREE.Color();
        /* for story about diffuse color and Three, see
           https://github.com/mrdoob/three.js/issues/1595 */
        lightComp.threeLight = new THREE.PointLight(threeColor,
            lightComp.brightness,
            lightComp.range);
        threeGroup.add(lightComp.threeLight);
        var thisIsThis = this;
        var onLightAttributeChanged = function(changedAttr, changeType) {
            //console.log("onLightAddedOrChanged due to attributeChanged ->", changedAttr.ref);
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
            threeGroup.remove(prevThreeCamera);
            console.log("removing previous camera");
        }
        console.log("make camera");
        var threeAspectRatio = cameraComp.aspectRatio;
        if (threeAspectRatio === "")
            threeAspectRatio = 1.0;
        var px = cameraComp.parentEntity.placeable.transform;
        checkDefined(px);
        //console.log("camera rot from placeable x=" + px.rot.x);
        cameraComp.threeCamera = new THREE.PerspectiveCamera(
            cameraComp.verticalFov, threeAspectRatio,
            cameraComp.nearPlane, cameraComp.farPlane);
        copyXyz(px.rot, cameraComp.threeCamera.rotation);
        copyXyz(px.pos, cameraComp.threeCamera.position);
        this.camera = cameraComp.threeCamera;

        // we parent camera directly to scene instead of threeGroup
        // due to three behaviour wrt camera parenting.
        this.scene.add(cameraComp.threeCamera);

        var thisIsThis = this;
        var onCameraAttributeChanged = function(changedAttr, changeType) {
            //console.log("onCameraAddedOrChanged due to attributeChanged ->", changedAttr.ref);
            var id = changedAttr.id;
            if (id === "aspectRatio" || id === "verticalFov" ||
                id === "nearPlane" || id === "farPlane")
                thisIsThis.onCameraAddedOrChanged(threeGroup, cameraComp);
        };
        var removed = cameraComp.attributeChanged.remove(onCameraAttributeChanged);
        if (removed) {
            //console.log("removed old camera attr change hook");
        }
        cameraComp.attributeChanged.add(onCameraAttributeChanged);
        this.connectToPlaceable(cameraComp.threeCamera, cameraComp.parentEntity.placeable);
        // console.log("camera (o3d id " + cameraComp.threeCamera.id + ", entity id" + cameraComp.parentEntity.id + ") connected to placeable");
    },

    degToRad: function(val) {
        return val * (Math.PI / 180);
    },

    updateInterpolations: function(delta) {
        for (var i = this.interpolations.length - 1; i >= 0; i--) {
            var interp = this.interpolations[i];
            var finished = false;

            // Allow the interpolation to persist for 2x time, though we are no longer setting the value
            // This is for the continuous/discontinuous update detection in updateFromTransform()
            if (interp.time <= interp.length) {
                interp.time += delta;
                var t = interp.time / interp.length; // between 0 and 1

                if (t > 1) {
                    t = 1;
                }

                // LERP

                // position
                var newPos = interp.start.position.clone();
                newPos.lerp(interp.end.position, t);
                interp.dest.position.set(newPos.x, newPos.y, newPos.z);

                // rotation
                var newRot = interp.start.rotation.clone();
                newRot.slerp(interp.end.rotation, t);
                interp.dest.quaternion.set(newRot.x, newRot.y, newRot.z, newRot.w);

                // scale
                var newScale = interp.start.scale.clone();
                newScale.lerp(interp.end.scale, t);
                interp.dest.scale.set(newScale.x, newScale.y, newScale.z);
            } else {
                interp.time += delta;
                if (interp.time >= interp.length * 2) {
                    finished = true;
                }
            }

            // Remove interpolation (& delete start/endpoints) when done
            if (finished) {
                this.interpolations.splice(i, 1);
            }
        }
    },

    endInterpolation: function(obj) {
        for (var i = this.interpolations.length - 1; i >= 0; i--) {
            if (this.interpolations[i].dest == obj) {
                this.interpolations.splice(i, 1);
                return true;
            }
        }
        return false;
    },

    updateFromTransform: function(threeMesh, placeable) {
        checkDefined(placeable, threeMesh);
        var ptv = placeable.transform;

        // INTERPOLATION

        // Update interval

        // If it's the first measurement, set time directly. Else smooth
        var time = this.clock.getDelta(); // seconds

        if (this.avgUpdateInterval === 0) {
            this.avgUpdateInterval = time;
        } else {
            this.avgUpdateInterval = 0.5 * time + 0.5 * this.avgUpdateInterval;
        }

        var updateInterval = this.updatePeriod_;
        if (this.avgUpdateInterval > 0) {
            updateInterval = this.avgUpdateInterval;
        }
        // Add a fudge factor in case there is jitter in packet receipt or the server is too taxed
        updateInterval *= 1.25;

        // End previous interpolation if existed 
        var previous = this.endInterpolation(threeMesh);

        // If previous interpolation does not exist, perform a direct snapping to the end value
        // but still start an interpolation period, so that on the next update we detect that an interpolation is going on,
        // and will interpolate normally
        if (!previous) {
            copyXyz(ptv.pos, threeMesh.position);
            copyXyz(ptv.scale, threeMesh.scale);
            copyXyzMapped(ptv.rot, threeMesh.rotation, this.degToRad);
        }

        // Create new interpolation

        // position
        var endPos = new THREE.Vector3();
        copyXyz(ptv.pos, endPos);

        // rotation
        var endRot = new THREE.Quaternion();
        var euler = new THREE.Euler();
        euler.order = 'XYZ';
        copyXyzMapped(ptv.rot, euler, this.degToRad);
        endRot.setFromEuler(euler, true);

        // scale
        var endScale = new THREE.Vector3();
        copyXyz(ptv.scale, endScale);

        // interpolation struct
        var newInterp = {
            dest: threeMesh,
            start: {
                position: threeMesh.position,
                rotation: threeMesh.quaternion,
                scale: threeMesh.scale
            },
            end: {
                position: endPos,
                rotation: endRot,
                scale: endScale
            },
            time: 0,
            length: updateInterval // update interval (seconds)
        };

        this.interpolations.push(newInterp);

        if (placeable.debug)
            console.log("update placeable to " + placeable);
    },

    connectToPlaceable: function(threeObject, placeable) {
        if (placeable.debug)
            console.log("connect o3d " + threeObject.id + " to placeable - pl x " + placeable.transform.pos.x + " o3d x " + threeObject.position.x + " o3d parent x " + threeObject.parent.position.x);

        //NOTE: this depends on component handling being done here before the componentReady signal fires
        var thisIsThis = this;
        placeable.parentRefReady.add(function() {
            var parent = thisIsThis.parentForPlaceable(placeable);
            //NOTE: assumes first call -- add removing from prev parent to support live changes! XXX
            parent.add(threeObject);
            if (placeable.debug)
                console.log("parent ref set - o3d id=" + threeObject.id + " added to parent " + parent.id);
            thisIsThis.updateFromTransform(threeObject, placeable);
            placeable.attributeChanged.add(function(attr, changeType) {
                thisIsThis.updateFromTransform(threeObject, placeable); //Todo: pass attr to know when parentRef changed
            });
        });
    },

    parentForPlaceable: function(placeable) {
        var parent;
        if (placeable.parentRef) {
            var parentOb = this.o3dByEntityId[placeable.parentRef];
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
    },

    onMouseDown: function() {
        var camera = this.camera;
        var mouse = {
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: -(event.clientY / window.innerHeight) * 2 + 1,
        };

        // Raycast
        var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
        this.projector.unprojectVector(vector, camera);
        var pLocal = new THREE.Vector3(0, 0, -1);
        var pWorld = pLocal.applyMatrix4(camera.matrixWorld);
        var ray = new THREE.Raycaster(pWorld, vector.sub(pWorld).normalize());

        // Get meshes from all objects
        var getMeshes = function(children) {
            var meshes = [];
            for (var i = 0; i < children.length; i++) {
                if (children[i].children.length > 0) {
                    meshes = meshes.concat(getMeshes(children[i].children));
                } else if (children[i] instanceof THREE.Mesh) {
                    meshes.push(children[i]);
                }
            }
            return meshes;
        };

        function attributeValues(o) {
            var out = [];
            for (var key in o) {
                if (!o.hasOwnProperty(key))
                    continue;
                out.push(o[key]);
            }
            return out;
        }

        var objects = attributeValues(this.o3dByEntityId);
        var meshes = getMeshes(objects);

        // Intersect
        var intersects = ray.intersectObjects(meshes);

        // if there is one (or more) intersections
        if (intersects.length > 0) {
            var clickedObject = intersects[0].object;
            var entID = clickedObject.parent.userData.entityId;
            var intersectionPoint = "" + intersects[0].point.x + "," + intersects[0].point.y + "," + intersects[0].point.z;
            var face = intersects[0].face;
            var params = [event.button, intersectionPoint, face ? face.materialIndex : 0];

            this.objectClicked.dispatch(entID, params);
        }
    }
};

EC_Placeable.prototype.toString = function() {
    var t = this.transform;
    return "[Placeable pos:" + t.pos.x + " " + t.pos.y + " " + t.pos.z + ", rot:" + t.rot.x + " " + t.rot.y + " " + t.rot.z + ", scale:" + t.scale.x + " " + t.scale.y + " " + t.scale.z + "]";
};

THREE.Vector3.prototype.toString = function() {
    return "[THREE.Vector3 " + this.x + " " + this.y + " " + this.z + "]";
};
THREE.Euler.prototype.toString = function() {
    return "[THREE.Euler " + this.x + " " + this.y + " " + this.z + "]";
};

function copyXyz(src, dst) {
    dst.x = src.x;
    dst.y = src.y;
    dst.z = src.z;
}

function copyXyzMapped(src, dst, mapfun) {
    dst.x = mapfun(src.x);
    dst.y = mapfun(src.y);
    dst.z = mapfun(src.z);
}

function ThreeAssetLoader() {
    this.pendingLoads = {};
}

ThreeAssetLoader.prototype.cachedLoadAsset = function(url, loadedCallback) {
    var loadedSig = this.pendingLoads[url];
    if (loadedSig === undefined) {
        loadedSig = new signals.Signal();
        loadedSig.addOnce(loadedCallback);
        this.pendingLoads[url] = loadedSig;
    } else {
        loadedSig.addOnce(loadedCallback);
    }

    check(typeof(url) === "string");
    if (url === "") {
        loadedCallback();
        return;
    }

    var thisIsThis = this;
    this.load(url, function(geometry, material) {
        if (material === undefined) {
            material = new THREE.MeshBasicMaterial({
                color: 0x808080
            });
        }
        checkDefined(geometry);
        loadedCallback(geometry, material);
        delete thisIsThis.pendingLoads[url];
    }, {});
};

ThreeAssetLoader.prototype.load = function(url, completedCallback) {
    check(typeof url === "string");
    if (url === "") {
        completedCallback();
        return;
    }
    var fn;
    if (suffixMatch(url, ".ctm"))
        fn = this.loadCtm;
    else if (suffixMatch(url, ".json") || suffixMatch(url, ".js"))
        fn = this.loadJson;
    else
        throw "don't know url suffix " + url;

    fn(url, completedCallback);
};

ThreeAssetLoader.prototype.loadCtm = function(url, completedCallback) {
    var loader = new THREE.CTMLoader();
    loader.load(url, completedCallback, {
        useWorker: false
    });
};

ThreeAssetLoader.prototype.loadJson = function(url, completedCallback) {
    var loader = new THREE.JSONLoader();
    loader.load(url, completedCallback);
};


function suffixMatch(str, suffix) {
    str = str.toLowerCase();
    suffix = suffix.toLowerCase();
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
