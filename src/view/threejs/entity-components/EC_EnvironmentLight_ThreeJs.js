
define([
        "lib/three",
        "core/framework/Tundra",
        "core/frame/FrameLimiter",
        "core/scene/Attribute",
        "core/math/Color",
        "entity-components/EC_EnvironmentLight"
    ], function(THREE, Tundra, FrameLimiter, Attribute, Color, EC_EnvironmentLight) {

var EC_EnvironmentLight_ThreeJs = EC_EnvironmentLight.$extend(
/** @lends EC_EnvironmentLight_ThreeJs.prototype */
{
    /**
        EnvironmentLight component implementation for the three.js render system.

        @constructs
        @private
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.directionalLight = null;
        this.subs = [];

        this.limiter = new FrameLimiter(1/30);
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset : function()
    {
        var wasInScene = false;
        var renderer = Tundra.renderer;
        if (this.directionalLight != null)
        {
            wasInScene = true;
            renderer.scene.remove(this.directionalLight);
        }
        this.directionalLight = null;
        renderer.ambientLight.color = renderer.defaultSceneAmbientLightColor();

        for (var i = 0; i < this.subs.length; i++)
            this.subs[i].reset();
        this.subs = [];

        if (wasInScene)
            renderer.updateLights(this);
    },

    onActiveCameraChanged : function(cameraComponent)
    {
        if (cameraComponent != null && cameraComponent.camera != null)
            this.onUpdate(1.0);
    },

    onUpdate : function(frametime)
    {
        return;

        if (!this.limiter.shouldUpdate(frametime))
            return;
        if (this.directionalLight === null)
            return;

        if (this.forwardVector === undefined)
            this.forwardVector = new THREE.Vector3(0, 0, -1);

        var renderer = Tundra.renderer;
        var cameraComp = renderer.activeCameraComponent;
        if (cameraComp == null || cameraComp.parentEntity == null || cameraComp.parentEntity.placeable == null)
            return;

        var sunDirection = this.attributes.sunDirection.value;

        this.forwardVector.set(0, 0, -1);
        this.forwardVector.applyQuaternion(cameraComp.parentEntity.placeable.worldOrientation());
        this.forwardVector.add(cameraComp.parentEntity.placeable.worldPosition());

        this.directionalLight.target.position.copy(this.forwardVector);
        this.directionalLight.position.set(
            this.forwardVector.x + sunDirection.x * -100.0,
            this.forwardVector.y + sunDirection.y * -100.0,
            this.forwardVector.z + sunDirection.z * -100.0
        );
    },

    update : function()
    {
        this.createLight();

        Tundra.renderer.ambientLight.color = this.ambientColor.toThreeColor();
    },

    onShadowSettingsChanged : function(settings)
    {
        if (this.directionalLight == null)
            return;

        /// @todo Investigate cascading shadows.
        this.directionalLight.shadow.mapSize.width     = settings.textureSize.width;
        this.directionalLight.shadow.mapSize.height    = settings.textureSize.height;

        this.directionalLight.shadow.camera.near    = settings.clip.near;
        this.directionalLight.shadow.camera.far    = settings.clip.far;

        this.directionalLight.shadow.camera.right  = settings.bounds.right;
        this.directionalLight.shadow.camera.left   = settings.bounds.left;
        this.directionalLight.shadow.camera.top    = settings.bounds.top;
        this.directionalLight.shadow.camera.nottom = settings.bounds.bottom;

        // @TODO. Use THREE.CameraHelper
        //this.directionalLight.shadowCameraVisible = settings.drawDebug;
    },

    recreateLight : function()
    {
        if (this._lights_self_change === true)
            return;

        this.reset();
        this.update();
    },

    createLight : function()
    {
        if (this.directionalLight == null)
        {
            var renderer = Tundra.renderer;

            this.directionalLight = renderer.createLight("directional");
            this.directionalLight.color = this.sunColor.toThreeColor();
            this.directionalLight.castShadow = this.sunCastShadows;
            this.directionalLight.intensity = this.brightness * 0.6;

            this.directionalLight.position.copy(this.sunDirection.multiplyScalar(1000).negate());

            this.onShadowSettingsChanged(renderer.shadowSettings);
            this.onActiveCameraChanged(renderer.activeCameraComponent);

            renderer.scene.add(this.directionalLight);

            renderer.updateLights(this);

            if (this.subs.length === 0)
            {
                this.subs.push(renderer.onShadowSettingsChanged(this, this.onShadowSettingsChanged));
                this.subs.push(renderer.onActiveCameraChanged(this, this.onActiveCameraChanged));
                this.subs.push(Tundra.frame.onUpdate(this, this.onUpdate));
            }
        }
    },

    attributeChanged : function(index, name, value)
    {
        if (this.directionalLight == null)
            return;

        switch(index)
        {
            case 0: // sunColor
            {
                this.directionalLight.color = value.toThreeColor();
                break;
            }
            case 1: // ambientColor
            {
                Tundra.renderer.ambientLight.color = value.toThreeColor();
                break;
            }
            case 2: // sunDirection
            {
                this.directionalLight.position.copy(value.multiplyScalar(1000).negate());
            }
            case 3: // sunCastShadows
            {
                this.directionalLight.castShadow = this.sunCastShadows;
                Tundra.renderer.updateLights(this);
                break;
            }
            case 4: // brightness
            {
                this.directionalLight.intensity = value * 0.6;
                break;
            }
        }
    },

    setSunColor : function(colorStr)
    {
        this.sunColor = Color.fromString(colorStr);
    },

    setAmbientColor : function(colorStr)
    {
        this.ambientColor = Color.fromString(colorStr);
    }
});

return EC_EnvironmentLight_ThreeJs;

}); // require js
