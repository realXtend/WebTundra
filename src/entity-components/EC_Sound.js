
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

var EC_Sound = IComponent.$extend(
/** @lends EC_Sound.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {string} soundRef ""
        */
        this.declareAttribute(0, "soundRef", "", Attribute.AssetReference, "Sound ref");
        /**
            @ec_attribute {number} soundInnerRadius 0.0
        */
        this.declareAttribute(1, "soundInnerRadius", 0.0, Attribute.Real, "Sound radius inner");
        /**
            @ec_attribute {number} soundOuterRadius 20.0
        */
        this.declareAttribute(2, "soundOuterRadius", 20.0, Attribute.Real, "Sound radius outer");
        /**
            @ec_attribute {number} soundGain 1.0
        */
        this.declareAttribute(3, "soundGain", 1.0, Attribute.Real, "Sound gain");
        /**
            @ec_attribute {boolean} playOnLoad false
        */
        this.declareAttribute(4, "playOnLoad", false, Attribute.Bool, "Play on load");
        /**
            @ec_attribute {boolean} loopSound false
        */
        this.declareAttribute(5, "loopSound", false, Attribute.Bool, "Loop sound");
        /**
            @ec_attribute {boolean} spatial true
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
