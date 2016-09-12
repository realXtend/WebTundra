
define([
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color",
        "core/framework/CoreStringUtils"
    ], function(IComponent, Attribute, Color, CoreStringUtils) {

var EC_Light = IComponent.$extend(
/** @lends EC_Light.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {EC_Light.Type} type EC_Light.Type.PointLight
        */
        this.declareAttribute(0, "type", EC_Light.Type.PointLight, Attribute.Int, "Light type");
        /**
            @ec_attribute {Color} diffColor Color(1,1,1)
        */
        this.declareAttribute(1, "diffColor", new Color(1,1,1), Attribute.Color, "Diffuse color");
        /**
            @ec_attribute {Color} specColor Color(0,0,0)
        */
        this.declareAttribute(2, "specColor", new Color(0,0,0), Attribute.Color, "Specular color");
        /**
            @ec_attribute {boolean} castShadows false
        */
        this.declareAttribute(3, "castShadows", false, Attribute.Bool, "Cast shadows");
        /**
            @ec_attribute {number} range 25.0
        */
        this.declareAttribute(4, "range", 25.0, Attribute.Real, "Light range");
        /**
            @ec_attribute {number} brightness 1.0
        */
        this.declareAttribute(5, "brightness", 1.0, Attribute.Real, "Brightness");
        /**
            @ec_attribute {number} constAtten 0.0
        */
        this.declareAttribute(6, "constAtten", 0.0, Attribute.Real, "Constant atten");
        /**
            @ec_attribute {number} linearAtten 0.01
        */
        this.declareAttribute(7, "linearAtten", 0.01, Attribute.Real, "Linear atten");
        /**
            @ec_attribute {number} quadraAtten 0.01
        */
        this.declareAttribute(8, "quadraAtten", 0.01, Attribute.Real, "Quadratic atten");
        /**
            @ec_attribute {number} innerAngle 30.0
        */
        this.declareAttribute(9, "innerAngle", 30.0, Attribute.Real, "Light inner angle");
        /**
            @ec_attribute {number} outerAngle 40.0
        */
        this.declareAttribute(10, "outerAngle", 40.0, Attribute.Real, "Light outer angle");
    },

    __classvars__ :
    {
        TypeId   : 16,
        TypeName : "Light",

        /**
            @static
            @memberof EC_Light
            @readonly
            @enum {number}
        */
        Type :
        {
            PointLight       : 0,
            SpotLight        : 1, /**< @todo "Spotlight" (the usual/proper spelling) in native Tundra */
            DirectionalLight : 2,
            AmbientLight     : 3  // @note Not part of the official EC_Light enum!
        },

        /**
            Converts a EC_Light.Type enum to string
            @param {EC_Light.Type} type
            @return {string}
        */
        typeToString : function(type)
        {
            return CoreStringUtils.enumToString(EC_Light.Type, type, undefined);
        }
    }
});

return EC_Light;

}); // require js
