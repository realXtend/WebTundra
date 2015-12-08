
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Sound
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Sound
    @extends IComponent
    @constructor
*/
var EC_Sound = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property soundRef (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "soundRef", "", Attribute.AssetReference, "Sound ref");
        /**
            @property soundInnerRadius (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "soundInnerRadius", 0.0, Attribute.Real, "Sound radius inner");
        /**
            @property soundOuterRadius (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "soundOuterRadius", 20.0, Attribute.Real, "Sound radius outer");
        /**
            @property soundGain (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "soundGain", 1.0, Attribute.Real, "Sound gain");
        /**
            @property playOnLoad (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "playOnLoad", false, Attribute.Bool, "Play on load");
        /**
            @property loopSound (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "loopSound", false, Attribute.Bool, "Loop sound");
        /**
            @property spatial (attribute)
            @type Attribute
        */
        this.declareAttribute(6, "spatial", true, Attribute.Bool, "Spatial");
    },

    __classvars__ :
    {
        TypeId   : 6,
        TypeName : "Sound"
    }
});

return EC_Sound;

}); // require js
