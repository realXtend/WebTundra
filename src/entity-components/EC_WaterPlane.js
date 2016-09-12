
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/math/Color"
    ], function(THREE, IComponent, Attribute, Color) {

var EC_WaterPlane = IComponent.$extend(
/** @lends EC_WaterPlane.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {number} xSize 5000
        */
        this.declareAttribute(0, "xSize", 5000, Attribute.Int);
        /**
            @ec_attribute {number} ySize 5000
        */
        this.declareAttribute(1, "ySize", 5000, Attribute.Int);
        /**
            @ec_attribute {number} depth 10000
        */
        this.declareAttribute(2, "depth", 10000, Attribute.Int);
        /**
            @ec_attribute {THREE.Vector3} position THREE.Vector3(0,0,0)
        */
        this.declareAttribute(3, "position", new THREE.Vector3(0,0,0), Attribute.Float3);
        /**
            @ec_attribute {THREE.Quaternion} rotation THREE.Quaternion(0,0,0,1)
        */
        this.declareAttribute(4, "rotation", new THREE.Quaternion(0,0,0,1), Attribute.Quat);
        /**
            @ec_attribute {number} scaleUfactor 0.0002
        */
        this.declareAttribute(5, "scaleUfactor", 0.0002, Attribute.Real);
        /**
            @ec_attribute {number} scaleVfactor 0.0002
        */
        this.declareAttribute(6, "scaleVfactor", 0.0002, Attribute.Real);
        /**
            @ec_attribute {number} xSegments 10
        */
        this.declareAttribute(7, "xSegments", 10, Attribute.Int);
        /**
            @ec_attribute {number} ySegments 10
        */
        this.declareAttribute(8, "ySegments", 10, Attribute.Int);
        /**
            @ec_attribute {string} materialName ""
        */
        this.declareAttribute(9, "materialName", "", Attribute.String);
        /**
            @ec_attribute {string} materialRef ""
        */
        this.declareAttribute(10, "materialRef", "", Attribute.AssetReference);
        /**
            @ec_attribute {Color} fogColor Color(0.2, 0.4, 0.35)
        */
        this.declareAttribute(11, "fogColor", new Color(0.2, 0.4, 0.35), Attribute.Color);
        /**
            @ec_attribute {number} fogStartDistance 100.0
        */
        this.declareAttribute(12, "fogStartDistance", 100.0, Attribute.Real);
        /**
            @ec_attribute {number} fogEndDistance 2000.0
        */
        this.declareAttribute(13, "fogEndDistance", 2000.0, Attribute.Real);
        /**
            @ec_attribute {EC_WaterPlane.FogMode} fogMode EC_WaterPlane.FogMode.Linear
        */
        this.declareAttribute(14, "fogMode", EC_WaterPlane.FogMode.Linear, Attribute.Int);
        /**
            @ec_attribute {number} fogExpDensity 999.0
        */
        this.declareAttribute(15, "fogExpDensity", 999.0, Attribute.Real);
    },

    __classvars__ :
    {
        TypeId   : 12,
        TypeName : "WaterPlane",

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
