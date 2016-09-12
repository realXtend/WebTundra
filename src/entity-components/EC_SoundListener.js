
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

var EC_SoundListener = IComponent.$extend(
/** @lends EC_SoundListener.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {boolean} active false
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
