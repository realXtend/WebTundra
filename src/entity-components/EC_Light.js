
define([
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color"
    ], function(IComponent, Attribute, Color) {

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
        this.declareAttribute(0, "type", EC_Light.Type.PointLight, Attribute.Int);
        /**
            @property diffColor (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "diffColor", new Color(1,1,1), Attribute.Color);
        /**
            @property specColor (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "specColor", new Color(0,0,0), Attribute.Color);
        /**
            @property castShadows (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "castShadows", false, Attribute.Bool);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "range", 25.0, Attribute.Real);
        /**
            @property brightness (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "brightness", 1.0, Attribute.Real);
        /**
            @property constAtten (attribute)
            @type Attribute
        */
        this.declareAttribute(6, "constAtten", 0.0, Attribute.Real);
        /**
            @property linearAtten (attribute)
            @type Attribute
        */
        this.declareAttribute(7, "linearAtten", 0.01, Attribute.Real);
        /**
            @property quadraAtten (attribute)
            @type Attribute
        */
        this.declareAttribute(8, "quadraAtten", 0.01, Attribute.Real);
        /**
            @property innerAngle (attribute)
            @type Attribute
        */
        this.declareAttribute(9, "innerAngle", 30.0, Attribute.Real);
        /**
            @property outerAngle (attribute)
            @type Attribute
        */
        this.declareAttribute(10, "outerAngle", 40.0, Attribute.Real);
    },

    __classvars__ :
    {
        Type :
        {
            PointLight       : 0,
            SpotLight        : 1,
            DirectionalLight : 2,
            AmbientLight     : 3  // @note Not part of the official EC_Light enum!
        },

        typetoString : function(type)
        {
            if (type === EC_Light.Type.PointLight)
                return "PointLight";
            else if (type === EC_Light.Type.SpotLight)
                return "SpotLight";
            else if (type === EC_Light.Type.DirectionalLight)
                return "DirectionalLight";
            else if (type === EC_Light.Type.AmbientLight)
                return "AmbientLight";
            return undefined;
        }
    }
});

return EC_Light;

}); // require js
