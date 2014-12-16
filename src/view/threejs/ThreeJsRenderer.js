
define([
        "lib/classy",
        "lib/three",
        "lib/three/CSS3DRenderer",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/scene/Scene",
        "core/math/Color",
        "core/renderer/IRenderSystem",
        "core/renderer/RaycastResult",
        "core/asset/AssetFactory",
        "view/threejs/asset/ObjMeshAsset",
        "view/threejs/asset/ThreeJsonAsset",
        "view/threejs/entity-components/EC_Fog_ThreeJs",
        "view/threejs/entity-components/EC_AnimationController_ThreeJs",
        "view/threejs/entity-components/EC_Camera_ThreeJs",
        "view/threejs/entity-components/EC_Mesh_ThreeJs",
        "view/threejs/entity-components/EC_Placeable_ThreeJs"
    ], function(Class, THREE, CSS3DRenderer, TundraSDK, TundraLogging, Scene, Color, IRenderSystem, RaycastResult, AssetFactory,
                ObjMeshAsset,
                ThreeJsonAsset,
                EC_Fog_ThreeJs,
                EC_AnimationController_ThreeJs,
                EC_Camera_ThreeJs,
                EC_Mesh_ThreeJs,
                EC_Placeable_ThreeJs) {
/**
    Three.js renderer implementation that is accessible from {{#crossLink "TundraClient/renderer:property"}}TundraClient.renderer{{/crossLink}}

    Manages the rendering engine scene and its scene nodes. Utility functions for camera, raycasting etc.
    @class ThreeJsRenderer
    @extends IRenderSystem
    @constructor
*/
var ThreeJsRenderer = IRenderSystem.$extend(
{
    __init__ : function()
    {
        this.$super("three.js");
        this.log = TundraLogging.getLogger("ThreeJsRenderer");
    },

    load : function(params)
    {
        /**
            <pre>{
                width   : Number,
                height  : Number
            }</pre>
            @property windowSize
            @type Object
        */
        this.windowSize = { width : TundraSDK.framework.client.container.width(), height : TundraSDK.framework.client.container.height() };

        try
        {
            /**
                @property renderer
                @type THREE.WebGLRenderer
            */
            this.renderer = new THREE.WebGLRenderer({ antialias : true });
            this.renderer.setSize(this.windowSize.width, this.windowSize.height);
            this.renderer.sortObjects = true;
            this.renderer.physicallyBasedShading = true;
        }
        catch (e)
        {
            this.renderer = null;
            this.log.error("Failed to initialize WebGL rendering, aborting startup:", e);
            return;
        }

        this.setupShadows({
            enabled     : true,
            softShadows : true,
            drawDebug   : false,
            clip : {
                near    : 50,
                far     : 1000
            },
            textureSize : {
                width   : 2048,
                height  : 2048
            },
            bounds : {
                right   :  30,
                left    : -30,
                top     :  20,
                bottom  : -20
            }
        });

        this.cssRenderer = null;
        this.cssRendererScene = null;

        /**
            @property scene
            @type THREE.Scene
        */
        this.scene = null;

        /**
            @property activeCameraComponent
            @type EC_Camera_ThreeJs
        */
        this.activeCameraComponent = null;

        /**
            @property camera
            @type THREE.PerspectiveCamera
        */
        this.camera = null;

        /**
            @property projector
            @type THREE.Projector
        */
        this.projector = new THREE.Projector();
        if (parseInt(THREE.REVISION) > 68)
            this.projector.pickingRay = this._threeProjectorPickingRay.bind(this.projector);

        /**
            @property raycaster
            @type THREE.Raycaster
        */
        this.raycaster = new THREE.Raycaster();

        /**
            Latest raycast result. Use raycast() to execute.
            @property raycastResult
            @type THREE.Projector
        */
        this.raycastResult = new RaycastResult();
        this.raycastResult._raycastVector = new THREE.Vector3(0,0,0);

        this.raycastFromResult = new RaycastResult();
        this.meshes = [];

        /**
            @property axisX
            @type THREE.Vector3
        */
        this.axisX = new THREE.Vector3(1,0,0);
        /**
            @property axisY
            @type THREE.Vector3
        */
        this.axisY = new THREE.Vector3(0,1,0);
        /**
            @property axisZ
            @type THREE.Vector3
        */
        this.axisZ = new THREE.Vector3(0,0,1);

        // DOM hookup
        TundraSDK.framework.client.container.append(this.renderer.domElement);
        window.addEventListener("resize", this.onWindowResize, false);

        /**
            Basic white solid color material that is used as a default in rendering.
            @property materialWhite
            @type THREE.MeshPhongMaterial
        */
        this.materialWhite = new THREE.MeshPhongMaterial({ "color": this.convertColor("rgb(240,240,240)"), "wireframe" : false });
        this.materialWhite.name = "tundra.MaterialLibrary.SolidWhite";

        /**
            Basic red solid color material that can be used for material load errors.
            @property materialLoadError
            @type THREE.MeshPhongMaterial
        */
        this.materialLoadError = new THREE.MeshPhongMaterial({ "color": this.convertColor("rgb(240,50,50)"), "wireframe" : false });
        this.materialLoadError.name = "tundra.MaterialLibrary.LoadError";

        // Register the three.js asset and component implementations.
        this.registerAssetFactories();
        this.registerComponents();
    },

    postInitialize : function()
    {
        // Track mesh components and their mesh loaded signals.
        // The objects can be queried from _getAllObjects(), this is an attempt
        // to optimize getAllMeshes() which iterates the whole scene for EC_Mesh
        // potentially multiple times per frame.
        this._sceneObjects = {};
        this._meshLoadedSubs = {};
        this._trackingKey = "";

        TundraSDK.framework.scene.onComponentCreated(this, this.onSceneComponentCreated);
        TundraSDK.framework.scene.onComponentRemoved(this, this.onSceneComponentRemoved);
    },

    unload : function()
    {
        /// @todo Implement to support runtime render system swaps!
    },

    onSceneComponentCreated : function(entity, component)
    {
        if (component.typeId === 17) // EC_Mesh
        {
            this._trackingKey = entity.id + "." + component.id;
            this._meshLoadedSubs[this._trackingKey] = component.onMeshLoaded(this, this.onSceneMeshLoaded);
        }
    },

    onSceneComponentRemoved : function(entity, component)
    {
        if (component.typeId !== 17) // EC_Mesh
            return;

        this._trackingKey = entity.id + "." + component.id;
        if (this._sceneObjects[this._trackingKey] !== undefined)
            delete this._sceneObjects[this._trackingKey];
    },

    onSceneMeshLoaded : function(entity, component, meshAsset)
    {
        this._trackingKey = entity.id + "." + component.id;
        this._sceneObjects[this._trackingKey] = [];

        for (var i=0, len=meshAsset.numSubmeshes(); i<len; ++i)
        {
            var submesh = meshAsset.getSubmesh(i);
            if (submesh !== undefined && submesh !== null)
                this._sceneObjects[this._trackingKey].push(submesh);
        }

        if (this._meshLoadedSubs[this._trackingKey] !== undefined)
        {
            TundraSDK.framework.events.unsubscribe(this._meshLoadedSubs[this._trackingKey]);
            delete this._meshLoadedSubs[this._trackingKey];
        }
    },

    _getAllObjects : function()
    {
        var list = [];
        for (var key in this._sceneObjects)
            list = list.concat(this._sceneObjects[key]);
        return list;
    },

    registerAssetFactories : function()
    {
        /** @note It would be too wide of acceptance range if the three.js json accepted all .json file extensions.
            .3geo is a three.js "standardized" extensions for mesh assets, but not widely used (yet).
            You can load from .json/.js files via AssetAPI but you need to force the type to "ThreeJsonMesh". */
        TundraSDK.framework.asset.registerAssetFactory(new AssetFactory("ThreeJsonMesh", ThreeJsonAsset, { ".3geo" : "json", ".json" : "json", ".js" : "json" }, "json"));
        TundraSDK.framework.asset.registerAssetFactory(new AssetFactory("ObjMesh", ObjMeshAsset, { ".obj" : "text" }));
    },

    registerComponents : function()
    {
        Scene.registerComponent( 9, "EC_Fog", EC_Fog_ThreeJs);        
        Scene.registerComponent(14, "EC_AnimationController", EC_AnimationController_ThreeJs);
        Scene.registerComponent(15, "EC_Camera", EC_Camera_ThreeJs);
        Scene.registerComponent(17, "EC_Mesh", EC_Mesh_ThreeJs);
        Scene.registerComponent(20, "EC_Placeable", EC_Placeable_ThreeJs);
    },

    getCssRenderer : function()
    {
        if (this.cssRenderer == null)
        {
            this.cssRenderer = new THREE.CSS3DRenderer();
            this.cssRenderer.setSize(this.windowSize.width, this.windowSize.height);

            var cssDom = $(this.cssRenderer.domElement);
            var webglDom = $(this.renderer.domElement);

            cssDom.css({
                "background-color" : "transparent",
                "position" : "absolute",
                "top"       : 0,
                "margin"    : 0,
                "padding"   : 0,
                "z-index"   : 1
            });

            webglDom.css({
                "background-color" : "transparent",
                "position"  : "absolute",
                "top"       : 0,
                "margin"    : 0,
                "padding"   : 0,
                "z-index"   : 1
            });

            /* @note CSS renderer to main container. WebGL inside Css renderer. Both with same z-index.
               This will get the 3D objects rendered on top of the CSS renderer elements. */
            TundraSDK.framework.client.container.append(cssDom);
            cssDom.append(webglDom);
        }
        return this.cssRenderer;
    },

    getCssRendererScene : function()
    {
        if (this.cssRenderer == null)
            this.getCssRenderer();
        if (this.cssRendererScene == null)
            this.cssRendererScene = new THREE.Scene();
        return this.cssRendererScene;
    },

    onWindowResize : function(event)
    {
        var that = TundraSDK.framework.client.renderer;
        that.windowSize = { width: TundraSDK.framework.client.container.width(), height : TundraSDK.framework.client.container.height() };

        that.renderer.setSize(that.windowSize.width, that.windowSize.height);
        if (that.cssRenderer != null)
            that.cssRenderer.setSize(that.windowSize.width, that.windowSize.height);

        if (that.camera !== undefined && that.camera !== null)
        {
            that.camera.aspect = that.windowSize.width / that.windowSize.height;
            that.camera.updateProjectionMatrix();
        }
    },

    /**
        Resets the internal state. Removes all entities from the scene.
        @method reset
    */
    reset : function()
    {
        if (this.scene != null)
        {
            // This is an old failsafe to unload CPU/GPU resources.
            // The scene should already be empty as EC_Placeable, EC_Mesh etc.
            // have been reseted. They should have removed their scene nodes correctly.
            // Additionally AssetAPI forgetAllAssets() should have unloaded each IAsset
            // so that they unload any CPU/GPU resources from threejs.
            while (this.scene.children.length > 0)
            {
                var child = this.scene.children[0];
                if (child instanceof THREE.Mesh)
                {
                    this.log.debug(child.name);
                    if (child.material != null)
                    {
                        if (child.material instanceof THREE.MeshBasicMaterial)
                        {
                            if (child.material.map != null)
                            {
                                this.log.debug("  map");
                                child.material.map.dispose();
                                child.material.map = null;
                            }
                            if (child.material.lightMap != null)
                            {
                                this.log.debug("  lightMap");
                                child.material.lightMap.dispose();
                                child.material.lightMap = null;
                            }
                            if (child.material.specularMap != null)
                            {
                                this.log.debug("  specularMap");
                                child.material.specularMap.dispose();
                                child.material.specularMap = null;
                            }
                            if (child.material.envMap != null)
                            {
                                this.log.debug("  envMap");
                                child.material.envMap.dispose();
                                child.material.envMap = null;
                            }
                        }
                        else if (child.material instanceof THREE.ShaderMaterial)
                        {
                            if (child.material.uniforms != null)
                            {
                                if (child.material.uniforms["tCube"] != null && child.material.uniforms["tCube"].value != null)
                                {
                                    this.log.debug("  uniform tCube");
                                    child.material.uniforms["tCube"].value.dispose();
                                    child.material.uniforms["tCube"].value = null;
                                }
                                if (child.material.uniforms["map"] != null && child.material.uniforms["map"].value != null)
                                {
                                    this.log.debug("  uniform map");
                                    child.material.uniforms["map"].value.dispose();
                                    child.material.uniforms["map"].value = null;
                                }
                                if (child.material.uniforms["normalMap"] != null && child.material.uniforms["normalMap"].value != null)
                                {
                                    this.log.debug("  uniform normalMap");
                                    child.material.uniforms["normalMap"].value.dispose();
                                    child.material.uniforms["normalMap"].value = null;
                                }
                            }
                        }
                        this.log.debug("  material");

                        child.material.dispose();
                        child.material = null;
                    }
                    if (child.geometry != null)
                    {
                        this.log.debug("  geometry");
                        child.geometry.dispose();
                        child.geometry = null;
                    }
                }

                this.scene.remove(child);
                child = null;
            }

            delete this.scene;
            this.scene = null;
        }

        this.scene = new THREE.Scene();

        // Create default ambient light, can be modified by components.
        this.ambientLight = this.createLight("ambient");
        this.ambientLight.color = this.defaultSceneAmbientLightColor().toThreeColor();
        this.scene.add(this.ambientLight);
    },

    /**
        Setup shadows. Below are the options you can define, these are the defaults.
        @example
            {
                enabled     : true,
                softShadows : true,
                drawDebug   : false,
                clip : {
                    near    : 50,
                    far     : 1000
                },
                textureSize : {
                    width   : 2048,
                    height  : 2048
                },
                bounds : {
                    right   :  50,
                    left    : -50,
                    top     :  50,
                    bottom  : -50
                }
            }

        @method setupShadows
        @param {Boolean} enableShadows Enable shadows.
        @param {Boolean} enableSoftShadows Enable shadow antialiasing.
        @param {Object} shadowBounds Bounds of the shadow projection eg. { left: x1, right: x2, top: y1, bottom: y2 }.
    */
    setupShadows : function(settings)
    {
        if (this.renderer == null || settings === undefined)
            return;

        if (this.shadowSettings === undefined)
        {
            this.shadowSettings = {};
            this.shadowSettings.shadowCastingLights = 0;
        }

        if (settings.enabled !== undefined)
            this.shadowSettings.enabled = settings.enabled;
        if (settings.softShadows !== undefined)
            this.shadowSettings.softShadows = settings.softShadows;
        if (settings.textureSize !== undefined)
            this.shadowSettings.textureSize = settings.textureSize;
        if (settings.clip !== undefined)
            this.shadowSettings.clip = settings.clip;
        if (settings.bounds !== undefined)
            this.shadowSettings.bounds = settings.bounds;
        if (settings.drawDebug !== undefined)
            this.shadowSettings.drawDebug = settings.drawDebug;

        /// @todo Investigate cascading shadows.
        this.renderer.shadowMapEnabled = (this.shadowSettings.enabled === true && this.shadowSettings.shadowCastingLights > 0);
        this.renderer.shadowMapType = (this.shadowSettings.softShadows === true ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap);
        this.renderer.shadowMapDebug = this.shadowSettings.drawDebug;

        TundraSDK.framework.events.send("ThreeJsRenderer.ShadowSettingsChanged", this.shadowSettings);
    },

    shadowCastingLightsChanged : function()
    {
        // If we simply set THREE.Light.castShadow = false for all lights in the scene.
        // The shaders will fail to compute and you wont see any real time change in the scene.
        // We must calculate actual shadow casting lights and disable the renderers main shadowMapEnabled flag.
        this.shadowSettings.shadowCastingLights = 0;
        for ( var l = 0, ll = this.scene.__lights.length; l < ll; l++)
        {
            var light = this.scene.__lights[l];
            if (!light.castShadow)
                continue;
            if (light instanceof THREE.SpotLight)
                this.shadowSettings.shadowCastingLights++;
            if (light instanceof THREE.DirectionalLight && !light.shadowCascade)
                this.shadowSettings.shadowCastingLights++;
        }
        this.setupShadows({ enabled : this.shadowSettings.enabled });

        // All materials need to be updated (shaders reconfigured) now that
        // shadow settings and/or light counts changed.
        var meshes = this._getAllObjects();
        for (var i = 0, len = meshes.length; i<len; i++)
        {
            if (meshes[i] != null && meshes[i].material !== undefined && meshes[i].material !== null)
                meshes[i].material.needsUpdate = true;
        }
    },

    /**
        Registers a callback for when renderers shadow settings changed. Below is the settings
        object that you will receive as the parameter when the event is fired.
        @example
            {
                enabled     : true,
                softShadows : true,
                drawDebug   : false,
                clip : {
                    near    : 50,
                    far     : 1000
                },
                textureSize : {
                    width   : 2048,
                    height  : 2048
                },
                bounds : {
                    right   :  50,
                    left    : -50,
                    top     :  50,
                    bottom  : -50
                }
            }

        @method onShadowSettingsChanged
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onShadowSettingsChanged : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("ThreeJsRenderer.ShadowSettingsChanged", context, callback);
    },

    /**
        Returns the default scene ambient color. You can set the ambient color to renderer.ambientLight.color = x;.
        @method defaultSceneAmbientLightColor
        @return {Color}
    */
    defaultSceneAmbientLightColor : function()
    {
        return new Color(0.364, 0.364, 0.364, 1.0);
    },

    /**
        Returns all rendering engine scene nodes from the scene that contain geometry. This excludes cameras, lights etc.

        Use this function with care, the performance is not going to be great!
        See _getAllObjects() for a faster non-scene-iterating implementation!

        @method getAllMeshes
        @return {Array} List of Three.Mesh objects.
    */
    getAllMeshes : function()
    {
        // If we have already done a mesh query this frame, dont do it again.
        /// @todo Should we actually remove this and make EC_Mesh add their meshes to the list?
        if (this.meshes.length == 0)
        {
            var meshComponents = TundraSDK.framework.client.scene.components("Mesh");
            for (var i = 0; i < meshComponents.length; ++i)
            {
                var meshComponent = meshComponents[i];
                if (meshComponent.meshAsset != null && meshComponent.meshAsset.mesh != null)
                {
                    for (var k=0; k<meshComponent.meshAsset.numSubmeshes(); ++k)
                        this.meshes.push(meshComponent.meshAsset.getSubmesh(k));
                }
            }
        }
        return this.meshes;
    },

    update : function(frametime, frametimeMsec)
    {
        // Reset per frame cache data
        this.raycastResult.reset();

        if (this.meshes.length > 0)
            this.meshes = [];

        // Update animations
        THREE.AnimationHandler.update(frametimeMsec);

        // Render
        this.render();
    },

    /**
        Updates the rendering engine. <br><br>__Note:__ Do not call this method, constant updates are handled by TundraClient.
        @method render
    */
    render : function()
    {
        if (this.scene === undefined || this.scene === null)
            return;
        if (this.camera === undefined || this.camera === null)
            return;

        this.renderer.render(this.scene, this.camera);

        if (this.cssRenderer != null && this.cssRendererScene != null)
        {
            var webBrowserComponents = TundraSDK.framework.scene.components("EC_WebBrowser");
            for (var i = 0, wbLen = webBrowserComponents.length; i < wbLen; i++)
                webBrowserComponents[i].updateCssObjectTransform();
            this.cssRenderer.render(this.cssRendererScene, this.camera);
        }
    },

    /**
        Executes a raycast from origin to direction. Returns all hit objects.

        @method raycastAllFrom
        @param {THREE.Vector3} origin Origin of the raycast.
        @param {THREE.Vector3} direction Normalized direction vector.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @param {Array} [targets=all-THREE.Mesh-in-scene] Raycast execution targets.
        These objects must have geometry property if recursive is false!
        @param {Boolean} [ignoreECModel=false] If the Tundra EC model should be ignored,
        if true no entity or component information is checked or filled to the result.
        @param {Boolean} [recursive=false] If false only the top level targets are checked.
        If true also their children will be recursively checked.
        <b>Note:</b> Recursive raycast to a large amount of objects can be slow.
        @return {Array<RaycastResult>}
    */
    raycastAllFrom : function(origin, direction, selectionLayer, targets, ignoreECModel, recursive)
    {
        return this.raycastFrom(origin, direction, selectionLayer, targets, ignoreECModel, recursive, true);
    },

    /**
        Executes a raycast from origin to direction. Returns the first hit object.

        @method raycastFrom
        @param {THREE.Vector3} origin Origin of the raycast.
        @param {THREE.Vector3} direction Normalized direction vector.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @param {Array} [targets=all-THREE.Mesh-in-scene] Raycast execution targets.
        These objects must have geometry property if recursive is false!
        @param {Boolean} [ignoreECModel=false] If the Tundra EC model should be ignored,
        if true no entity or component information is checked or filled to the result.
        @param {Boolean} [recursive=false] If false only the top level targets are checked.
        If true also their children will be recursively checked.
        <b>Note:</b> Recursive raycast to a large amount of objects can be slow.
        @return {RaycastResult}
    */
    raycastFrom : function(origin, direction, selectionLayer, targets, ignoreECModel, recursive, all)
    {
        // Set default values
        selectionLayer = (typeof selectionLayer === "number" ? selectionLayer : 1);
        ignoreECModel = (typeof ignoreECModel === "boolean" ? ignoreECModel : false);
        recursive = (typeof recursive === "boolean" ? recursive : false);
        all = (typeof all === "boolean" ? all : false);

        this.raycastFromResult.reset();
        this.raycastFromResult.setExecutionInfo(-1, -1, selectionLayer);

        if (this.raycastFromResult.origin === undefined)
            this.raycastFromResult.origin = new THREE.Vector3();
        this.raycastFromResult.origin.copy(origin);
        if (this.raycastFromResult.direction === undefined)
            this.raycastFromResult.direction = new THREE.Vector3();
        this.raycastFromResult.direction.copy(direction);

        // If no meshes in scene, bail out. This is not an error.
        if (targets === undefined)
        {
            /** @todo Only return visible objects here?!
                I think the raycast logic itself wont check if
                the hit geometry is visible! */
            targets = this._getAllObjects();
        }
        if (targets.length === 0)
            return this.raycastFromResult;

        this.raycaster.set(origin, direction);
        var objects = this.raycaster.intersectObjects(targets, recursive);
        return this._raycastResults(this.raycaster, objects, this.raycastFromResult, selectionLayer, ignoreECModel, all)
    },

    /**
        Executes a raycast to the renderers scene using the currently active camera 
        and screen coordinates. Returns all hit objects.

        @method raycastAll
        @param {Number} [x=current-mouse-x] Screen x coordinate. Defaults to current mouse position. 
        You can check bounds from the windowSize property.
        @param {Number} [y=current-mouse-y] Screen y coordinate. Defaults to current mouse position.
        You can check bounds from the windowSize property.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @param {Array} [targets=all-THREE.Mesh-in-scene] Raycast execution targets.
        These objects must have geometry property if recursive is false!
        @param {Boolean} [ignoreECModel=false] If the Tundra EC model should be ignored,
        if true no entity or component information is checked or filled to the result.
        @param {Boolean} [recursive=false] If false only the top level targets are checked.
        If true also their children will be recursively checked.
        <b>Note:</b> Recursive raycast to a large amount of objects can be slow.
        @return {Array<RaycastResult>}
    */
    raycastAll : function(x, y, selectionLayer, targets, ignoreECModel, recursive)
    {
        return this.raycast(x, y, selectionLayer, targets, ignoreECModel, recursive, true);
    },

    /**
        Executes a raycast to the renderers scene using the currently active camera 
        and screen coordinates. Returns all hit objects.

        @method raycastAll
        @param {Number} [x=current-mouse-x] Screen x coordinate. Defaults to current mouse position. 
        You can check bounds from the windowSize property.
        @param {Number} [y=current-mouse-y] Screen y coordinate. Defaults to current mouse position.
        You can check bounds from the windowSize property.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @param {Array} [targets=all-THREE.Mesh-in-scene] Raycast execution targets.
        These objects must have geometry property if recursive is false!
        @param {Boolean} [ignoreECModel=false] If the Tundra EC model should be ignored,
        if true no entity or component information is checked or filled to the result.
        @param {Boolean} [recursive=false] If false only the top level targets are checked.
        If true also their children will be recursively checked.
        <b>Note:</b> Recursive raycast to a large amount of objects can be slow.
        @return {RaycastResult}
    */
    raycast : function(x, y, selectionLayer, targets, ignoreECModel, recursive, all)
    {
        /// @todo Fix offset calculation if the main DOM container is not at 0,0

        // Set default values
        x = (typeof x === "number" ? x : TundraSDK.framework.input.mouse.x);
        y = (typeof y === "number" ? y : TundraSDK.framework.input.mouse.y);
        selectionLayer = (typeof selectionLayer === "number" ? selectionLayer : 1);
        ignoreECModel = (typeof ignoreECModel === "boolean" ? ignoreECModel : false);
        recursive = (typeof recursive === "boolean" ? recursive : false);
        all = (typeof all === "boolean" ? all : false);

        // @note These are not part of the RaycastResult object, custom checks for theejs implementation.
        var customExecInfoChanged = false;
        if (this.raycastResult._ignoreECModel !== undefined && this.raycastResult._ignoreECModel !== ignoreECModel)
            customExecInfoChanged = true;
        else if (this.raycastResult._all !== undefined && this.raycastResult._all !== all)
            customExecInfoChanged = true;

        /** Execute raycast again if
            1) Our custom additional params were different
            2) x, y (usually mouse pos) or selectionLayer has changed
            3) Custom targets has been passed in */
        if (!customExecInfoChanged && targets === undefined && !this.raycastResult.hasError() && this.raycastResult.executionMatches(x, y, selectionLayer))
            return this.raycastResult;

        this.raycastResult.reset();

        if (this.camera === undefined || this.camera === null)
        {
            this.raycastResult.setError("No active rendering camera set");
            return this.raycastResult;
        }

        // Check correct types were passed in.
        if (typeof selectionLayer !== "number")
        {
            this.raycastResult.setError("given selectionLayer is not a number");
            return this.raycastResult;
        }
        if (typeof x !== "number" || typeof y !== "number")
        {
            this.raycastResult.setError("given x and/or y is not a number");
            return this.raycastResult;
        }

        // Return null raycast if the coordinate is outside the screen.
        if (x > this.windowSize.width || y > this.windowSize.height)
        {
            this.raycastResult.setError("x and/or y screen position out of bounds");
            return this.raycastResult;
        }

        // If no meshes in scene, bail out. This is not an error.
        if (targets === undefined)
        {
            /** @todo Only return visible objects here?!
                I think the raycast logic itself wont check if
                the hit geometry is visible! */
            targets = this._getAllObjects();
        }
        if (targets.length === 0)
            return this.raycastResult;

        // Store execution info
        this.raycastResult.setExecutionInfo(x, y, selectionLayer);
        
        // Custom info for our threejs implementation
        this.raycastResult._ignoreECModel = ignoreECModel;
        this.raycastResult._all = all;

        // Execute raycast
        this.raycastResult._raycastVector.x =  (x / this.windowSize.width ) * 2 - 1;
        this.raycastResult._raycastVector.y = -(y / this.windowSize.height) * 2 + 1;
        this.raycastResult._raycastVector.z = 0;

        /// @todo Try to optimize this, its quit slow. Maybe get all visible meshes 
        /// from frustrum instead of passing all mesh objects in the scene
        var raycaster = this.projector.pickingRay(this.raycastResult._raycastVector, this.camera);
        var objects = raycaster.intersectObjects(targets, recursive);

        return this._raycastResults(raycaster, objects, this.raycastResult, selectionLayer, ignoreECModel, all)
    },

    _threeProjectorPickingRay : function(vector, camera)
    {
        // set two vectors with opposing z values
        vector.z = -1.0;
        var end = new THREE.Vector3( vector.x, vector.y, 1.0 );

        vector.unproject(camera);
        end.unproject(camera);

        // find direction from vector to end
        end.sub( vector ).normalize();

        return new THREE.Raycaster( vector, end );
    },

    _raycastResults : function(raycaster, objects, raycastResult, selectionLayer, ignoreECModel, all)
    {
        var rayvastResults = (all ? [] : undefined);

        for (var i = 0, len = objects.length; i < len; ++i)
        {
            /// @todo Add billboards/sprites when implemented.
            var nearestHit = objects[i];
            if ((nearestHit.object instanceof THREE.Mesh) || (nearestHit.object instanceof THREE.SkinnedMesh))
            {
                // Entity and Component
                if (!ignoreECModel && nearestHit.object.parent != null && nearestHit.object.parent.tundraEntityId != null)
                {
                    var hitEntity = TundraSDK.framework.scene.entityById(nearestHit.object.parent.tundraEntityId);
                    if (hitEntity != null)
                    {
                        /// @todo Should we ignore entities that do now have EC_Placeable all together?
                        if (hitEntity.placeable != null)
                        {
                            if (!hitEntity.placeable.visible)
                                continue;
                            if (hitEntity.placeable.selectionLayer !== selectionLayer)
                                continue;
                        }

                        raycastResult.setPosition(nearestHit.point);
                        raycastResult.distance = nearestHit.distance;
                        raycastResult.faceIndex = nearestHit.faceIndex;
                        raycastResult.ray = raycaster.ray.clone();

                        if (nearestHit.object.tundraSubmeshIndex !== undefined)
                            raycastResult.submeshIndex = nearestHit.object.tundraSubmeshIndex;

                        /// @todo Add more component types here when we get some, eg. billboards/sprites.
                        raycastResult.entity = hitEntity;
                        raycastResult.component = hitEntity.getComponent("EC_Mesh");

                        if (rayvastResults !== undefined)
                            rayvastResults.push(raycastResult.clone());
                        else
                            break;
                    }
                }
                else if (ignoreECModel)
                {
                    raycastResult.setPosition(nearestHit.point);
                    raycastResult.distance = nearestHit.distance;
                    raycastResult.faceIndex = nearestHit.faceIndex;
                    raycastResult.ray = raycaster.ray.clone();

                    if (rayvastResults !== undefined)
                        rayvastResults.push(raycastResult.clone());
                    else
                        break;
                }
            }
        }

        if (rayvastResults !== undefined)
            return rayvastResults;
        return raycastResult;
    },

    createLight : function(type, color, intensity, distance)
    {
        if (color !== undefined)
            color = this.convertColor(color);
        if (intensity === undefined)
            intensity = 1.0;
        if (distance === undefined)
            distance = 0.0;

        var light = null;
        if (type == "point")
            light = new THREE.PointLight(color, intensity, distance);
        else if (type == "directional")
            light = new THREE.DirectionalLight(color, intensity, distance);
        else if (type == "spot")
            light = new THREE.SpotLight(color, intensity, distance, true);
        else if (type == "ambient")
            light = new THREE.AmbientLight(color);
        return light;
    },

    convertColor : function(color)
    {
        if (color === undefined)
            return undefined;

        if (color.substr(0, 1) === '#')
            return color;

        var digits = /(.*?)rgb\((\d+),(\d+),(\d+)\)/.exec(color);
        var red = parseInt(digits[2]);
        var green = parseInt(digits[3]);
        var blue = parseInt(digits[4]);
        return blue | (green << 8) | (red << 16);
    },

    /**
        Registers a callback for when the active camera that is used for rendering changes.
        @example
            // 'deactivatedCameraComponent' can be undefined if no camera was set when the new camera was activated
            TundraSDK.framework.renderer.onActiveCameraChanged(null, function(activeCameraComponent, deactivatedCameraComponent) {
                console.log("Current active camera is", activeCameraComponent.parentEntity.name);
                if (deactivatedCameraComponent !== undefined)
                    console.log("Last active camera was", deactivatedCameraComponent.parentEntity.name);
            });

        @method onActiveCameraChanged
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onActiveCameraChanged : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("ThreeJsRenderer.ActiveCameraChanged", context, callback);
    },

    setActiveCamera : function(cameraComponent)
    {
        /// @todo Automatically find the first EC_Camera from the scene and activate it!
        if (cameraComponent === null)
        {
            // Deactivate current camera
            if (this.activeCameraComponent !== undefined && this.activeCameraComponent !== null)
                this.activeCameraComponent.active = false;

            this.camera = null;
            this.activeCameraComponent = null;
            return true;
        }

        if (!(cameraComponent instanceof EC_Camera_ThreeJs))
        {
            this.log.error("[ThreeJsRenderer]: setActiveCamera called with non EC_Camera_ThreeJs component!", cameraComponent);
            return false;
        }

        // Deactivate current camera
        var deactivatedCameraComponent = undefined;
        if (this.activeCameraComponent !== undefined && this.activeCameraComponent !== null)
        {
            this.activeCameraComponent.active = false;
            deactivatedCameraComponent = this.activeCameraComponent;
        }

        // Activate new camera
        this.camera = cameraComponent.camera;
        this.activeCameraComponent = cameraComponent;
        this.activeCameraComponent.active = true;

        // Send event that give old and new camera component.
        TundraSDK.framework.events.send("ThreeJsRenderer.ActiveCameraChanged", this.activeCameraComponent, deactivatedCameraComponent);
        deactivatedCameraComponent = undefined;

        return true;
    },

    activeCamera : function()
    {
        return this.activeCameraComponent;
    },

    activeCameraEntity : function()
    {
        return (this.activeCameraComponent != null ? this.activeCameraComponent.parentEntity : null);
    },

    /**
        Creates a new rendering engine scene node without adding it to the scene.
        @method createSceneNode
        @return {THREE.Object3D}
    */
    createSceneNode : function()
    {
        var sceneNode = new THREE.Object3D();
        sceneNode.matrixAutoUpdate = false;
        return sceneNode;
    },

    /**
        Updates a rendering engine scene node from a Tundra Transform.
        @method updateSceneNode
        @param {THREE.Object3D} sceneNode Update target
        @param {Transform} transform Tundra transform.
    */
    updateSceneNode : function(sceneNode, transform)
    {
        if (sceneNode == null)
            return;

        if (sceneNode.matrixAutoUpdate === true)
            sceneNode.matrixAutoUpdate = false;

        // Update three.js scene node from Tundra Transform.
        // Copy each Number type separately to avoid cloning
        // and passing in by reference to threejs.
        sceneNode.position.x = transform.pos.x;
        sceneNode.position.y = transform.pos.y;
        sceneNode.position.z = transform.pos.z;

        // This returns a new instance of Quaternion
        sceneNode.quaternion = transform.orientation();

        sceneNode.scale.x = transform.scale.x;
        sceneNode.scale.y = transform.scale.y;
        sceneNode.scale.z = transform.scale.z;

        // Verify scale is not negative or zero.
        if (sceneNode.scale.x < 0.0000001 || sceneNode.scale.y < 0.0000001 || sceneNode.scale.z < 0.0000001)
        {
            this.log.warn("Fixing negative/zero scale", sceneNode.scale.toString(), "for object", sceneNode.name);
            if (sceneNode.scale.x < 0.0000001) sceneNode.scale.x = 0.0000001;
            if (sceneNode.scale.y < 0.0000001) sceneNode.scale.y = 0.0000001;
            if (sceneNode.scale.z < 0.0000001) sceneNode.scale.z = 0.0000001;
        }

        sceneNode.updateMatrix();
    }
});


// Extending the three.js classes
/// @todo make this somehow generic so its included everywhere! (make our of vector class that inherits THREE.Vector3)
THREE.Box2.prototype.toString       = function() { return "(min: " + this.min + " max: " + this.max + ")"; };
THREE.Box3.prototype.toString       = function() { return "(min: " + this.min + " max: " + this.max + ")"; };
THREE.Color.prototype.toString      = function() { return "(" + this.r + ", " + this.g + ", " + this.b + ")"; };
THREE.Euler.prototype.toString      = function() { return "(" + this.x + ", " + this.y + ", " + this.z + " " + this.order + ")"; };
THREE.Vector2.prototype.toString    = function() { return "(" + this.x + ", " + this.y + ")"; };
THREE.Vector3.prototype.toString    = function() { return "(" + this.x + ", " + this.y + ", " + this.z + ")"; };
THREE.Vector4.prototype.toString    = function() { return "(" + this.x + ", " + this.y + ", " + this.z + ", " + + this.w + ")"; };
THREE.Quaternion.prototype.toString = function() { return "(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")"; };
THREE.Matrix3.prototype.toString    = function() { var m = this.elements; return  "(" + m[0] + ", " + m[3] + ", " + m[6] + ") " +
                                                                                  "(" + m[1] + ", " + m[4] + ", " + m[7] + ") " +
                                                                                  "(" + m[2] + ", " + m[5] + ", " + m[8] + ")"; };
THREE.Matrix4.prototype.toString    = function() { var m = this.elements; return  "(" + m[0] + ", " + m[4] + ", " + m[8 ] + ", " + m[12] + ") " +
                                                                                  "(" + m[1] + ", " + m[5] + ", " + m[9 ] + ", " + m[13] + ") " +
                                                                                  "(" + m[2] + ", " + m[6] + ", " + m[10] + " ," + m[14] + ") " +
                                                                                  "(" + m[3] + ", " + m[7] + ", " + m[11] + " ," + m[15] + ")"; };
// @todo THREE.Plane.prototype.toString = function() {} "Plane(Normal:(%.2f, %.2f, %.2f) d:%.2f)"
// @todo THREE.Frustum.prototype.toString = function() {} "Frustum(%s pos:(%.2f, %.2f, %.2f) front:(%.2f, %.2f, %.2f), up:(%.2f, %.2f, %.2f), near: %.2f, far: %.2f, %s: %.2f, %s: %.2f)"
// @todo THREE.Ray.prototype.toString = function() {} "Ray(pos:(%.2f, %.2f, %.2f) dir:(%.2f, %.2f, %.2f))"
// @todo THREE.Sphere.prototype.toString = function() {} "Sphere(pos:(%.2f, %.2f, %.2f) r:%.2f)"
// @todo THREE.Spline.prototype.toString = function() {}
// @todo THREE.Triangle.prototype.toString = function() {} "Triangle(a:(%.2f, %.2f, %.2f) b:(%.2f, %.2f, %.2f) c:(%.2f, %.2f, %.2f))"


return ThreeJsRenderer;

}); // require js
