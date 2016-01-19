
define([
        "lib/three",
        "lib/Tween",
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        "core/scene/Scene",
        "core/math/Color",
        "core/renderer/IRenderSystem",
        "core/renderer/RaycastResult",
        "view/threejs/TransformInterpolator",
        "core/asset/AssetFactory",
        "view/threejs/asset/ObjMeshAsset",
        "view/threejs/asset/ThreeJsonAsset",
        "view/threejs/entity-components/EC_Fog_ThreeJs",
        "view/threejs/entity-components/EC_Sky_ThreeJs",
        "view/threejs/entity-components/EC_SkyX_ThreeJs",
        "view/threejs/entity-components/EC_AnimationController_ThreeJs",
        "view/threejs/entity-components/EC_Light_ThreeJs",
        "view/threejs/entity-components/EC_Camera_ThreeJs",
        "view/threejs/entity-components/EC_Mesh_ThreeJs",
        "view/threejs/entity-components/EC_Placeable_ThreeJs",
        "view/threejs/entity-components/EC_ParticleSystem_ThreeJs"
    ], function(THREE, TWEEN, Tundra, TundraLogging, CoreStringUtils,
                Scene, Color, IRenderSystem, RaycastResult, TransformInterpolator, AssetFactory,
                ObjMeshAsset,
                ThreeJsonAsset,
                EC_Fog_ThreeJs,
                EC_Sky_ThreeJs,
                EC_SkyX_ThreeJs,
                EC_AnimationController_ThreeJs,
                EC_Light_ThreeJs,
                EC_Camera_ThreeJs,
                EC_Mesh_ThreeJs,
                EC_Placeable_ThreeJs,
                EC_ParticleSystem_ThreeJs) {

var ThreeJsRenderer = IRenderSystem.$extend(
/** @lends IRenderSystem.prototype */
{
    /**

        Manages the rendering engine scene and its scene nodes. Utility functions for camera, raycasting etc.

        Three.js renderer is a singleton and is accessible from {@link Tundra.renderer}

        @constructs
        @extends IRenderSystem
    */
    __init__ : function()
    {
        this.$super("three.js");
        this.log = TundraLogging.getLogger("ThreeJsRenderer");
    },

    __classvars__ :
    {
        getDefaultOptions : function()
        {
            return {
                type : "webgl",
                antialias   : (!Tundra.browser.isMobile()),
                precision   : (!Tundra.browser.isMobile() ? "highp" : "mediump"),
                logarithmicDepthBuffer : CoreStringUtils.queryValueBool("logdepth"),
                sortObjects            : true,
                devicePixelRatio       : 1
            };
        }
    },

    load : function(options)
    {
        this.options = $.extend(ThreeJsRenderer.getDefaultOptions(), options);

        /**
            @todo Document/move windowSize.position
            @var {{ width: number, height: number }}
        */
        this.windowSize =
        {
            width    : Tundra.container.width(),
            height   : Tundra.container.height(),
            position : Tundra.container.position()
        };

        try
        {

            var type = this.options.type;
            delete this.options.type;

            if (typeof type !== "string" || type !== "canvas")
            {
                /**
                    @var {THREE.WebGLRenderer}
                */
                this.renderer = new THREE.WebGLRenderer(this.options);
                this.renderer.setSize(this.windowSize.width, this.windowSize.height);
            }
            else
            {
                this.log.warn("Creating THREE.CanvasRenderer, this is not recommended outside of headless tests!");
                this.renderer = new THREE.CanvasRenderer(this.options);
            }

            // Some things have moved away from WebGLRenderer options. Set the post construction.
            if (typeof this.options.sortObjects === "boolean")
                this.renderer.sortObjects = this.options.sortObjects;
            if (this.options.devicePixelRatio !== 1)
                this.setDevicePixelRatio(this.options.devicePixelRatio);
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
            If set to a function, will get invoked on each frame
            instead of automatic rendering that this plugins provider.

            @var {Function}
            * @example
            * Tundra.renderer.renderOverride = function(threeRenderer, threeScene, threeActiveCamera) {
            *     console.log("rendering a frame");
            *     threeRenderer.render(threeScene, threeActiveCamera);
            * }.bind(this);
        */
        this.renderOverride = undefined;
        /**
            @var {THREE.Scene}
        */
        this.scene = null;
        /**
            @var {EC_Camera_ThreeJs}
        */
        this.activeCameraComponent = null;
        /**
            @var {THREE.Camera}
        */
        this.camera = null;
        /**
            @property raycaster
            @var {THREE.Raycaster}
        */
        this.raycaster = new THREE.Raycaster();
        /**
            Latest raycast result. Use {@link raycast} to execute.
            @var {RaycastResult}
        */
        this.raycastResult = new RaycastResult();
        this.raycastResult._raycastVector = new THREE.Vector3(0,0,0);
        this.raycastResult._raycastDir = new THREE.Vector3(0,0,0);
        this.raycastResult._raycastTemp = new THREE.Vector3(0,0,0);

        this.raycastFromResult = new RaycastResult();
        this.meshes = [];

        /**
            @var {THREE.Vector3}
        */
        this.axisX = new THREE.Vector3(1,0,0);
        /**
            @var {THREE.Vector3}
        */
        this.axisY = new THREE.Vector3(0,1,0);
        /**
            @var {THREE.Vector3}
        */
        this.axisZ = new THREE.Vector3(0,0,1);

        // DOM hookup
        $(this.renderer.domElement).attr("id", "threejs-webgl-canvas").css("pointer-events", "auto");
        $(this.renderer.domElement).css({ position : "absolute", top : 0, left : 0 });
        Tundra.client.container.append(this.renderer.domElement);

        this.onWindowResize();
        //window.addEventListener("resize", this.onWindowResize.bind(this), false);
        Tundra.ui.onWindowResize(this, this.onWindowResize);

        /**
            Basic white solid color material that is used as a default in rendering.
            @var {THREE.MeshPhongMaterial}
        */
        this.materialWhite = new THREE.MeshPhongMaterial({ "color": this.convertColor("rgb(240,240,240)"), "wireframe" : false });
        this.materialWhite.name = "tundra.MaterialLibrary.SolidWhite";

        /**
            Basic red solid color material that can be used for material load errors.
            @var {THREE.MeshPhongMaterial}
        */
        this.materialLoadError = new THREE.MeshPhongMaterial({ "color": this.convertColor("rgb(240,50,50)"), "wireframe" : false });
        this.materialLoadError.name = "tundra.MaterialLibrary.LoadError";

        // Register the three.js asset and component implementations
        this.registerAssetFactories();

        // Register the three.js implementations of Tundra components
        this.registerComponents();
    },

    postInitialize : function()
    {
        // Track mesh components and their mesh loaded signals.
        // The objects can be queried from _getAllObjects(), this is an attempt
        // to optimize getAllMeshes() which iterates the whole scene for EC_Mesh
        // potentially multiple times per frame.
        this._sceneObjects = {};
        this._sceneObjectsArray = [];
        this._sceneObjectsArrayUpdate = true;
        this._meshLoadedSubs = {};
        this._trackingKey = "";

        Tundra.client.onConnected(this, this.onConnected);
        Tundra.client.onDisconnected(this, this.onDisconnected);

        this.onSceneReset();
        Tundra.scene.onReset(this, this.onSceneReset);
    },

    onConnected : function()
    {
        EC_Placeable_ThreeJs.TransformInterpolator = new TransformInterpolator();
    },

    onDisconnected : function()
    {
        EC_Placeable_ThreeJs.TransformInterpolator = undefined;
    },

    unload : function()
    {
        /// @todo Implement to support runtime render system swaps!
    },

    onSceneReset : function()
    {
        Tundra.scene.onComponentCreated(this, this.onSceneComponentCreated);
        Tundra.scene.onComponentRemoved(this, this.onSceneComponentRemoved);
    },

    onSceneComponentCreated : function(entity, component)
    {
        if (component.typeId === 17) // EC_Mesh
        {
            if (typeof component.onMeshLoaded === "function")
            {
                this._trackingKey = entity.id + "." + component.id;
                this._meshLoadedSubs[this._trackingKey] = component.onMeshLoaded(this, this.onSceneMeshLoaded);
            }
        }
    },

    onSceneComponentRemoved : function(entity, component)
    {
        if (component.typeId === 17)     // EC_Mesh
        {
            this.onSceneMeshUnloaded(entity, component);
        }
    },

    onSceneMeshLoaded : function(entity, component, meshAsset)
    {
        this._trackingKey = entity.id + "." + component.id;

        if (this._sceneObjects[this._trackingKey] !== undefined)
            delete this._sceneObjects[this._trackingKey];

        if (!Array.isArray(this._sceneObjects[this._trackingKey]))
            this._sceneObjects[this._trackingKey] = [];

        for (var i=0, len=meshAsset.numSubmeshes(); i<len; ++i)
            this._sceneObjects[this._trackingKey].push(meshAsset.getSubmesh(i));

        this._sceneObjectsArrayUpdate = true;
    },

    onSceneMeshCreated : function(entity, component, mesh)
    {
        this._trackingKey = entity.id + "." + component.id;
        if (!Array.isArray(this._sceneObjects[this._trackingKey]))
            this._sceneObjects[this._trackingKey] = [];

        if (Array.isArray(mesh))
        {
            for (var mi = 0; mi < mesh.length; mi++)
                this._sceneObjects[this._trackingKey].push(mesh[mi]);
        }
        else
            this._sceneObjects[this._trackingKey].push(mesh);

        this._sceneObjectsArrayUpdate = true;
    },

    onSceneMeshUnloaded : function (entity, component)
    {
        var trackingKey = entity.id + "." + component.id;
        if (this._sceneObjects[trackingKey] !== undefined)
        {
            delete this._sceneObjects[trackingKey];
            this._sceneObjectsArrayUpdate = true;
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
         * .3geo is a three.js "standardized" extensions for mesh assets, but not widely used (yet).
         * You can load from .json/.js files via AssetAPI but you need to force the type to "ThreeJsonMesh". */
        Tundra.asset.registerAssetFactory(new AssetFactory("ThreeJsonMesh", ThreeJsonAsset, { ".3geo" : "json", ".json" : "json", ".js" : "json" }, "json"));
        Tundra.asset.registerAssetFactory(new AssetFactory("ObjMesh", ObjMeshAsset, { ".obj" : "text" }));
    },

    registerComponents : function()
    {
        Scene.registerComponent(EC_Fog_ThreeJs);

        Scene.registerComponent(EC_Sky_ThreeJs);
        Scene.registerComponent(EC_SkyX_ThreeJs);

        Scene.registerComponent(EC_AnimationController_ThreeJs);
        Scene.registerComponent(EC_Light_ThreeJs);
        Scene.registerComponent(EC_Camera_ThreeJs);
        Scene.registerComponent(EC_Mesh_ThreeJs);
        Scene.registerComponent(EC_Placeable_ThreeJs);

        Scene.registerComponent(EC_ParticleSystem_ThreeJs);
    },

    getCssRenderer : function()
    {
        if (this.cssRenderer == null)
        {
            this.cssRenderer = new THREE.CSS3DRenderer();
            this.cssRenderer.setSize(this.windowSize.width, this.windowSize.height);

            var cssRenderereDom = $(this.cssRenderer.domElement);
            var webglRendererDom = $(this.renderer.domElement);

            // Make the invisible camera element pass through mouse events.
            // Note that this will only happen to children that explicitly have
            // 'pointer-events:auto'. Same trick is applied to 'css-renderer-container'.
            cssRenderereDom.children().first()
                .attr("id", "css-renderer-camera")
                .css("pointer-events", "none");

            cssRenderereDom.attr("id", "css-renderer-container");
            cssRenderereDom.css({
                "pointer-events"   : "none",
                "background-color" : "transparent",
                "position" : "absolute",
                "top"       : 0,
                "margin"    : 0,
                "padding"   : 0,
                "z-index"   : 1
            });

            webglRendererDom.css({
                "pointer-events"   : "auto",
                "background-color" : "transparent",
                "position"  : "absolute",
                "top"       : 0,
                "margin"    : 0,
                "padding"   : 0,
                "z-index"   : -1
            });

            /* @note CSS renderer to main container. WebGL inside Css renderer. Both with same z-index.
               This will get the 3D objects rendered on top of the CSS renderer elements.
               @bug This no longer works with new three.js versions. 3D objects will NOT render
               on top of the dom element even if they are "in front of it". */
            Tundra.client.container.append(cssRenderereDom);
            cssRenderereDom.append(webglRendererDom);
        }
        return this.cssRenderer;
    },

    setDevicePixelRatio : function(ratio)
    {
        if (!this.renderer || typeof ratio !== "number")
            return;

        ratio = Math.max(0.1, ratio);

        this.renderer.setPixelRatio(ratio);
        this.onWindowResize();
    },

    devicePixelRatio : function()
    {
        if (this.renderer)
            return this.renderer.getPixelRatio();
        return ThreeJsRenderer.getDefaultOptions().devicePixelRatio;
    },

    getCssRendererScene : function()
    {
        if (this.cssRenderer == null)
            this.getCssRenderer();
        if (this.cssRendererScene == null)
            this.cssRendererScene = new THREE.Scene();
        return this.cssRendererScene;
    },

    addCssObject : function(obj)
    {
        this.getCssRendererScene().add(obj);

        if (obj.element !== undefined)
        {
            // Make sure the DOM container is visible
            // and receives mouse events.
            $(obj.element).css({
                "pointer-events"      : "auto",
                "visibility"          : "",
                "display"             : "",
                "user-select"         : "",
                "-webkit-user-select" : "",
                "-moz-user-select"    : "",
                "-ms-user-select"     : ""
            });
        }
    },

    removeCssObject : function(obj)
    {
        this.getCssRendererScene().remove(obj);

        if (obj.element !== undefined)
        {
            // Make sure the DOM container is hidden
            // and wont steal mouse events.
            $(obj.element).css({
                "pointer-events"      : "none",
                "visibility"          : "hidden",
                "display"             : "none",
                "user-select"         : "none",
                "-webkit-user-select" : "none",
                "-moz-user-select"    : "none",
                "-ms-user-select"     : "none"
            });
        }
    },

    onWindowResize : function()
    {
        this.windowSize.width    = Tundra.container.width();
        this.windowSize.height   = Tundra.container.height();
        this.windowSize.position = Tundra.container.position();

        this.renderer.setSize(this.windowSize.width, this.windowSize.height);
        if (this.cssRenderer != null)
            this.cssRenderer.setSize(this.windowSize.width, this.windowSize.height);

        if (this.camera !== undefined && this.camera !== null)
        {
            this.camera.aspect = this.windowSize.width / this.windowSize.height;
            this.camera.updateProjectionMatrix();
        }

        if (this.windowSize.width === 0 || this.windowSize.height === 0)
            setTimeout(this.onWindowResize.bind(this), 100);
    },

    /**
        Resets the internal state. Disposes and removes all found objects in the scene.
    */
    reset : function()
    {
        if (this.scene != null)
        {
            var _dispose = function(obj, things)
            {
                things = Array.isArray(things) ? things : [ things ];
                for (var i = 0; i < things.length; i++)
                {
                    var key = things[i];
                    if (obj && obj[key])
                    {
                        if (typeof obj[key].dispose === "function")
                        {
                            obj[key].dispose();
                            obj[key] = undefined;
                        }
                        else if (typeof obj[key].value === "object" && typeof obj[key].value.dispose === "function")
                        {
                            obj[key].value.dispose();
                            obj[key].value = undefined;
                        }
                    }
                }
            };

            /* This is an old failsafe to unload CPU/GPU resources.
               The scene should already be empty as EC_Placeable, EC_Mesh etc.
               have been reseted. They should have removed their scene nodes correctly.
               Additionally AssetAPI forgetAllAssets() should have unloaded each IAsset
               so that they unload any CPU/GPU resources from threejs. */
            while (this.scene.children.length > 0)
            {
                var child = this.scene.children[0];
                try
                {
                    if (child instanceof THREE.Mesh)
                    {
                        if (child && child.material)
                        {
                            if (!(child.material instanceof THREE.ShaderMaterial))
                                _dispose(child.material, [ "map", "lightMap", "specularMap", "envMap" ]);
                            else if (typeof child.material.uniforms === "object")
                                _dispose(child.material.uniforms, [  "map", "tCube", "normalMap" ]);
                        }
                        _dispose(child, [ "material", "geometry" ]);
                    }
                }
                catch(e)
                {
                    this.log.error("Exception while removing child from renderer scene:", child, e.stack || e);
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

        @param {Boolean} enableShadows Enable shadows.
        @param {Boolean} enableSoftShadows Enable shadow antialiasing.
        @param {Object} shadowBounds Bounds of the shadow projection e.g. { left: x1, right: x2, top: y1, bottom: y2 }.
    */
    setupShadows : function(settings, observer)
    {
        if (this.renderer == null || settings === undefined)
            return false;

        if (this.shadowSettings === undefined)
        {
            this.shadowSettings = {
                shadowCastingLights : 0,
                lights : 0
            };
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

        // Force disable shadows on mobile
        if (Tundra.browser.isMobile())
        {
            this.shadowSettings.enabled = false;
            this.shadowSettings.softShadows = false;
            this.shadowSettings.drawDebug = false;
        }

        /// @todo Investigate cascading shadows.
        var changed = (this.renderer.shadowMapEnabled !== (this.shadowSettings.enabled === true && this.shadowSettings.shadowCastingLights > 0));
        changed = (changed || this.renderer.shadowMapType !== (this.shadowSettings.softShadows === true ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap));
        changed = (changed || this.renderer.shadowMapDebug !== this.shadowSettings.drawDebug);

        this.renderer.shadowMapEnabled = (this.shadowSettings.enabled === true && this.shadowSettings.shadowCastingLights > 0);
        this.renderer.shadowMapType = (this.shadowSettings.softShadows === true ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap);
        this.renderer.shadowMapDebug = this.shadowSettings.drawDebug;

        Tundra.events.send("ThreeJsRenderer.ShadowSettingsChanged", this.shadowSettings, changed, observer);

        return changed;
    },

    updateLights : function(observer)
    {
        // If we simply set THREE.Light.castShadow = false for all lights in the scene.
        // The shaders will fail to compute and you wont see any real time change in the scene.
        // We must calculate actual shadow casting lights and disable the renderer's main shadowMapEnabled flag.
        var prevLights = this.shadowSettings.lights;
        var prevShadowLights = this.shadowSettings.shadowCastingLights;

        this.shadowSettings.shadowCastingLights = 0;
        this.shadowSettings.lights = 0;

        this.scene.traverse(function (object)
        {
            if (object instanceof THREE.Light)
            {
                this.shadowSettings.lights++;
                if (object instanceof THREE.SpotLight && object.castShadow)
                    this.shadowSettings.shadowCastingLights++;
                else if (object instanceof THREE.DirectionalLight && object.castShadow && !object.shadowCascade)
                    this.shadowSettings.shadowCastingLights++;
            }
        }.bind(this));

        if (observer && typeof observer === "object")
            observer._lights_self_change = true;

        var changed = (this.setupShadows({ enabled : this.shadowSettings.enabled }, observer) ||
                       this.shadowSettings.shadowCastingLights !== prevShadowLights ||
                       this.shadowSettings.lights !== prevLights);

        if (observer && typeof observer === "object" && typeof observer._lights_self_change === "boolean")
            delete observer._lights_self_change;

        // Update materials/shaders if light count changed
        // @todo Check if this is done automatically by three.js?
        if (changed)
        {
            this.scene.traverse(function (object)
            {
                if (object && typeof object === "object" && object.material && typeof object.material.needsUpdate === "boolean")
                    object.material.needsUpdate = true;
            });
        }
    },

    /**
        Registers a callback for when renderer's shadow settings changed. Below is the settings
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

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onShadowSettingsChanged : function(context, callback)
    {
        return Tundra.events.subscribe("ThreeJsRenderer.ShadowSettingsChanged", context, callback);
    },

    /**
        Returns the default scene ambient color. You can set the ambient color to renderer.ambientLight.color = x;.
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

        @return {Array} List of Three.Mesh objects.
    */
    getAllMeshes : function()
    {
        // If we have already done a mesh query this frame, don't do it again.
        /// @todo Should we actually remove this and make EC_Mesh add their meshes to the list?
        if (this.meshes.length == 0)
        {
            var meshComponents = Tundra.client.scene.components("Mesh");
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

        // Update Tween library driving animations/interpolations.
        TWEEN.update();

        // Update three.js animations
        THREE.AnimationHandler.update(frametimeMsec);

        // Render
        this.render();
    },

    /**
        Updates the rendering engine. <br><br>__Note:__ Do not call this method, constant updates are handled by TundraClient.
    */
    render : function()
    {
        if (this.scene === undefined || this.scene === null)
            return;
        if (this.camera === undefined || this.camera === null)
            return;

        if (this.renderOverride)
            this.renderOverride(this.renderer, this.scene, this.camera);
        else
            this.renderer.render(this.scene, this.camera);

        if (this.cssRenderer != null && this.cssRendererScene != null)
        {
            var webBrowserComponents = Tundra.scene.components("WebBrowser");
            for (var i = 0, wbLen = webBrowserComponents.length; i < wbLen; i++)
                webBrowserComponents[i].updateCssObjectTransform();
            this.cssRenderer.render(this.cssRendererScene, this.camera);
        }
    },

    /**
        Calculates position and direction from normalized screen coords [-1, 1] ready to be set into a ray.
        @note This method assumes that x and y are already normalized. You should take care of the normalization.
        @param {number|Object} mX The x screen coordinate, or a 2-tuple as an Object storing the x and y screen coordinates
        @param {number} [mY] The y screen coordinate, can be left out if provided a 2-tuple.
        @return {Object}
    */
    posDirForMouse : function(mX, mY)
    {
        var x, y;
        if (typeof mX === "object")
        {
            x = mX.x;
            y = mX.y;
        }
        else
        {
            x = mX;
            y = mY;
        }

        // Both in radians
        var fov = MathUtils.degToRad(this.camera.fov * 0.5);
        var horizontalFov = Math.atan(Math.tan(fov) * this.camera.aspect);

        // Calculate camera size at near clip plane
        var halfWidth = Math.tan(horizontalFov) * 1.0;
        var halfHeight = Math.tan(fov) * 1.0;
        if (this.activeCameraComponent.orthographic)
        {
            halfWidth = this.camera.right;
            halfHeight = this.camera.top;
        }

        if (this._resultCache === undefined)
            this._resultCache = { pos : new THREE.Vector3(), dir : new THREE.Vector3() };
        if (this._quatCache === undefined)
            this._quatCache = new THREE.Quaternion();

        this._resultCache.dir.set(x * halfWidth, y * halfHeight, -1.0);

        this._resultCache.pos.setFromMatrixPosition(this.camera.matrixWorld);
        this._quatCache.setFromRotationMatrix(this.camera.matrixWorld);
        this._resultCache.dir.applyQuaternion(this._quatCache);

        if (this.activeCameraComponent.orthographic)
        {
            this._resultCache.pos.add(this._resultCache.dir);

            this._resultCache.dir.set(0, 0, -1);
            this._resultCache.dir.applyQuaternion(this._quatCache);
        }

        return this._resultCache;
    },

    /**
        Executes a raycast from origin to direction. Returns all hit objects.

        @param {THREE.Vector3} origin Origin of the raycast.
        @param {THREE.Vector3} direction Normalized direction vector.
        @param {Number} [selectionLayer] Placeable selection layer (bit mask),
        by default (i.e. when undefined, null or 0) hits on all layers are accepted.
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

        @param {THREE.Vector3} origin Origin of the raycast.
        @param {THREE.Vector3} direction Normalized direction vector.
        @param {Number} [selectionLayer] Placeable selection layer (bit mask),
        by default (i.e. when undefined, null or 0) hits on all layers are accepted.
        @param {Array} [targets=all-THREE.Mesh-in-scene] Raycast execution targets.
        These objects must have geometry property if recursive is false!
        @param {Boolean} [ignoreECModel=false] If the Tundra EC model should be ignored,
        if true no entity or component information is checked or filled to the result.
        @param {Boolean} [recursive=false] If false only the top level targets are checked.
        If true also their children will be recursively checked.
        <b>Note:</b> Recursive raycast to a large amount of objects can be slow.
        @return {RaycastResult}
    */
    raycastFrom : function(origin, direction, options)
    {
        if (!options || typeof options !== "object")
        {
            options = {};
            for (var i = 0; i < arguments.length; ++i)
            {
                var value = arguments[i];
                switch(i)
                {
                    // @hox origin, direction take 0 and 1 indexes
                    case 2:
                        options.selectionLayer = value;
                        break;
                    case 3:
                        options.targets = value;
                        break;
                    case 4:
                        options.ignoreECModel = value;
                        break;
                    case 5:
                        options.recursive = value;
                        break;
                    case 6:
                        options.all = value;
                        break;
                }
            }
        }

        if (typeof options.selectionLayer !== "number" && options.selectionLayer > 0)
            options.selectionLayer = 0xffffffff;
        if (typeof options.ignoreECModel !== "boolean")
            options.ignoreECModel = false;
        if (typeof options.recursive !== "boolean")
            options.recursive = false;
        if (typeof options.all !== "boolean")
            options.all = false;

        this.raycastFromResult.reset();
        this.raycastFromResult.setExecutionInfo(-1, -1, options.selectionLayer);

        if (origin instanceof THREE.Vector3 === false || direction instanceof THREE.Vector3 === false)
        {
            this.log.warn("raycastFrom: origin/direction is not a THREE.Vector3:", origin, direction);
            return this.raycastFromResult;
        }

        // @todo Does this need to be fixed like .raycast() to account for camera type etc.

        if (this.raycastFromResult.origin === undefined)
            this.raycastFromResult.origin = new THREE.Vector3();
        this.raycastFromResult.origin.copy(origin);
        if (this.raycastFromResult.direction === undefined)
            this.raycastFromResult.direction = new THREE.Vector3();
        this.raycastFromResult.direction.copy(direction);

        // If no meshes in scene, bail out. This is not an error.
        if (options.targets === undefined)
        {
            // @note This origin to direction cannot be optimized by filtering out things not in view frustum
            // We could however make the decision to only raycast into visible targets (meshes).
            if (this._sceneObjectsArrayUpdate)
            {
                this. _sceneObjectsArray = this._getAllObjects();
                this._sceneObjectsArrayUpdate = false;
            }
            options.targets = this._sceneObjectsArray;
        }
        if (options.targets.length === 0)
            return this.raycastFromResult;

        this.raycaster.set(origin, direction);
        var objects = this.raycaster.intersectObjects(options.targets, options.recursive);
        return this._raycastResults(this.raycaster, objects, this.raycastFromResult, options.selectionLayer, options.ignoreECModel, options.all);
    },

    /**
        Executes a raycast to the renderer's scene using the currently active camera
        and screen coordinates. Returns all hit objects.

        @param {Number} [x=current-mouse-x] Screen x coordinate. Defaults to current mouse position.
        You can check bounds from the windowSize property.
        @param {Number} [y=current-mouse-y] Screen y coordinate. Defaults to current mouse position.
        You can check bounds from the windowSize property.
        @param {Number} [selectionLayer] Placeable selection layer (bit mask),
        by default (i.e. when undefined, null or 0) hits on all layers are accepted.
        @param {Array} [targets=all-THREE.Mesh-in-scene] Raycast execution targets.
        These objects must have geometry property if recursive is false!
        @param {Boolean} [ignoreECModel=false] If the Tundra EC model should be ignored,
        if true no entity or component information is checked or filled to the result.
        @param {Boolean} [recursive=false] If false only the top level targets are checked.
        If true also their children will be recursively checked.
        <b>Note:</b> Recursive raycast to a large amount of objects can be slow.
        @return {Array<RaycastResult>}
    */
    raycastAll : function(options)
    {
        if (typeof options  !== "object")
        {
            options = {};
            for (var i = 0; i < arguments.length; ++i)
            {
                var value = arguments[i];
                switch(i)
                {
                    case 0:
                        options.x = value;
                        break;
                    case 1:
                        options.y = value;
                        break;
                    case 2:
                        options.selectionLayer = value;
                        break;
                    case 3:
                        options.targets = value;
                        break;
                    case 4:
                        options.ignoreECModel = value;
                        break;
                    case 5:
                        options.recursive = value;
                        break;
                    case 6:
                        options.all = value;
                        break;
                }
            }
        }

        options.all = true;
        return this.raycast(options);
    },

    /**
        Executes a raycast to the renderer's scene using the currently active camera
        and screen coordinates. Returns all hit objects.

        @param {Number} [x=current-mouse-x] Screen x coordinate. Defaults to current mouse position.
        You can check bounds from the windowSize property.
        @param {Number} [y=current-mouse-y] Screen y coordinate. Defaults to current mouse position.
        You can check bounds from the windowSize property.
        @param {Number} [selectionLayer] Placeable selection layer (bit mask),
        by default (i.e. when undefined, null or 0) hits on all layers are accepted.
        @param {Array} [targets=all-THREE.Mesh-in-scene] Raycast execution targets.
        These objects must have geometry property if recursive is false!
        @param {Boolean} [ignoreECModel=false] If the Tundra EC model should be ignored,
        if true no entity or component information is checked or filled to the result.
        @param {Boolean} [recursive=false] If false only the top level targets are checked.
        If true also their children will be recursively checked.
        <b>Note:</b> Recursive raycast to a large amount of objects can be slow.
        @return {RaycastResult}
    */
    raycast : function(options)
    {
        /// @todo Fix offset calculation if the main DOM container is not at 0,0
        if (!options || typeof options !== "object")
        {
            options = {};
            for (var i = 0; i < arguments.length; ++i)
            {
                var value = arguments[i];
                switch(i)
                {
                    case 0:
                        options.x = value;
                        break;
                    case 1:
                        options.y = value;
                        break;
                    case 2:
                        options.selectionLayer = value;
                        break;
                    case 3:
                        options.targets = value;
                        break;
                    case 4:
                        options.ignoreECModel = value;
                        break;
                    case 5:
                        options.recursive = value;
                        break;
                    case 6:
                        options.all = value;
                        break;
                }
            }
        }

        //console.log($.extend(true, {}, options));

        if (typeof options.x !== "number")
            options.x = Tundra.input.mouse.x;
        if (typeof options.y !== "number")
            options.y = Tundra.input.mouse.y;
        if (typeof options.selectionLayer !== "number")
            options.selectionLayer = 0xffffffff;
        if (typeof options.ignoreECModel !== "boolean")
            options.ignoreECModel = false;
        if (typeof options.recursive !== "boolean")
            options.recursive = false;
        if (typeof options.all !== "boolean")
            options.all = false;

        // Apply potential web tundra container (not the canvas) offset from top and left of the page.
        // Makes raycasts for for non 0,0 100% 100% sized web tundra
        options.x += this.windowSize.position.left;
        options.y -= this.windowSize.position.top;

        //console.log(options);

        // @note These are not part of the RaycastResult object, custom checks for threejs implementation.
        var customExecInfoChanged = false;
        if (this.raycastResult._ignoreECModel !== undefined && this.raycastResult._ignoreECModel !== options.ignoreECModel)
            customExecInfoChanged = true;
        else if (this.raycastResult._all !== undefined && this.raycastResult._all !== options.all)
            customExecInfoChanged = true;

        /** Execute raycast again if
            1) Our custom additional params were different
            2) x, y (usually mouse pos) or selectionLayer has changed
            3) Custom targets has been passed in */
        if (!customExecInfoChanged && options.targets === undefined && !this.raycastResult.hasError() && this.raycastResult.executionMatches(options.x, options.y, options.selectionLayer))
            return this.raycastResult;

        this.raycastResult.reset();
        if (options.x === null || options.y === null)
            return this.raycastResult;

        if (this.camera === undefined || this.camera === null)
        {
            this.raycastResult.setError("No active rendering camera set");
            return this.raycastResult;
        }

        // Return null raycast if the coordinate is outside the screen.
        if (options.x > this.windowSize.width || options.y > this.windowSize.height)
        {
            this.raycastResult.setError("x and/or y screen position out of bounds");
            return this.raycastResult;
        }

        // If no meshes in scene, bail out. This is not an error.
        if (options.targets === undefined)
        {
            // @todo Optimize to only return objects that are visible and in view frustum!
            if (this._sceneObjectsArrayUpdate)
            {
                this._sceneObjectsArray = this._getAllObjects();
                this._sceneObjectsArrayUpdate = false;
            }
            options.targets = this._sceneObjectsArray;
        }
        if (options.targets.length === 0)
            return this.raycastResult;

        // Store execution info
        this.raycastResult.setExecutionInfo(options.x, options.y, options.selectionLayer);

        // Custom info for our threejs implementation
        this.raycastResult._ignoreECModel = options.ignoreECModel;
        this.raycastResult._all = options.all;

        // Execute raycast
        this.raycastResult._raycastVector.x =  (options.x / this.windowSize.width ) * 2 - 1;
        this.raycastResult._raycastVector.y = -(options.y / this.windowSize.height) * 2 + 1;
        this.raycastResult._raycastVector.z = 0;

        // Set higher near clip
        var lastNearClip = this.camera.near;
        this.camera.near = 2000;
        this.camera.updateProjectionMatrix();

        /// @todo Try to optimize this, it's quit slow. Maybe get all visible meshes
        /// from frustum instead of passing all mesh objects in the scene

        // @note This code is Raycaster.setFromCamera in r71, but we have our own implementation here due to placeable might be parented!
        if (this.camera instanceof THREE.PerspectiveCamera)
        {
            this.raycastResult._raycastVector.z = 0.5; // z = 0.5 important!
            this.raycastResult._raycastVector.unproject(this.camera);

            this.activeCameraComponent.parentEntity.placeable.worldPosition(this.raycastResult._raycastTemp);

            this.raycaster.set(this.raycastResult._raycastTemp, this.raycastResult._raycastVector.sub(this.raycastResult._raycastTemp).normalize());
        }
        else if (this.camera instanceof THREE.OrthographicCamera)
        {
            var calcPosDir = this.posDirForMouse(this.raycastResult._raycastVector);
            this.raycaster.set(calcPosDir.pos, calcPosDir.dir);
        }
        else
        {
            if (Tundra.options.usingRequireJS())
                this.log.error("Only THREE.OrthographicCamera and THREE.PerspectiveCamera are supported atm!");

            if (options.all)
            {
                this._resetRaycastNearClip(this.camera, lastNearClip);
                return [ raycastResult ];
            }

            this._resetRaycastNearClip(this.camera, lastNearClip);
            return raycastResult;
        }

        this._resetRaycastNearClip(this.camera, lastNearClip);

        /*if (this.arrow === undefined)
        {
            this.arrow = new THREE.ArrowHelper(this.raycaster.ray.direction, this.raycaster.ray.origin, 2000000, new THREE.Color("red"));
            this.scene.add(this.arrow);
        }
        else
        {
            this.arrow.position.copy(this.raycaster.ray.origin);
            this.arrow.setDirection(this.raycaster.ray.direction);
        }*/

        var objects = this.raycaster.intersectObjects(options.targets, options.recursive);
        return this._raycastResults(this.raycaster, objects, this.raycastResult, options.selectionLayer, options.ignoreECModel, options.all);
    },

    _resetRaycastNearClip : function(camera, lastNearClip)
    {
        this.camera.near = lastNearClip;
        this.camera.updateProjectionMatrix();
    },

    _raycastResults : function(raycaster, objects, raycastResult, selectionLayer, ignoreECModel, all)
    {
        var raycastResults = (all ? [] : undefined);

        for (var i = 0, len = objects.length; i < len; ++i)
        {
            /// @todo Add billboards/sprites when implemented.
            var nearestHit = objects[i];
            if ((nearestHit.object instanceof THREE.Mesh) || (nearestHit.object instanceof THREE.SkinnedMesh) || (nearestHit.object instanceof THREE.Sprite))
            {
                // Entity and Component
                if (!ignoreECModel && nearestHit.object.parent != null && nearestHit.object.parent.tundraEntityId != null)
                {
                    var hitEntity = Tundra.scene.entityById(nearestHit.object.parent.tundraEntityId);
                    if (hitEntity != null)
                    {
                        /// @todo Should we ignore entities that do now have EC_Placeable all together?
                        if (hitEntity.placeable != null)
                        {
                            if (!hitEntity.placeable.visible)
                                continue;
                            if ((hitEntity.placeable.selectionLayer & selectionLayer) === 0)
                                continue;
                        }

                        if (nearestHit.object instanceof THREE.Sprite)
                            nearestHit.point.setFromMatrixPosition(nearestHit.object.matrixWorld);

                        raycastResult.object = nearestHit.object;
                        raycastResult.pos.copy(nearestHit.point);
                        raycastResult.distance = nearestHit.distance;
                        raycastResult.ray.copy(raycaster.ray);
                        raycastResult.copyFace(nearestHit.face);

                        if (nearestHit.object.tundraSubmeshIndex !== undefined)
                            raycastResult.submeshIndex = nearestHit.object.tundraSubmeshIndex;

                        raycastResult.entity = hitEntity;

                        // @todo If entity has both, which one was hit, mesh or billboard?
                        raycastResult.component = hitEntity.mesh;
                        if ((nearestHit.object instanceof THREE.Sprite || !raycastResult.component) && hitEntity.billboard)
                            raycastResult.component = hitEntity.billboard;

                        raycastResult.selectionLayer = hitEntity.placeable.selectionLayer;

                        if (raycastResults !== undefined)
                            raycastResults.push(raycastResult.clone());
                        else
                            break;
                    }
                }
                else if (ignoreECModel)
                {
                    raycastResult.object = nearestHit.object;
                    raycastResult.pos.copy(nearestHit.point);
                    raycastResult.distance = nearestHit.distance;
                    raycastResult.ray.copy(raycaster.ray);
                    raycastResult.copyFace(nearestHit.face);

                    if (raycastResults !== undefined)
                        raycastResults.push(raycastResult.clone());
                    else
                        break;
                }
            }
        }

        if (raycastResults !== undefined)
            return raycastResults;
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
            Tundra.renderer.onActiveCameraChanged(null, function(activeCameraComponent, deactivatedCameraComponent) {
                console.log("Current active camera is", activeCameraComponent.parentEntity.name);
                if (deactivatedCameraComponent !== undefined)
                    console.log("Last active camera was", deactivatedCameraComponent.parentEntity.name);
            });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onActiveCameraChanged : function(context, callback)
    {
        return Tundra.events.subscribe("ThreeJsRenderer.ActiveCameraChanged", context, callback);
    },

    /**
        Activates a Camera component. Usually this function should no be invoked manually.
        You should instead use the activation mechanisms in the Camera component itself.

        @param {EC_Camera} cameraComponent Camera component to activate. If you wish to unset/deactivate current camera call with 'null'.
        This is not highly adviced though as it will leave you with a black screen without rendering.
        @return {Boolean} If activation could be completed.
    */
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
        var deactivatedCameraComponent;
        if (this.activeCameraComponent)
        {
            this.activeCameraComponent.active = false;
            deactivatedCameraComponent = this.activeCameraComponent;
        }

        // Activate new camera
        this.camera = cameraComponent.camera;
        this.activeCameraComponent = cameraComponent;
        this.activeCameraComponent.active = true;

        // Automatically adjust farPlane to a large enoug number so
        // there wont be clipping if logarithmic depth buffer is enabled.
        if (this.options.logarithmicDepthBuffer === true)
        {
            this.camera.far = 1e27;
            this.camera.near = 1e-6;
        }

        // Send event that give old and new camera component.
        Tundra.events.send("ThreeJsRenderer.ActiveCameraChanged", this.activeCameraComponent, deactivatedCameraComponent);
        deactivatedCameraComponent = undefined;

        return true;
    },

    /**
        Returns the active cameras Camera component.

        @return {EC_Camera|null} Returns null if no camera is active.
    */
    activeCamera : function()
    {
        return this.activeCameraComponent;
    },

    /**
        Returns the active cameras parent Entity.

        @return {Entity|null} Returns null if no camera is active.
    */
    activeCameraEntity : function()
    {
        return (this.activeCameraComponent != null ? this.activeCameraComponent.parentEntity : null);
    },

    /**
        Returns the active cameras world position.

        @return {THREE.Vector3|undefined} Returns undefined if position cannot be resolved.
    */
    activeCameraWorldPosition : function()
    {
        var cameraEnt = this.activeCameraEntity();
        if (cameraEnt && cameraEnt.placeable)
            return cameraEnt.placeable.worldPosition();
        return undefined;
    },

    /**
        Returns the active cameras world focus position.
        What this means depends on the interpretation of the camera application.

        @return {THREE.Vector3|undefined} Returns undefined if position cannot be resolved.
    */
    activeCameraWorldFocusPosition : function()
    {
        if (this.activeCameraComponent && typeof this.activeCameraComponent.getWorldFocusPosition === "function")
            return this.activeCameraComponent.getWorldFocusPosition();
        return undefined;
    },

    /**
        Creates a new rendering engine scene node without adding it to the scene.

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
        sceneNode.position.copy(transform.pos);
        transform.copyOrientationTo(sceneNode.quaternion);
        sceneNode.scale.copy(transform.scale);

        // Verify scale is not negative or zero.
        if (sceneNode.scale.x < 0.0000001 || sceneNode.scale.y < 0.0000001 || sceneNode.scale.z < 0.0000001)
        {
            // Allow exact integral 0,0,0
            if (sceneNode.scale.x !== 0 || sceneNode.scale.y !== 0 || sceneNode.scale.z !== 0)
            {
                this.log.warn("Fixing negative/zero scale", sceneNode.scale.toString(), "for object", sceneNode.name);
                if (sceneNode.scale.x < 0.0000001) sceneNode.scale.x = 0.0000001;
                if (sceneNode.scale.y < 0.0000001) sceneNode.scale.y = 0.0000001;
                if (sceneNode.scale.z < 0.0000001) sceneNode.scale.z = 0.0000001;
            }
        }

        sceneNode.updateMatrix();
        sceneNode.updateMatrixWorld();
    }
});

return ThreeJsRenderer;

}); // require js
