
define([
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "core/asset/AssetFactory",
        "plugins/script-plugin/asset/ScriptAsset"
    ], function(Tundra, ITundraPlugin, AssetFactory, ScriptAsset)
{

var ScriptPlugin = ITundraPlugin.$extend({
    __init__ : function()
    {
        this.$super("ScriptPlugin", [ "Script" ]);
    },

    /// ITundraPlugin override
    pluginPropertyName : function()
    {
        return "script";
    },

    /// ITundraPlugin override
    initialize : function(options)
    {
        this.framework.asset.registerAssetFactory(new AssetFactory("Script", ScriptAsset, {
            ".js" : undefined, ".webtundrajs" : undefined
        }, "text"));
    },

    /// ITundraPlugin override
	postInitialize : function()
    {
	}

});

Tundra.registerPlugin(new ScriptPlugin());

return ScriptPlugin;

});