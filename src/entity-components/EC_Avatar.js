
define([
        "core/framework/Tundra",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(Tundra, Scene, IComponent, Attribute) {

/**
    Avatar component.
    @class EC_Avatar
    @extends IComponent
    @constructor
*/
var EC_Avatar = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property appearanceRef (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "appearanceRef", "", Attribute.AssetReference);
    },

    __classvars__ :
    {
        TypeId   : 1, 
        TypeName : "Avatar",

        MeshComponentName : "EC_Avatar_Generated_Mesh"
    }
});

Scene.registerComponent(EC_Avatar);

return EC_Avatar;

}); // require js
