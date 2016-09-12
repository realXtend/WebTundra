
define([
        "lib/three",
        "core/framework/Tundra",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color"
    ], function(THREE, Tundra, IComponent, Attribute, Color) {

var EC_EnvironmentLight = IComponent.$extend(
/** @lends EC_EnvironmentLight.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {Color} sunColor Color(0.639, 0.639, 0.639)
        */
        this.declareAttribute(0, "sunColor", new Color(0.639, 0.639, 0.639), Attribute.Color, "Sunlight color");
        /**
            @ec_attribute {Color} ambientColor
        */
        this.declareAttribute(1, "ambientColor", Tundra.renderer.defaultSceneAmbientLightColor(), Attribute.Color, "Ambient light color");
        /**
            @ec_attribute {THREE.Vector3} sunDirection THREE.Vector3(-1.0,-1.0,-1.0)
        */
        this.declareAttribute(2, "sunDirection", new THREE.Vector3(-1.0,-1.0,-1.0), Attribute.Float3, "Sunlight direction vector");
        /**
            @ec_attribute {boolean} sunCastShadows true
        */
        this.declareAttribute(3, "sunCastShadows", true, Attribute.Bool, "Sunlight cast shadows");
        /**
            @ec_attribute {number} brightness 1.0
        */
        this.declareAttribute(4, "brightness", 1.0, Attribute.Real, "Brightness");
    },

    __classvars__ :
    {
        TypeId   : 8,
        TypeName : "EnvironmentLight"
    },
});

return EC_EnvironmentLight;

}); // require js
