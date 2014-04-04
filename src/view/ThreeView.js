"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals, Stats, Detector */

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Erno Kuusela
 *      @author Tapani Jamsa
 *      @author Toni Alatalo
 */

if (Tundra === undefined)
    var Tundra = {};

Tundra.useCubes = false;

Tundra.ThreeView = function() {
    
    this.o3dByEntityId = {}; // Three.Object3d's that correspond to Placeables and have Meshes etc as children

    // SCENE
    this.scene = this.createScene();

    // Default camera
    var SCREEN_WIDTH = window.innerWidth,
        SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45,
        ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
        NEAR = 0.1,
        FAR = 20000;
    
    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.scene.add(this.camera);
    this.camera.position.set(0, 20, 50);
    this.camera.lookAt(this.scene.position);
    this.defaultCamera = this.camera;

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
    this.componentRemovedSig = new signals.Signal();
    this.assetLoader = new Tundra.ThreeAssetLoader();
};

Tundra.ThreeView.prototype = {

    constructor: Tundra.ThreeView,

    createScene: function() {
        return new THREE.Scene();
    },

    render: function(delta) {
        // Tundra.checkDefined(this.scene, this.camera);

        this.updateInterpolations(delta);
        
        THREE.AnimationHandler.update(delta);

        this.renderer.render(this.scene, this.camera);
    },

    onComponentAddedOrChanged: function(entity, component, changeType, changedAttr) {
        Tundra.check(component instanceof Tundra.Component);
        Tundra.check(entity instanceof Tundra.Entity);
        var threeGroup = this.o3dByEntityId[entity.id];
        if (!threeGroup) {
            Tundra.check(entity.id > 0);
            console.log("Create three Object3d " + entity.id);
            this.o3dByEntityId[entity.id] = threeGroup = new THREE.Object3D();
            //console.log("created new o3d group id=" + threeGroup.id);
            threeGroup.userData.entityId = entity.id;
            
            entity.actionTriggered.add(this.OnEntityAction.bind(entity));
            entity.actionFuntionMap = {};
            
            entity.threeGroup = threeGroup;
            this.scene.add(entity.threeGroup);
            
            //console.log("registered o3d for entity", entity.id);
        } else {
            //console.log("got cached o3d group " + threeGroup.id + " for entity " + entity.id);
        }

        if (component instanceof Tundra.EC_Placeable) {
            
            this.connectToPlaceable( threeGroup, component );
            this.PlaceableIntialize( entity, component );
            
        }
        else if (component instanceof Tundra.EC_Mesh) {
            // console.log("mesh changed or added for o3d " + threeGroup.userData.entityId);
            this.onMeshAddedOrChanged(threeGroup, component);
        } else if (component instanceof Tundra.EC_Camera)
            this.onCameraAddedOrChanged(threeGroup, component);
        else if (component instanceof Tundra.EC_Light)
            this.onLightAddedOrChanged(threeGroup, component);
        else if (component instanceof Tundra.EC_AnimationController)
            this.onAnimatorAddedOrChanged(threeGroup, component);
        else
            console.log("Component not handled by ThreeView:", entity, component);
    },
    
    OnEntityAction : function( name, params, execType ) {
        
        var sender = this;
        var call = sender.actionFuntionMap[name];
        if ( typeof call === "function" )
            call(params);

    },

    onComponentRemoved: function(entity, component, changeType) {
        try {
            return this.onComponentRemovedInternal(entity, component);
        } catch (e) {
            debugger;
        }
    },

    onComponentRemovedInternal: function(entity, component) {
        Tundra.checkDefined(component, entity);

        if (component instanceof Tundra.EC_Placeable) {
            var threeGroup = this.o3dByEntityId[entity.id];
            threeGroup.parent.remove(threeGroup);
            
            entity.actionTriggered.remove(this.OnEntityAction.bind(entity));
            entity.actionFuntionMap = {};
            
            delete entity.threeGroup;
            delete this.o3dByEntityId[entity.id];
        } else if (component instanceof Tundra.EC_Mesh) {
            
            this.onMeshRelease(entity, component);
            
        } else if (component instanceof Tundra.EC_Camera) {
            
            this.onCameraRelease( entity, component );
            
        } else if (component instanceof Tundra.EC_Light) {
            // this.onLightAddedOrChanged(threeGroup, component);
        } else if (component instanceof Tundra.EC_AnimationController) {
            
            this.onAnimatorRelease(entity, component);
            
        } else {
            console.log("view doesn't know about removed component " + component);
        }

        this.componentRemovedSig.dispatch(component);
    },

    onMeshAddedOrChanged: function(threeGroup, meshComp) {
        if (threeGroup === undefined) {
            console.warn("threeGroup is undefined! (Issue #45)");
            return;
        }
        if (meshComp.threeMesh) {
            /* remove previous mesh if it existed */
            /* async hazard: what if two changes for same mesh come in
               order A, B and loads finish in order B, A */
            if (!Tundra.useCubes) {
                threeGroup.remove(meshComp.threeMesh);
                //console.log("removing prev three mesh on ec_mesh attr change");
            }
        } else {
            console.log("adding first mesh for o3d id=" + threeGroup.id);
        }

        if (!meshComp.attributeChanged.has(this.onMeshAttributeChanged, this))
            meshComp.attributeChanged.add(this.onMeshAttributeChanged, this);

        meshComp.assetReady = false;

        var url = meshComp.meshRef.ref;
        
        // If mesh asset ref is empty dont try to load asset.
        
        if (url === "")
            return;

        url = url.replace("local://", "");
        url = url.replace(/\.mesh$/i, ".json");

        var thisIsThis = this;
        this.assetLoader.cachedLoadAsset(url, function(arg1, material) {
            if (arg1 && arg1.scene) {
                // if it was a SceneLoader scene, we get a finished scene node
                thisIsThis.onSceneLoaded(threeGroup, meshComp, arg1.scene);
            } else {
                var geometry = arg1;
                thisIsThis.onMeshLoaded(threeGroup, meshComp, geometry, material);
            }
        });
        
        var animation = meshComp.parentEntity.animationController;
        if ( animation !== undefined )
            this.onAnimatorAddedOrChanged(threeGroup, animation);
    },
    
    onMeshAttributeChanged : function(changedAttr, changeType) {
        
        if (changedAttr.id !== "meshRef")
            return;
            
        var mesh = changedAttr.owner;
        if ( mesh === undefined )
            return;
            //console.log("onMeshAddedOrChanged due to attributeChanged ->", changedAttr.ref);
        this.onMeshAddedOrChanged(mesh.parentEntity.threeGroup, mesh);
            
    },

    onMeshLoaded: function(threeParent, meshComp, geometry, material) {
        
        if (!Tundra.useCubes && geometry === undefined) {
            
            console.log("mesh load failed");
            return;
            
        }
        
        var mesh;
        
        if (Tundra.useCubes) {
            
            /*if (meshComp.meshRef.ref === "") {
                console.log("useCubes ignoring empty meshRef");
                return; //hackish fix to avoid removing the cube when the ref gets the data later
            }*/
            mesh = new THREE.Mesh(this.cubeGeometry, this.wireframeMaterial);
            
        }
        else if ( geometry.bones !== undefined && geometry.bones.length > 0 ) {
            
            // Set material skinning to true or skeletal animation wont work.
            
            var newMaterial = new THREE.MeshFaceMaterial(material);
            newMaterial.materials[0].skinning = true;
            
            mesh = new THREE.SkinnedMesh(geometry, newMaterial, false);
            
            // Create skeleton bones and add them to mesh component.
            
            meshComp.skeleton = null;
            
            if ( mesh.bones.length > 0 ) {
            
                var bones = mesh.bones;
                var bone;
                var parentBone = null;

                meshComp.skeleton = new Tundra.Skeleton();

                for ( var i = 0; i < bones.length; ++i ) {

                    if (bones[i].parent !== null) {
                        parentBone = meshComp.skeleton.getBone(bones[i].parent.name);
                    }

                    bone = new Tundra.Bone(bones[i].name, parentBone);
                    bone.threeBone = bones[i];

                    // Add attach bone function to bone object

                    bone.attach = function( placeable ) {

                        Bone.prototype.attach.call(this, placeable);

                        //placeable.threeMesh.update = function() {};
                        placeable.parentEntity.threeGroup.update = function ( parentSkinMatrix, forceUpdate ) {

                            this.updateMatrixWorld(true);

                        };
                        var parent = this.threeBone;

                        do {
                            if (parent instanceof THREE.Bone) {

                                parent.update = function( parentSkinMatrix, forceUpdate ) {
                                    THREE.Bone.prototype.update.call(this, parentSkinMatrix, forceUpdate);
                                    this.updateMatrixWorld(true);
                                };

                            } else {

                                break;

                            }
                            parent = parent.parent;

                        } while (parent !== undefined);

                        this.threeBone.add(placeable.parentEntity.threeGroup);

                    };

                    // Add detach bone function to bone object

                    bone.detach = function( placeable ) {

                        Bone.prototype.detach.call(this, placeable);

                        //delete placeable.threeMesh.update;
                        delete placeable.parentEntity.threeGroup.update;
                        
                        if ( this.skeleton.hasAttachments() ) {

                            var parent = this.threeBone;
                            do {
                                if (parent instanceof THREE.Bone) 
                                    delete parent.update;
                                else
                                    break;
                                parent = parent.parent;
                            } while(parent !== undefined);

                        }

                        this.threeBone.remove(placeable.parentEntity.threeGroup);

                    };
                    
                    bone.enableAnimation = function( enable, recursive ) {
                        
                        Tundra.Bone.prototype.enableAnimation.call(this, enable, recursive);
                        
                        this.threeBone.enableAnimations = enable;
                        
                    };

                    meshComp.skeleton.addBone(bone);
                }
            }
            
        } else {
            
            Tundra.checkDefined(geometry, material, meshComp, threeParent);
            mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));
            Tundra.checkDefined(threeParent, meshComp, geometry, material);
            
        }
        
        meshComp.updateNodeTransform = function () {
          
            var trans = this.nodeTransformation;
          
            // TODO use cache variables.
          
            this.threeMesh.position = new THREE.Vector3(trans.pos.x, trans.pos.y, trans.pos.z);
            this.threeMesh.rotation = new THREE.Euler(THREE.Math.degToRad(trans.rot.x), THREE.Math.degToRad(trans.rot.y), THREE.Math.degToRad(trans.rot.z), 'ZYX');
            this.threeMesh.scale = new THREE.Vector3(trans.scale.x, trans.scale.y, trans.scale.z);
            
        };
        
        Tundra.checkDefined(meshComp.parentEntity);
        Tundra.check(threeParent.userData.entityId === meshComp.parentEntity.id);

        meshComp.threeMesh = mesh;

        if ( threeParent.visible === false )
            meshComp.threeMesh.visible = false;

        threeParent.add(mesh);
        this.meshReadySig.dispatch(meshComp, mesh);
        mesh.needsUpdate = 1;
        
        meshComp.assetReady = true;
        meshComp.updateNodeTransform();
        meshComp.meshAssetReady.dispatch(meshComp);
        
        console.log("added mesh to o3d id=" + threeParent.id);
        // threeParent.needsUpdate = 1;

        // do we need to set up signal that does
        // mesh.applyMatrix(threeParent.matrixWorld) when placeable
        // changes?
        
    },
    
    onMeshRelease: function(entity, component) {
        
        var animation = entity.componentByType("AnimationController");
        if (animation !== null)
            animation.stopAll();
        
        component.attributeChanged.remove(this.onMeshAttributeChanged, this);
        
        if (component.threeMesh !== undefined) {
            
            var i, mesh = component.threeMesh;
            
            if (component.parentEntity.threeGroup !== undefined)
                component.parentEntity.threeGroup.remove( mesh );
            
            mesh.geometry.dispose();
            for (i in mesh.geometry )
                delete mesh.geometry[i];
            
            if (mesh.material !== undefined && mesh.material.materials !== undefined) {
                
                for (i = 0; i < mesh.material.materials.length; ++i ) {
                    mesh.material.materials[i].dispose();
                }
                
            }
            
            delete component.threeMesh;
            
        }
        
    },

    onSceneLoaded: function(threeParent, meshComp, scene) {
        Tundra.checkDefined(scene);
        threeParent.add(scene);
    },

    onLightAddedOrChanged: function(threeGroup, lightComp) {
        var prevThreeLight = lightComp.threeLight;
        if (prevThreeLight) {
            // console.log("removed existing light");
            threeGroup.remove(prevThreeLight);
        }
        if (lightComp.type != Tundra.LT_Point) {
            console.log("not implemented: light type " + lightComp.type);
            return;
        }
        var threeColor = new THREE.Color();
        /* for story about diffuse color and Three, see
           https://github.com/mrdoob/three.js/issues/1595 */
        threeColor.copy(lightComp.diffColor);
        lightComp.threeLight = new THREE.PointLight(threeColor,
            lightComp.brightness,
            lightComp.range);
        threeGroup.add(lightComp.threeLight);

        if (!lightComp.attributeChanged.has(this.onLightAttributeChanged, this))
            lightComp.attributeChanged.add(this.onLightAttributeChanged, this);
    },
            
    onLightAttributeChanged: function(changedAttr, changeType) {
    
        var id = changedAttr.id;
        if (id === "range" || id === "brightness" ||
            id === "diffColor" || id === "type")
            this.onLightAddedOrChanged(changedAttr.owner.parentEntity.threeGroup, changedAttr.owner);
        
    },

    onCameraAddedOrChanged: function(threeGroup, cameraComp) {
        
        var prevThreeCamera = cameraComp.threeCamera;
        if (prevThreeCamera) {
            threeGroup.remove(prevThreeCamera);
            console.log("removing previous camera");
        }
        
        var threeAspectRatio = cameraComp.aspectRatio;
        if (threeAspectRatio === "") {
            
            // If no aspect ration is defined use target window width and height
            // to calculate correct aspect ration, so that geometry wont stretch.
            
            threeAspectRatio = window.innerWidth / window.innerHeight;
        
        }
        
        cameraComp.threeCamera = new THREE.PerspectiveCamera(
            cameraComp.verticalFov, threeAspectRatio,
            cameraComp.nearPlane, cameraComp.farPlane);
            
        cameraComp.lookAt = function ( vector3 ) {
            
            // TODO use transform rotation instead.
            cameraComp.threeCamera.lookAt( new THREE.Vector3(vector3.x, vector3.y, vector3.z) );

        };

        this.camera = cameraComp.threeCamera;

        cameraComp.parentEntity.threeGroup.add( cameraComp.threeCamera );

        if (!cameraComp.attributeChanged.has(this.onCameraAttributeChanged, this))
            cameraComp.attributeChanged.add(this.onCameraAttributeChanged, this);
        
        if (!cameraComp.setCameraActive.has(this.setActiveCamera, this))
            cameraComp.setCameraActive.add(this.setActiveCamera, this);
        
        if (cameraComp.setActive === undefined) {
            
            cameraComp.setActive = function () {
                
                this.setCameraActive.dispatch( this );
                
            }
            
        }
        
        this.scene.matrixWorldNeedsUpdate = true;
        
    },
            
    setActiveCamera: function( camera ) {
        
        this.camera = camera.threeCamera;
        
    },
            
    onCameraAttributeChanged: function(changedAttr, changeType) {

        var id = changedAttr.id;
        if (id === "aspectRatio" || id === "verticalFov" ||
            id === "nearPlane" || id === "farPlane") {
            this.onCameraAddedOrChanged(changedAttr.owner.parentEntity.threeGroup, changedAttr.owner);
        }
        
    },
            
    onCameraRelease: function( entity, component ) {
        
        component.attributeChanged.remove(this.onCameraAttributeChanged, this);
        component.setCameraActive.remove(this.setActiveCamera, this);
        
        entity.threeGroup.remove(component.threeCamera);
        
        if ( this.camera === component.threeCamera )
            this.camera = this.defaultCamera;
        
        delete component.threeCamera;
        
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
        
        Tundra.checkDefined(placeable, threeMesh);
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
            // Position
            copyXyz(ptv.pos, threeMesh.position);

            // Rotation
            var quat = new THREE.Quaternion();
            var euler = new THREE.Euler();
            //euler.order = 'XYZ'; //not needed as tundraToThreeEuler defines it too
            tundraToThreeEuler(ptv.rot, euler);
            quat.setFromEuler(euler, true);
            threeMesh.quaternion = quat;

            // Scale
            copyXyz(ptv.scale, threeMesh.scale);
        }

        // Create new interpolation

        // position
        var endPos = new THREE.Vector3();
        copyXyz(ptv.pos, endPos);

        // rotation
        var endRot = new THREE.Quaternion();
        var euler = new THREE.Euler();
        //euler.order = 'XYZ'; ////not needed as tundraToThreeEuler defines it too
        tundraToThreeEuler(ptv.rot, euler);
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
        var parent, parentOb;
        if (placeable.parentRef) {
            parentOb = this.o3dByEntityId[placeable.parentRef];
            if (!parentOb) {
                console.log("ThreeView parentForPlaceable ERROR: adding object but parent not there yet -- even though this is called only after the parent was reported being there in the EC scene data. Falling back to add to scene.");
                parent = this.scene;
            } else {
                parent = parentOb;
            }
        } else if (placeable.parentEntity.parent) {
            parentOb = this.o3dByEntityId[placeable.parentEntity.parent.id];
            if (!parentOb) {
                console.log("ThreeView parentForPlaceable ERROR: adding object but parent not there yet. Falling back to add to scene.");
                parent = this.scene;
            } else {
                parent = parentOb;
            }
        } else {
            parent = this.scene;
        }

        return parent;
    },

    onMouseDown: function(event) {
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


Tundra.EC_Placeable.prototype.toString = function() {
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

function tundraToThreeEuler(src, dst) {
    var degToRad = function(val) {
        return val * (Math.PI / 180);
    };
    dst.set(degToRad(src.x), degToRad(src.y), degToRad(src.z), 'ZYX');
}

Tundra.ThreeAssetLoader = function() {
    this.pendingLoads = {};
}

Tundra.ThreeAssetLoader.prototype.cachedLoadAsset = function(url, loadedCallback) {
    var loadedSig = this.pendingLoads[url];
    if (loadedSig === undefined) {
        loadedSig = new signals.Signal();
        loadedSig.addOnce(loadedCallback);
        this.pendingLoads[url] = loadedSig;
    } else {
        loadedSig.addOnce(loadedCallback);
    }

    Tundra.check(typeof(url) === "string");
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
        Tundra.checkDefined(geometry);
        loadedCallback(geometry, material);
        delete thisIsThis.pendingLoads[url];
    }, {});
};

