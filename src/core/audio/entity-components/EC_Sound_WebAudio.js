
define([
    "entity-components/EC_Sound"
    ], function(EC_Sound) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_Sound
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_Sound_WebAudio
    @extends EC_Sound
    @constructor
*/
var EC_Sound_WebAudio = EC_Sound.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);
    },

    __classvars__ :
    {
        Implementation : "webaudio"
    },

    /*
     * The initialization function
     */
    update : function()
    {
        this.source = Tundra.audio.context.createBufferSource();

        // @todo Remove, used for test only
        this.load();
    },

    attributeChanged : function(index, name, value)
    {
        switch(index)
        {
        case 0: // sound ref
            this.load();
            break;
        case 4: // play on creation
            break;
        case 5: // loop sound
            if (this.source != null)
                this.source.loop = value;
            break;
        default:
            break;
        }
    },

    load : function()
    {
        if (this.soundRef != "" && (this.soundRef.indexOf(".mp3") > -1 || this.soundRef.indexOf(".ogg") > -1))
        {
            Tundra.audio.loadSound(this.soundRef, this.source, this.loopSound, this.soundLoad.bind(this));
        }
    },

    soundLoad : function(newSource) 
    {
        this.source = newSource;

        console.log(this.source);

         if (this.source != null)
        {
            if (this.playOnLoad)
            {
                console.log("Started playing");

                this.source.start();
            }
        }
    }
});

return EC_Sound_WebAudio;

}); // require js
