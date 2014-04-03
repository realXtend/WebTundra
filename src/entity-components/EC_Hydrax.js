
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Hydrax
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Hydrax
    @extends IComponent
    @constructor
*/
var EC_Hydrax = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property configRef (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "configRef", "", Attribute.AssetReference);
        /**
            @property visible (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "visible", true, Attribute.Bool);
        /**
            @property position (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "position", new THREE.Vector3(0,0,0), Attribute.Float3);
    }
});

return EC_Hydrax;

}); // require js
