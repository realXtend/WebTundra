
define([
        "lib/three",
        "core/framework/Tundra",
        "entity-components/EC_Camera",
        "view/threejs/ThreeJsCombinedCamera"
    ], function(THREE, Tundra, EC_Camera, ThreeJsCombinedCamera) {

/**
    Camera component implementation for the three.js render system.

    @class EC_Camera_ThreeJs
    @extends EC_Camera
    @constructor
*/
var EC_Camera_ThreeJs = EC_Camera.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        // Don't document this, its an implementation detail
        this.camera = undefined;

        /**
            If this camera is currently active and used for rendering.
            Use onActiveStateChanged to register callbacks when active state changes.
            @property active
            @type Boolean
        */
        this._active = false;
        Object.defineProperties(this, {
            active : {
                get : function () {
                    return this.isActive();
                },
                set : function (value) {
                    this.setActive(value);
                }
            }
        });

        this._windowSizeSub = Tundra.ui.onWindowResize(this, this.onWindowResize);
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    /**
        Returns the world focus position. The implementation can vary depending on the type of application camera.
        Default implementation returns the parent Placeable components world position or null if not set.

        You application can replace this function with its own implementaion.

        @method getWorldFocusPosition
        @return {THREE.Vector3|null}
    */
    getWorldFocusPosition : function()
    {
        if (this.parentEntity == null || this.parentEntity.placeable == null)
            return null;
        return this.parentEntity.placeable.worldPosition();
    },

    _farPlane : function()
    {
        // far plane cannot be overridden when using logarithmicDepthBuffer!
        if (Tundra.renderer.options.logarithmicDepthBuffer === true)
            return 1e27;
        return this.farPlane;
    },

    _nearPlane : function()
    {
        // far plane cannot be overridden when using logarithmicDepthBuffer!
        if (Tundra.renderer.options.logarithmicDepthBuffer === true)
            return 1e-6;
        return this.nearPlane;
    },

    update : function()
    {
        var aspectRatio = this.aspectRatio();

        // Create camera
        if (this._combinedCamera === undefined)
        {
            var viewSize = 33200;
            this._combinedCamera = new ThreeJsCombinedCamera(viewSize, aspectRatio, this.verticalFov, this._nearPlane(), this._farPlane());
            this._combinedCamera.onCameraChanged = function(currentCamera) {
                this.camera = currentCamera;
                if (this.active)
                {
                    this.update();
                    Tundra.renderer.camera = currentCamera;
                }
            }.bind(this);

            this.camera = this._combinedCamera.currentCamera;
            this._combinedCamera.viewSize = viewSize;
        }
        else
        {
            this._combinedCamera.fov = this.verticalFov;
            this._combinedCamera.aspect = aspectRatio;
            this._combinedCamera.near = this._nearPlane();
            this._combinedCamera.far = this._farPlane();
        }

        // Parent
        if (!this.camera.parent && this.parentEntity)
        {
            if (this.parentEntity.placeable != null)
                this.parentEntity.placeable.addChild(this.camera);
            else
                this._componentAddedSub = this.parentEntity.onComponentCreated(this, this._onParentEntityComponentCreated);
        }
    },

    reset : function()
    {
        if (this.active)
            Tundra.renderer.setActiveCamera(null);

        if (this._componentAddedSub)
        {
            this._componentAddedSub.reset();
            this._componentAddedSub = undefined;
        }
        if (this._windowSizeSub)
        {
            this._windowSizeSub.reset();
            this._windowSizeSub = undefined;
        }
    },

    _onParentEntityComponentCreated : function(entity, component)
    {
        if (component != null && component.typeName === "Placeable")
        {
            if (this._componentAddedSub)
            {
                this._componentAddedSub.reset();
                this._componentAddedSub = undefined;
            }

            if (this.camera && !this.camera.parent)
                component.addChild(this.camera);
        }
    },

    /**
        Registers a callback for when a camera active state changes
        @example
            ent.camera.onActiveStateChanged(null, function(parentEntity, cameraComponent, active) {
                console.log("Camera active state changes", parentEntity.name, active);
            });

        @method onActiveStateChanged
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onActiveStateChanged : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            Tundra.client.logError("[EC_Camera]: Cannot subscribe onActiveStateChanged, parent entity not set!", true);
            return null;
        }
        return Tundra.events.subscribe("EC_Camera.ActiveStateChanged." + this.parentEntity.id + "." + this.id, context, callback);
    },

    _postActiveStateChanged : function(active)
    {
        Tundra.events.send("EC_Camera.ActiveStateChanged." + this.parentEntity.id + "." + this.id,
            this.parentEntity, this, active);
    },

    /**
        Activates this camera to be used for rendering.
        @method setActive
    */
    setActive : function(active)
    {
        if (active === undefined)
            active = true;
        if (typeof active !== "boolean")
            return;
        if (this._active === active)
            return;

        // Semi ugly hack. Check if the current active camera is animating before enabling shit camera.
        if (active && Tundra.renderer.activeCamera() && Tundra.renderer.activeCamera()._animating === true)
        {
            this.log.warn("Current camera is animating, cannot activate " + this.parentEntity.name);
            return;
        }

        this._active = active;
        if (this._active)
            Tundra.renderer.setActiveCamera(this);
        this._postActiveStateChanged(this._active);
    },

    /**
        Returns if this camera is currently active. You can also use the 'active' property directly.
        @method isActive
    */
    isActive : function()
    {
        return this._active;
    },

    attributeChanged : function(index, name, value)
    {
        this.update();
    },

    aspectRatio : function()
    {
        var windowSize = Tundra.renderer.windowSize;
        if (windowSize !== undefined && windowSize.height !== 0)
            return windowSize.width / windowSize.height;
        return 0;
    },

    /**
        Returns if the given point represented as 3-tuple is in the current view
        @name isPointInView
        @function
        @param {Object} point A 3-tuple object (for example a THREE.Vector3)
        @return {boolean}
    */

    /**
        Returns if the given point as (x,y,z) is in the current view
        @name isPointInView^2
        @function
        @param {number} x The x coordinate
        @param {number} y The y coordinate
        @param {number} z The z coordinate
        @return {boolean}
    */
    isPointInView : function(x,y,z)
    {
        var point = undefined;
        if (x instanceof THREE.Vector3)
            point = x;
        else if (typeof x === "number" && typeof y === "number" && typeof z === "number")
        {
            point = new THREE.Vector3();
            point.x = x;
            point.y = y;
            point.z = z;
        }
        else if (typeof x === "object" && typeof x.x === "number" && typeof x.y === "number" && typeof x.z === "number")
        {
            point = new THREE.Vector3();
            point.x = x.x;
            point.y = x.y;
            point.z = x.z;
        }

        if (!point)
        {
            this.log.error("isPointInView: invalid arguments provided!");
            return false;
        }

        var frustum = new THREE.Frustum();
        frustum.setFromMatrix(new THREE.Matrix4().multiply(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
        return frustum.containsPoint(point);
    },

    onWindowResize : function(width, height)
    {
        // @todo This also update inactive cameras? Should be changed to update at activation?
        if (this.camera === undefined)
            return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    },

    onOrthographicChanged : function()
    {
        if (this.orthographic && !this._combinedCamera.orthographic)
            this._combinedCamera.toOrthographic(true);
        else if (!this.orthographic && this._combinedCamera.orthographic)
            this._combinedCamera.toPerspective(true);
    }
});

return EC_Camera_ThreeJs;


}); // require js
