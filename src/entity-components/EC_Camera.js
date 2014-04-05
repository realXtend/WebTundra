
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Camera
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Camera
    @extends IComponent
    @constructor
*/
var EC_Camera = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property upVector (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "upVector", new THREE.Vector3(0,1,0), Attribute.Float3); /// @todo Make our own vec class to remove the dependency
        /**
            @property nearPlane (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "nearPlane", 0.1, Attribute.Real);
        /**
            @property farPlane (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "farPlane", 2000.0, Attribute.Real); /// @todo Should we increase this default?
        /**
            @property verticalFov (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "verticalFov", 45.0, Attribute.Real); // Ignored for now, taken from browser window size.
        /**
            @property aspectRatio (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "aspectRatio", "", Attribute.String);
    }
});

return EC_Camera;

}); // require js
