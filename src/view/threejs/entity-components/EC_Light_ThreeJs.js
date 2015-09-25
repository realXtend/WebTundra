
define([
        "lib/three",
        "core/framework/Tundra",
        "core/math/Transform",
        "core/math/Color",
        "entity-components/EC_Light"
    ], function(THREE, Tundra, Transform, Color, EC_Light) {

/**
    Light component implementation for the three.js render system.

    @class EC_Light_ThreeJs
    @extends EC_Light
    @constructor
*/
var EC_Light_ThreeJs = EC_Light.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.lightNode = null;
        this.lightDebugger = null;
        this._parentingSub = null;
        this._drawDebug = false;

        Object.defineProperties(this, {
            drawDebug : {
                get : function () {
                    return this._drawDebug;
                },
                set : function (value) {
                    this._drawDebug = value;
                    if (this._drawDebug)
                        this._updateDebugger();
                    else
                        this._destroyDebugger();
                }
            }
        });
    },

    __classvars__ :
    {
        Implementation : "three.js",

        createLight : function(type, color, intensity, distance)
        {
            // Sane defaults
            if (color !== undefined)
            {
                if (typeof color === "string")
                    color = Color.fromString(color);
                if (color instanceof Color)
                    color = color.toThreeColor();
            }
            if (intensity === undefined || intensity === null)
                intensity = 1.0;
            if (distance === undefined || distance === null)
                distance = 0.0;

            // Sanity checks
            if (intensity < 0)
                intensity = 0;
            if (distance <= 0)
                distance = 0;

            // Create
            var light = null;
            if (type === EC_Light.Type.PointLight)
                light = new THREE.PointLight(color, intensity, distance);
            else if (type === EC_Light.Type.SpotLight)
                light = new THREE.SpotLight(color, intensity, distance, true);
            else if (type === EC_Light.Type.DirectionalLight)
                light = new THREE.DirectionalLight(color, intensity, distance);
            else if (type === EC_Light.Type.AmbientLight)
                light = new THREE.AmbientLight(color);
            else
                console.error("[EC_Light]: createLight(): Invalid EC_Light.Type!");

            // Disable auto update like all our nodes
            if (light != null)
                light.matrixAutoUpdate = false;
            return light;
        },

        createLightDebugger : function(lightComponent)
        {
            if (lightComponent.lightNode == null)
                return;

            var helper = null;
            if (lightComponent.lightNode instanceof THREE.PointLight)
                helper = new THREE.PointLightHelper(lightComponent.lightNode, lightComponent.lightNode.distance);
            else if (lightComponent.lightNode instanceof THREE.SpotLight)
                helper = new THREE.SpotLightHelper(lightComponent.lightNode);
            else if (lightComponent.lightNode instanceof THREE.DirectionalLight)
                helper = new THREE.DirectionalLightHelper(lightComponent.lightNode, 5);
            return helper;
        }
    },

    reset : function()
    {
        this.destroy();
    },

    update : function()
    {
        this.create();
    },

    setDiffColor : function(colorStr)
    {
        this.diffColor = Color.fromString(colorStr);
    },

    attributeChanged : function(index, name, value)
    {
        // type
        if (index === 0)
        {
            this.destroy();
            this.create();
        }
        // diffColor
        else if (index === 1 && this.lightNode != null)
        {
            this.lightNode.color = value.toThreeColor();
            this._updateDebugger(name);
        }
        // range
        else if (index === 4 && this.lightNode != null)
        {
            this.lightNode.distance = (value >= 1 ? value : 1);
            this._updateDebugger(name);
        }
        // brightness
        else if (index === 5 && this.lightNode != null)
        {
            this.lightNode.intensity = (value >= 0 ? value : 0);
            this._updateDebugger(name);
        }

        // Spot light parameters
        // Inner angle
        else if (index === 9 && this.lightNode != null)
        {
            var radians = THREE.Math.degToRad(value) * 0.5;
            this.lightNode.angle = radians;
            this._updateDebugger(name);
        }

        // Outer angle
        else if (index === 10 && this.lightNode != null)
        {
            var radians = THREE.Math.degToRad(value) * 0.5;
            this.lightNode.exponent = Math.cos(radians);
            this._updateDebugger(name);
        }
    },

    create : function()
    {
        if (this.lightNode != null)
            return;

        this.lightNode = EC_Light_ThreeJs.createLight(this.type, this.diffColor, this.brightness, this.range);

        if (this.type === EC_Light.Type.SpotLight)
        {
            var radians = THREE.Math.degToRad(this.innerAngle) * 0.5;
            this.lightNode.angle = radians;
            radians = THREE.Math.degToRad(this.outerAngle) * 0.5;
            this.lightNode.exponent = Math.cos(radians);
        }

        this._parentLight();
    },

    destroy : function()
    {
        this._destroyDebugger();

        if (this.lightNode != null && this.lightNode.parent != null)
        {
            this.lightNode.parent.remove(this.lightNode);
            Tundra.renderer.updateLights(this);
        }
        if (this._parentingSub != null)
            Tundra.events.unsubscribe(this._parentingSub);

        this.lightNode = null;
        this._parentingSub = null;
    },

    _updateDebugger : function(changedAttributeName)
    {
        if (this._drawDebug !== true)
            return;

        if (this.lightNode == null || this.lightNode.parent == null)
            return;

        // Create
        var created = false;
        if (this.lightDebugger == null)
        {
            this.lightDebugger = EC_Light_ThreeJs.createLightDebugger(this);
            if (this.lightDebugger == null)
                return;
            this.lightNode.add(this.lightDebugger);
            created = true;
        }
        if (changedAttributeName !== undefined)
        {
            // Full re-create for some attributes and types
            if (!created && changedAttributeName === "range" && this.lightDebugger instanceof THREE.PointLightHelper)
            {
                this._destroyDebugger();
                this._updateDebugger();
                return;
            }
        }
        this.lightNode.updateMatrix();
        this.lightNode.updateMatrixWorld(true);

        // @todo Does not orientate debug helper correctly
        this.lightDebugger.matrix = this.lightNode.matrix;
        this.lightDebugger.matrixAutoUpdate = false;
        this.lightDebugger.update();
    },

    _destroyDebugger : function()
    {
        if (this.lightDebugger != null && this.lightDebugger.parent != null)
            this.lightDebugger.parent.remove(this.lightDebugger);
        this.lightDebugger = null;
    },

    _parentLight : function()
    {
        if (this.parentEntity == null || this.lightNode == null || this.lightNode.parent != null)
            return;

        if (this.parentEntity.placeable == null)
        {
            this._parentingSub = this.parentEntity.onComponentCreated(this, this._onParentEntityComponentCreated);
            return;
        }

        if (this._parentingSub != null)
            Tundra.events.unsubscribe(this._parentingSub);
        this._parentingSub = null;

        if (this.lightNode.target instanceof THREE.Object3D)
            this.lightNode.target = this.parentEntity.placeable.sceneNode;

        this.lightNode.position.set(0,0,-0.0001);
        this.lightNode.matrixAutoUpdate = false;

        this.parentEntity.placeable.addChild(this.lightNode);

        this._updateDebugger();

        Tundra.renderer.updateLights(this);
    },

    _onParentEntityComponentCreated : function(entity, component)
    {
        if (component != null && component.typeName === "Placeable")
            this._parentLight();
    }
});

return EC_Light_ThreeJs;

}); // require js
