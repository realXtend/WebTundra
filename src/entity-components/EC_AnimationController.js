
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Camera
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_AnimationController
    @extends IComponent
    @constructor
*/
var EC_AnimationController = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property animationState (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "animationState", "", Attribute.String);
        /**
            @property drawDebug (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "drawDebug", false, Attribute.Bool);
    }
});

return EC_AnimationController;

}); // require js
