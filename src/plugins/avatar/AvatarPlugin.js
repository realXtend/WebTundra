
define([
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "core/asset/AssetFactory",
        "plugins/avatar/asset/AvatarDescAsset",
    ], function(Tundra, ITundraPlugin, AssetFactory, AvatarDescAsset)
{

var AvatarPlugin = ITundraPlugin.$extend({
    __init__ : function()
    {
        this.$super("AvatarPlugin", [ "Avatar" ]);
    },

    /// ITundraPlugin override
    pluginPropertyName : function()
    {
        return "avatar";
    },

    /// ITundraPlugin override
    initialize : function(options)
    {
        this.framework.asset.registerAssetFactory(new AssetFactory("RealXtendAvatarDescription", AvatarDescAsset, {
            ".avatar" : "xml"
        }));
    },

    /// ITundraPlugin override
	postInitialize : function()
    {
	}

});

Tundra.registerPlugin(new AvatarPlugin());

return AvatarPlugin;

});