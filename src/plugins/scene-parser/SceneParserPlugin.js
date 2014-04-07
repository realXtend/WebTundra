
define([
        "core/framework/TundraSDK",
        "core/framework/ITundraPlugin",
        "plugins/scene-parser/SceneParser"
    ], function(TundraSDK, ITundraPlugin, SceneParser) {

var SceneParserPlugin = ITundraPlugin.$extend(
{
    __init__ : function()
    {
        this.$super("SceneParserPlugin");
    },

    newXML3DParser : function(targetScene)
    {
        return new SceneParser(targetScene);
    }
});

TundraSDK.registerPlugin(new SceneParserPlugin());

return SceneParserPlugin;

}); // require js
