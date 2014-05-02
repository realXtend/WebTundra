
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color"
    ], function(THREE, IComponent, Attribute, Color) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_WaterPlane
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_WaterPlane
    @extends IComponent
    @constructor
*/
var EC_WaterPlane = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property xSize (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "xSize", 5000, Attribute.Int);
        /**
            @property ySize (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "ySize", 5000, Attribute.Int);
        /**
            @property depth (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "depth", 10000, Attribute.Int);
        /**
            @property position (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "position", new THREE.Vector3(0,0,0), Attribute.Float3);
        /**
            @property rotation (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "rotation", new THREE.Quaternion(0,0,0,1), Attribute.Quat);
        /**
            @property scaleUfactor (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "scaleUfactor", 0.0002, Attribute.Real);
        /**
            @property scaleVfactor (attribute)
            @type Attribute
        */
        this.declareAttribute(6, "scaleVfactor", 0.0002, Attribute.Real);
        /**
            @property xSegments (attribute)
            @type Attribute
        */
        this.declareAttribute(7, "xSegments", 10, Attribute.Int);
        /**
            @property ySegments (attribute)
            @type Attribute
        */
        this.declareAttribute(8, "ySegments", 10, Attribute.Int);
        /**
            @property materialName (attribute)
            @type Attribute

            @deprecated
        */
        this.declareAttribute(9, "materialName", "", Attribute.String); 
        /**
            @property materialRef (attribute)
            @type Attribute
        */
        this.declareAttribute(10, "materialRef", "", Attribute.AssetReference);
        /**
            @property fogColor (attribute)
            @type Attribute
        */
        this.declareAttribute(11, "fogColor", new Color(0.2, 0.4, 0.35), Attribute.Color);
        /**
            @property fogStartDistance (attribute)
            @type Attribute
        */
        this.declareAttribute(12, "fogStartDistance", 100.0, Attribute.Real);
        /**
            @property fogEndDistance (attribute)
            @type Attribute
        */
        this.declareAttribute(13, "fogEndDistance", 2000.0, Attribute.Real);
        /**
            @property fogMode (attribute)
            @type Attribute
        */
        this.declareAttribute(14, "fogMode", EC_WaterPlane.FogMode.Linear, Attribute.Int);
        /**
            @property fogExpDensity (attribute)
            @type Attribute
        */
        this.declareAttribute(15, "fogExpDensity", 999.0, Attribute.Real);
    },

    __classvars__ :
    {
        FogMode :
        {
            NoFog                : 0,
            Exponential          : 1,
            ExponentiallySquare  : 2,
            Linear               : 3
        }
    }
});

return EC_WaterPlane;

}); // require js