Tundra.ThreeAssetLoader.prototype.load = function(url, completedCallback) {
    Tundra.check(typeof url === "string");
    if (url === "") {
        completedCallback();
        return;
    }
    var fn;
    if (Tundra.suffixMatch(url, ".ctm"))
        fn = this.loadCtm;
    else if (Tundra.suffixMatch(url, ".json") || Tundra.suffixMatch(url, ".js"))
        fn = this.loadJson;
    else if (Tundra.suffixMatch(url, ".gltf"))
        fn = this.loadGltf;
    else if (Tundra.suffixMatch(url, ".jsonscene"))
        fn = this.loadJsonScene;
    else
        throw "don't know url suffix " + url;

    fn(url, completedCallback);
};

Tundra.ThreeAssetLoader.prototype.loadCtm = function(url, completedCallback) {
    var loader = new THREE.CTMLoader();
    loader.load(url, completedCallback, {
        useWorker: false
    });
};

Tundra.ThreeAssetLoader.prototype.loadJson = function(url, completedCallback) {
    var loader = new THREE.JSONLoader();
    loader.load(url, completedCallback);
};

Tundra.ThreeAssetLoader.prototype.loadJsonScene = function(url, completedCallback) {
    var loader = new THREE.SceneLoader();
    loader.load(url, completedCallback);
};

Tundra.ThreeAssetLoader.prototype.loadGltf = function(url, completedCallback) {
    var loader = new THREE.glTFLoader();
    loader.useBufferGeometry = true;
    loader.load(url, completedCallback);
};

Tundra.suffixMatch = function(str, suffix) {
    str = str.toLowerCase();
    suffix = suffix.toLowerCase();
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};
