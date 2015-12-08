
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_SoundListener
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_SoundListener
    @extends IComponent
    @constructor
*/
var EC_SoundListener = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property active (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "active", false, Attribute.Bool, "Active");
    },

    __classvars__ :
    {
        TypeId   : 7,
        TypeName : "SoundListener"
    }
});

return EC_SoundListener;

}); // require js
