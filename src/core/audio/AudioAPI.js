
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

        this.panner = this.context.createPanner();
        //@TODO Remove oscillator if not needed? Might be useful for some custom sound effects.
        this.oscillator = this.context.createOscillator();
        this.masterGainNode = this.context.createGain();

        // Master GainNode to be used as destination of other sources
        this.masterGainNode.connect(this.context.destination);
        this.masterGainNode.gain.value = this.options.masterGain;

        this.oscillator.connect(this.masterGainNode);
        this.panner.connect(this.masterGainNode);

        // Register stuff here.
    	this.registerAssetFactories();
    	this.registerComponents();

        if (Tundra.client.isConnected())
            this.registerEvents();
        else
            Tundra.client.onConnected(this, this.registerEvents);
    },

    /*
     * Loads a sound based on the ref-param (should be a website)
     * The source should be the EC_Sound-component's source. Pass it in.
     * Loop should be true if you want to loop the sound forever.
     * The return function should be allowed to be given a source param to.
     */
    loadSound : function(ref, source, loop, returnFunction)
    {
        if (Tundra.audio.context.listener == null || !Tundra.audio.sceneHasActiveSoundListener())
            console.warn("[AudioAPI] No active sound listeners.");

        Tundra.asset.requestAsset(ref).onCompleted(this, function(asset) {
            Tundra.audio.context.decodeAudioData(asset.data, function(decodedData) {
                // Create the source by using context, set the buffer
                source.buffer = decodedData;

                // Set loop settings. loopEnd & loopStart default are zeros. loop is a bool value.
                source.loopEnd = decodedData.duration;
                source.loop = loop;

                // On ended? Maybe inform the user in some situations? Or something like that.
                source.onended = function() { };

                // Playback rate, default is 1, 2 is twice the normal speed?
                source.playbackRate.value = 1;

                source.connect(Tundra.audio.panner);

                returnFunction(source);
            }.bind(this));
        }.bind(this));
    },

    /*
     * @TODO There can currently, in a really specific situation, be 2 active sound listeners.
     * Please make it so that there can only be one.
     */
    setActiveSoundListener : function(soundListener)
    {
        var soundListenerEntities = Tundra.scene.entitiesWithComponent("SoundListener");
        for (var i = 0; i < soundListenerEntities.length; i++)
        {
            var current = soundListenerEntities[i].soundListener;

            if (current.id !== soundListener.id && current.active)
            {
                current.setAttribute("active", false, 0);
                break;
            }
        }
    },

    sceneHasActiveSoundListener : function()
    {
        var soundListenerEntities = Tundra.scene.entitiesWithComponent("SoundListener");

        if (soundListenerEntities.length <= 0)
            return false;

        for (var i = 0; i < soundListenerEntities.length; i++)
        {
            var current = soundListenerEntities[i].soundListener;

            if (current.active)
                return true;
        }

        return false;
    },

    /// ITundraAPI override
	postInitialize : function()
    {
	}

});

return AudioAPI;

});