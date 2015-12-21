
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
     * Autoplay should be true if you want to play the sound on-load, 
     * loop should be true if you want to loop the sound forever.
     */
    loadSound : function(ref, autoplay, loop)
    {
        // Clean the source element
        this.destroyOldData();

        Tundra.asset.requestAsset(ref).onCompleted(this, function(asset) {
            Tundra.audio.context.decodeAudioData(asset.data, function(decodedData) {
                //@TODO Debug log - remove
                console.log(decodedData, asset.data);

                // Create the source by using context, set the buffer
                this.source = Tundra.audio.context.createBufferSource();
                this.source.buffer = decodedData;

                // Set loop settings. loopEnd & loopStart default are zeros. loop is a bool value.
                this.source.loopEnd = decodedData.duration;
                this.source.loop = loop;

                // On ended? Maybe inform the user in some situations? Or something like that.
                this.source.onended = function() { };

                // Playback rate, default is 1, 2 is twice the normal speed?
                this.source.playbackRate.value = 1;

                this.source.connect(this.panner);

                if (autoplay)
                    this.playSound();
            }.bind(this));
        }.bind(this));
    },

    /*
     * Plays a sound that has been loaded using the loadSound()-method.
     */
    playSound : function()
    {
        // Connect to the destination, start.
        this.source.start();
    },

    /*
     * Stops the audio/sound from playing
     */
    stopSound : function()
    {
        if (this.source != undefined)
            this.source.stop();
    },

    /*
     * Destroys old audio source data
     * Should be called upon loading a new sound
     */
    destroyOldData : function()
    {
        this.source = null;
    },

    /*
     * Set the current source's loop value.
     * Has no effect if the source is undefined or not playing
     */
    setLoop : function(bool)
    {
        if (this.source != undefined)
            this.source.loop = bool;
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

    /// ITundraAPI override
	postInitialize : function()
    {
	}

});

return AudioAPI;

});