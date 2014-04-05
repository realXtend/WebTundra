
define([
        "lib/three",
        "core/framework/TundraSDK",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color"
    ], function(THREE, TundraSDK, IComponent, Attribute, Color) {

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
        this.declareAttribute(0, "sunColor", new Color(0.639, 0.639, 0.639), Attribute.Color);
        /**
            @property ambientColor (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "ambientColor", TundraSDK.framework.renderer.defaultSceneAmbientLightColor(), Attribute.Color);
        /**
            @property sunDirection (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "sunDirection", new THREE.Vector3(-1.0,-1.0,-1.0), Attribute.Float3);
        /**
            @property sunCastShadows (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "sunCastShadows", true, Attribute.Bool);
        /**
            @property brightness (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "brightness", 1.0, Attribute.Real);
    }
});

return EC_EnvironmentLight;

}); // require js
