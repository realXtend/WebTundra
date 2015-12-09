
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

        // define audio context
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master GainNode to be used as destination of other sources
        this.masterGainNode = this.audioCtx.createGain();
        this.masterGainNode.connect(this.audioCtx.destination);
        this.masterGainNode.gain.value = options.masterGain;

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
        //TODO: REMOVE THIS AUDIO PLAYBACK TEST
        Tundra.asset.requestAsset("https://ia902508.us.archive.org/5/items/testmp3testfile/mpthreetest.mp3").onCompleted(this, function(asset)
        {
            Tundra.audio.context.decodeAudioData(asset.data, function(decodedData) { 
                console.log("Decoded data", decodedData);
                var source = Tundra.audio.context.createBufferSource();
                source.buffer = decodedData;
                source.loop = false;
                source.onended = function() { };
                source.playbackRate.value = 1;
                source.start(0, 0);

                source.connect(Tundra.audio.panner);
            });
        }.bind(this));
    },

    /// ITundraAPI override
    initialize : function()
    {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.panner = this.context.createPanner();
        this.gain = this.context.createGain();
        this.gain.connect(this.context.destination);

    	this.registerAssetFactories();
    	this.registerComponents();

        if (Tundra.client.isConnected())
            this.registerEvents();
        else
            Tundra.client.onConnected(this, this.registerEvents);
    },

    setActiveSoundListener : function(soundListener)
    {
        var soundListenerEntities = Tundra.scene.entitiesWithComponent("SoundListener");
        for (var i = 0; i < soundListenerEntities.length; i++)
        {
            var current = soundListenerEntities[i].soundListener;
            //console.log(current.id, soundListener.id);
            if (current.id !== soundListener.id && current.active)
            {
                current.active = false;
                break;
            }
        }
    },

    /// ITundraAPI override
	postInitialize : function()
    {
	}

});

return AudioAPI;

});