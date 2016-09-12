
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

var EC_AnimationController = IComponent.$extend(
/** @lends EC_AnimationController.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {string} animationState ""
        */
        this.declareAttribute(0, "animationState", "", Attribute.String, "Animation state");
        /**
            @ec_attribute {boolean} drawDebug false
        */
        this.declareAttribute(1, "drawDebug", false, Attribute.Bool, "Draw debug");
    },

    __classvars__ :
    {
        TypeId   : 14,
        TypeName : "AnimationController"
    }
});

return EC_AnimationController;

}); // require js
