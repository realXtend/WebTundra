
define([
        "lib/three",
        "core/math/Color",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, Color, IComponent, Attribute) {

var EC_Fog = IComponent.$extend(
/** @lends EC_Fog.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {EC_Fog.Type} mode EC_Fog.Type.Linear
        */
        this.declareAttribute(0, "mode", EC_Fog.Type.Linear, Attribute.Int, "Mode");
        /**
            @ec_attribute {Color} color Color(0.707792,0.770537,0.831373,1.0)
        */
        this.declareAttribute(1, "color", new Color(0.707792,0.770537,0.831373,1.0), Attribute.Color, "Sunlight color");
        /**
            @ec_attribute {number} startDistance 100.0
        */
        this.declareAttribute(2, "startDistance", 100.0, Attribute.Real, "Start distance");
        /**
            @ec_attribute {number} endDistance 2000.0
        */
        this.declareAttribute(3, "endDistance", 2000.0, Attribute.Real, "End distance");
        /**
            @ec_attribute {number} expDensity 0.001
        */
        this.declareAttribute(4, "expDensity", 0.001, Attribute.Real, "Exponential density");
    },

    __classvars__ :
    {
        TypeId   : 9,
        TypeName : "Fog",

        Type :
        {
            NoFog               : 0,
            Exponentially       : 1,
            ExponentiallySquare : 2,
            Linear              : 3
        }
    }
});

return EC_Fog;

}); // require js
