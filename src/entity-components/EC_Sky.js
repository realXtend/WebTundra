
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Sky
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Sky
    @extends IComponent
    @constructor
*/
var EC_Sky = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /** Other sky implementations can redirect to this same code with different id
            eg. EC_SkyX. Don't declare data if this is the case (would break deserialization).
            @todo This is a temp hack for combining different sky components into a single
            implementation. Figure this stuff out and remove. */
        if (this.typeId !== 10)
            return;

        /**
            @property materialRef (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "materialRef", "", Attribute.AssetReference);
        /**
            @property textureRefs (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "textureRefs", [], Attribute.AssetReferenceList);
        /**
            @property distance (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "distance", 999.0, Attribute.Real);
        /**
            @property orientation (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "orientation", new THREE.Quaternion(0,0,0,1), Attribute.Quat);
        /**
            @property drawFirst (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "drawFirst", true, Attribute.Bool);
        /**
            @property enabled (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "enabled", true, Attribute.Bool);
    }
});

return EC_Sky;

}); // require js
