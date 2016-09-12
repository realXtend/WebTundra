
define([
        "view/threejs/entity-components/EC_Sky_ThreeJs"
    ], function(EC_Sky_ThreeJs) {

var EC_SkyX_ThreeJs = EC_Sky_ThreeJs.$extend(
/** @lends EC_Sky_ThreeJs.prototype */
{
    /**
        Sky component implementation for the three.js render system.

        @ec_implements EC_Sky
    */
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
