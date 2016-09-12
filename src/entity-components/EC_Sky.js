
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, IComponent, Attribute) {

var EC_Sky = IComponent.$extend(
/** @lends EC_Sky.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /** Other sky implementations can redirect to this same code with different id
            e.g. EC_SkyX. Don't declare data if this is the case (would break deserialization).
            @todo This is a temp hack for combining different sky components into a single
            implementation. Figure this stuff out and remove. */
        if (this.typeId !== 10)
            return;

        /**
            @ec_attribute {string} materialRef ""
        */
        this.declareAttribute(0, "materialRef", "", Attribute.AssetReference, "Material");
        /**
            @ec_attribute {Array.<string>} textureRefs []
        */
        this.declareAttribute(1, "textureRefs", [], Attribute.AssetReferenceList, "Texture");
        /**
            @ec_attribute {number} distance 999.0
        */
        this.declareAttribute(2, "distance", 999.0, Attribute.Real, "Distance");
        /**
            @ec_attribute {THREE.Quaternion} orientation THREE.Quaternion(0,0,0,1)
        */
        this.declareAttribute(3, "orientation", new THREE.Quaternion(0,0,0,1), Attribute.Quat, "Orientation");
        /**
            @ec_attribute {boolean} drawFirst true
        */
        this.declareAttribute(4, "drawFirst", true, Attribute.Bool, "Draw first");
        /**
            @ec_attribute {boolean} enabled true
        */
        this.declareAttribute(5, "enabled", true, Attribute.Bool, "Enabled");
    },

    __classvars__ :
    {
        TypeId   : 10,
        TypeName : "Sky"
    }
});

return EC_Sky;

}); // require js
