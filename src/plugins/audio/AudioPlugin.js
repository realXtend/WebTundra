
define([
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "core/asset/AssetFactory",
        "plugins/audio/asset/AudioAsset",
        "plugins/audio/entity-components/EC_Sound_WebAudio",
        "plugins/audio/entity-components/EC_SoundListener_WebAudio"
    ], function(Tundra, ITundraPlugin, AssetFactory, AudioAsset, EC_Sound_WebAudio, EC_SoundListener_WebAudio)
{

var AudioPlugin = ITundraPlugin.$extend(
{
    __init__ : function()
    {
        this.$super("AudioPlugin", [ "Audio" ]);
    },

    registerComponents : function()
    {
        Tundra.scene.registerComponent(EC_Sound_WebAudio);
        Tundra.scene.registerComponent(EC_SoundListener_WebAudio);
    },

    registerAssetFactories : function()
    {
		Tundra.asset.registerAssetFactory(new AssetFactory("Audio", AudioAsset, {
            ".ogg"         : "arraybuffer",
            ".mp3"		   : "arraybuffer"
        }));
    },

    /// ITundraPlugin override
    pluginPropertyName : function()
    {
        return "audio";
    },

    /// ITundraPlugin override
    initialize : function(options)
    {
    	this.registerAssetFactories();
    	this.registerComponents();
    },

    /// ITundraPlugin override
	postInitialize : function()
    {
	}

});

Tundra.registerPlugin(new AudioPlugin());

return AudioPlugin;

});