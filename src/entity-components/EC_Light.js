
define([
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color",
        "core/framework/CoreStringUtils"
    ], function(IComponent, Attribute, Color, CoreStringUtils) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Light
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Light
    @extends IComponent
    @constructor
*/
var EC_Light = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property type (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "type", EC_Light.Type.PointLight, Attribute.Int, "Light type");
        /**
            @property diffColor (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "diffColor", new Color(1,1,1), Attribute.Color, "Diffuse color");
        /**
            @property specColor (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "specColor", new Color(0,0,0), Attribute.Color, "Specular color");
        /**
            @property castShadows (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "castShadows", false, Attribute.Bool, "Cast shadows");
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "range", 25.0, Attribute.Real, "Light range");
        /**
            @property brightness (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "brightness", 1.0, Attribute.Real, "Brightness");
        /**
            @property constAtten (attribute)
            @type Attribute
        */
        this.declareAttribute(6, "constAtten", 0.0, Attribute.Real, "Constant atten");
        /**
            @property linearAtten (attribute)
            @type Attribute
        */
        this.declareAttribute(7, "linearAtten", 0.01, Attribute.Real, "Linear atten");
        /**
            @property quadraAtten (attribute)
            @type Attribute
        */
        this.declareAttribute(8, "quadraAtten", 0.01, Attribute.Real, "Quadratic atten");
        /**
            @property innerAngle (attribute)
            @type Attribute
        */
        this.declareAttribute(9, "innerAngle", 30.0, Attribute.Real, "Light inner angle");
        /**
            @property outerAngle (attribute)
            @type Attribute
        */
        this.declareAttribute(10, "outerAngle", 40.0, Attribute.Real, "Light outer angle");
    },

    __classvars__ :
    {
        TypeId   : 16,
        TypeName : "Light",

        Type :
        {
            PointLight       : 0,
            SpotLight        : 1, /**< @todo "Spotlight" (the usual/proper spelling) in native Tundra */
            DirectionalLight : 2,
            AmbientLight     : 3  // @note Not part of the official EC_Light enum!
        },

        typeToString : function(type)
        {
            return CoreStringUtils.enumToString(EC_Light.Type, type, undefined);
        }
    }
});

return EC_Light;

}); // require js
