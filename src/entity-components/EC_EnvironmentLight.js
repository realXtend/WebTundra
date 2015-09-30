
define([
        "lib/three",
        "core/framework/Tundra",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color"
    ], function(THREE, Tundra, IComponent, Attribute, Color) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_EnvironmentLight
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_EnvironmentLight
    @extends IComponent
    @constructor
*/
var EC_EnvironmentLight = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property sunColor (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "sunColor", new Color(0.639, 0.639, 0.639), Attribute.Color, "Sunlight color");
        /**
            @property ambientColor (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "ambientColor", Tundra.renderer.defaultSceneAmbientLightColor(), Attribute.Color, "Ambient light color");
        /**
            @property sunDirection (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "sunDirection", new THREE.Vector3(-1.0,-1.0,-1.0), Attribute.Float3, "Sunlight direction vector");
        /**
            @property sunCastShadows (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "sunCastShadows", true, Attribute.Bool, "Sunlight cast shadows");
        /**
            @property brightness (attribute)
            @type Attribute
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
