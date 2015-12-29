
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

    __classvars__: 
    {
        getDefaultOptions : function()
        {
            return {
                enabled             : true,
                followActiveCamera  : false,
                masterGain          : 0.5
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

    registerEvents : function()
    {
        //@TODO Register events here..?
    },

    /// ITundraAPI override
    initialize : function()
    {
        this.context = new (window.AudioContext || window.webkitAudioContext)();

        // Master GainNode to be used as destination of other sources
        this.masterGainNode = this.context.createGain();
        this.masterGainNode.gain.value = this.options.masterGain;
        this.masterGainNode.connect(this.context.destination);

        // Register stuff here.
    	this.registerAssetFactories();
    	this.registerComponents();

        if (Tundra.client.isConnected())
            this.registerEvents();
        else
            Tundra.client.onConnected(this, this.registerEvents);

        console.log('AudioAPI initialized!');
    },

    /// ITundraAPI override
	postInitialize : function()
    {
	}

});

return AudioAPI;

});