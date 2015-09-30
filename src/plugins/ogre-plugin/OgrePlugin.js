
define([
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "core/asset/AssetFactory",
        "plugins/ogre-plugin/asset/OgreMeshAsset",
        "plugins/ogre-plugin/asset/OgreMaterialAsset",
        "plugins/ogre-plugin/asset/TextureAsset"
    ], function(Tundra, ITundraPlugin, AssetFactory,
                OgreMeshAsset,
                OgreMaterialAsset,
                TextureAsset)
{

var OgrePlugin = ITundraPlugin.$extend({
    __init__ : function()
    {
        this.$super("OgrePlugin", [ "Ogre" ]);
    },

    /// ITundraPlugin override
    pluginPropertyName : function()
    {
        return "ogre";
    },

    /// ITundraPlugin override
    initialize : function(options)
    {
        this.framework.asset.registerAssetFactory(new AssetFactory("OgreMesh", OgreMeshAsset, {
            ".mesh"         : "arraybuffer",
            ".mesh.xml"     : "xml"
        }));

        this.framework.asset.registerAssetFactory(new AssetFactory("OgreMaterial", OgreMaterialAsset, {
            ".material"     : "text"
        }));


        this.framework.asset.registerAssetFactory(new AssetFactory("Texture", TextureAsset, {
            ".dds" : undefined, ".crn" : undefined, ".png" : undefined, ".jpg" : undefined, ".jpeg" : undefined, ".bmp" : undefined, ".gif" : undefined
        }, "arraybuffer"));
    },

    /// ITundraPlugin override
	postInitialize : function()
    {
	}

});

Tundra.registerPlugin(new OgrePlugin());

return OgrePlugin;

});