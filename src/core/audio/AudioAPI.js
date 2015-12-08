
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/asset/AssetFactory",
        "core/audio/asset/AudioAsset",
        "core/audio/entity-components/EC_Sound_WebAudio",
        "core/audio/entity-components/EC_SoundListener_WebAudio"
    ], function(Tundra, ITundraAPI, AssetFactory, AudioAsset, EC_Sound_WebAudio, EC_SoundListener_WebAudio)
{

var AudioAPI = ITundraAPI.$extend(
{
    __init__ : function(name, options)
    {
        this.$super(name, options);
    },

    __classvars__ : 
    {
        getDefaultOptions : function()
        {
            return {
                enabled             : true,
                followActiveCamera  : false
            };
        }
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

    /// ITundraAPI override
    initialize : function()
    {
    	this.registerAssetFactories();
    	this.registerComponents();
    },

    /// ITundraAPI override
	postInitialize : function()
    {
	}

});

return AudioAPI;

});