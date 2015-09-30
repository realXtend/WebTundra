
define([
        "view/threejs/entity-components/EC_Sky_ThreeJs"
    ], function(EC_Sky_ThreeJs) {

/**
    Sky component implementation for the three.js render system.

    @class EC_Sky_ThreeJs
    @extends EC_Sky
    @constructor
*/
var EC_SkyX_ThreeJs = EC_Sky_ThreeJs.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);
    },

    __classvars__ :
    {
        TypeId   : 38,
        TypeName : "SkyX",
        Implementation : "three.js"
    }
});

return EC_SkyX_ThreeJs;

}); // require js
