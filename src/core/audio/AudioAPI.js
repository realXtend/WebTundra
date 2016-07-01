
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/audio/entity-components/EC_Sound_WebAudio",
        "core/audio/entity-components/EC_SoundListener_WebAudio"
    ], function(Tundra, ITundraAPI, EC_Sound_WebAudio, EC_SoundListener_WebAudio)
{

var AudioAPI = ITundraAPI.$extend(
{
    __init__ : function(name, options)
    {
        this.$super(name, options);
        this.activeSoundListener = null;

        Object.defineProperties(this, {
            masterGain: {
                get: function() { return this.options.masterGain },
                set: function(gain) {
                    this.options.masterGain = gain;
                    this.updateActiveNode();
                }
            },

            followActiveCamera: {
                get: function() { return this.options.followActiveCamera },
                set: function(enable) {
                    this.options.followActiveCamera = enable;
                    this.onActiveCameraChanged(Tundra.renderer.activeCameraComponent);
                }
            }
        });
    },

    __classvars__:
    {
        getDefaultOptions : function()
        {
            return {
                followActiveCamera  : true,
                masterGain          : 1.0
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
        /* @todo: We're currently working with <audio> tags, so this is not needed atm. Improve or remove.
		Tundra.asset.registerAssetFactory(new AssetFactory("Audio", AudioAsset, {
            ".ogg"         : "arraybuffer",
            ".mp3"		   : "arraybuffer"
        }));
        */
    },

    /// ITundraAPI override
    initialize : function()
    {
        this.context = new (window.AudioContext || window.webkitAudioContext)();

        // Master GainNode to be used as destination of other sources
        this.masterGainNode = this.context.createGain();
        this.masterGainNode.gain.value = 0;
        this.masterGainNode.connect(this.context.destination);

        this.ambientNode = this.context.createGain();
        this.ambientNode.gain.value = this.options.masterGain;
        this.ambientNode.connect(this.context.destination);

    	// this.registerAssetFactories();
    	this.registerComponents();
    },

    setActiveSoundListener: function(soundListener)
    {
        if (this.activeSoundListener)
            this.activeSoundListener.active = false;

        this.activeSoundListener = soundListener;
        if (this.activeSoundListener)
            this.activeSoundListener.active = true;
        this.updateActiveNode();
    },

    activeSoundListenerEntity: function()
    {
        return (this.activeSoundListener != null ? this.activeSoundListener.parentEntity : null);
    },

    /// ITundraAPI override
	postInitialize : function()
    {
        Tundra.renderer.onActiveCameraChanged(this, this.onActiveCameraChanged);
        this.onActiveCameraChanged(Tundra.renderer.activeCameraComponent);
	},

    onActiveCameraChanged: function(activated)
    {
        if (!activated)
        {
            this.setActiveSoundListener(null);
            return;
        }

        if (this.options.followActiveCamera)
        {
            var soundListener = activated.parentEntity.getOrCreateComponent("SoundListener");
            soundListener.setActive();
        }

    },

    // Sets 'spatial' (master node) or 'non-spatial' (ambient node) based on if there is active sound listener
    // if we don't have an active sound listener, the sound will be ambiental
    updateActiveNode: function()
    {
        if (this.activeSoundListener)
        {
            this.masterGainNode.gain.value = this.masterGain;
            this.ambientNode.gain.value = 0;
        }
        else
        {
            this.masterGainNode.gain.value = 0;
            this.ambientNode.gain.value = this.masterGain;
        }
    }
});

return AudioAPI;

});