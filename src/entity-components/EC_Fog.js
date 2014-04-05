
define([
        "lib/three",
        "core/math/Color",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, Color, IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Fog
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Fog
    @extends IComponent
    @constructor
*/
var EC_Fog = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property mode (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "mode", EC_Fog.Type.Linear, Attribute.Int);
        /**
            @property color (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "color", new Color(0.707792,0.770537,0.831373,1.0), Attribute.Color);
        /**
            @property position (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "startDistance", 100.0, Attribute.Real);
        /**
            @property endDistance (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "endDistance", 2000.0, Attribute.Real);
        /**
            @property expDensity (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "expDensity", 0.001, Attribute.Real);
    },

    __classvars__ :
    {
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
