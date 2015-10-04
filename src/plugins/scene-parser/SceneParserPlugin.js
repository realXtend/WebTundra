
define([
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "plugins/scene-parser/SceneParser"
    ], function(Tundra, ITundraPlugin, SceneParser) {

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

Tundra.registerPlugin(new SceneParserPlugin());

return SceneParserPlugin;

}); // require js
