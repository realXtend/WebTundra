
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

/**
    Avatar component handles parsing an avatar appearance description and setting it up for rendering.

    @todo Implement .avatar/.xml realXtend Avatar description and the new json based avatar description
    parsing. Detect the mesh, skeleton, materials and animations and inject them into EC_Mesh + EC_AnimationController
    as needed.

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
    }
});

return EC_Avatar;

}); // require js
