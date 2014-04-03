
define([
        "lib/three",
        "core/framework/TundraSDK",
        "entity-components/EC_Camera"
    ], function(THREE, TundraSDK, EC_Camera) {

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

        TundraSDK.framework.ui.onWindowResize(this, this.onWindowResize);
    },
    
    __classvars__ :
    {
        implementationName : "three.js"
    },

    update : function()
    {
        // Create camera
        if (this.camera === undefined)
            this.camera = new THREE.PerspectiveCamera(this.verticalFov, this.aspectRatio(), this.nearPlane, this.farPlane);
        else
        {
            this.camera.fov = this.verticalFov;
            this.camera.aspect = this.aspectRatio();
            this.camera.near = this.nearPlane;
            this.camera.far = this.farPlane;
            this.camera.updateProjectionMatrix();
        }

        // Parent
        if (this.camera.parent == null && this.parentEntity != null)
        {
            if (this.parentEntity.placeable != null)
                this.parentEntity.placeable.addChild(this.camera);
            else
                this._componentAddedSub = this.parentEntity.onComponentCreated(this, this._onParentEntityComponentCreated);
        }
    },

    /** random test for intersect code. 
        @todo make this work?
    intersectsObject : function(object)
    {
        if (object.geometry === undefined)
            return;

        var pos = this.parentEntity.placeable.worldPosition();
        var height = Math.tan(this.verticalFov) * this.nearPlane;
        var width = Math.tan(this.aspectRatio() * this.verticalFov) * this.nearPlane;
        var zero = new THREE.Vector3(-width, height, this.nearPlane);
        zero.applyQuaternion(this.parentEntity.placeable.worldOrientation());
        var sphere = new THREE.Sphere();
        sphere.setFromPoints([zero.add(pos)]);

        var geometry = object.geometry;
        if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

        var other = new THREE.Sphere().copy( geometry.boundingSphere );
        object.updateMatrix();
        other.applyMatrix4( object.matrixWorld );
        var res = sphere.intersectsSphere( other );

        if (res)
        {
            if (this.debugColor === undefined)
            {
                this.debugColor = new THREE.Color();
                this.debugColor.setRGB(1,0,0);
            }
            if (this.debugMaterial === undefined)
                this.debugMaterial = new THREE.MeshBasicMaterial({ color: this.debugColor, wireframe: true });

            var box = other.getBoundingBox();
            var debugMesh = new THREE.Mesh(new THREE.SphereGeometry(other.radius,6,6), this.debugMaterial);
            //box.size(debugMesh.scale);
            box.center(debugMesh.position);
            debugMesh.quaternion = object.quaternion.clone();
            debugMesh.matrixAutoUpdate = false;
            debugMesh.updateMatrix();

            TundraSDK.framework.renderer.scene.add(debugMesh);
        }
        return res;
    },
    */

    reset : function()
    {
        if (this.active)
            TundraSDK.framework.renderer.setActiveCamera(null);

        if (this._componentAddedSub !== undefined)
        {
            TundraSDK.framework.events.unsubscribe(this._componentAddedSub);
            this._componentAddedSub = undefined;
        }
    },

    _onParentEntityComponentCreated : function(entity, component)
    {
        if (component != null && component.typeName === "EC_Placeable")
        {
            if (this._componentAddedSub !== undefined)
            {
                TundraSDK.framework.events.unsubscribe(this._componentAddedSub);
                this._componentAddedSub = undefined;
            }

            if (this.camera != null && this.camera.parent == null)
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
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onActiveStateChanged : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            TundraSDK.framework.client.logError("[EC_Camera]: Cannot subscribe onActiveStateChanged, parent entity not set!", true);
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_Camera.ActiveStateChanged." + this.parentEntity.id + "." + this.id, context, callback);
    },

    _postActiveStateChanged : function(active)
    {
        TundraSDK.framework.events.send("EC_Camera.ActiveStateChanged." + this.parentEntity.id + "." + this.id,
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
        if (active && TundraSDK.framework.renderer.activeCamera() && TundraSDK.framework.renderer.activeCamera()._animating === true)
        {
            this.log.warn("Current camera is animating, cannot activate " + this.parentEntity.name);
            return;
        }

        this._active = active;
        if (this._active)
            TundraSDK.framework.renderer.setActiveCamera(this);
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
        var windowSize = TundraSDK.framework.renderer.windowSize;
        if (windowSize !== undefined && windowSize.height !== 0)
            return windowSize.width / windowSize.height;
        return 0;
    },

    onWindowResize : function(width, height)
    {
        if (this.camera === undefined)
            return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
});

return EC_Camera_ThreeJs;

}); // require js
