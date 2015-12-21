
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
        // @todo Remove, used for test only
        if (this.soundRef != "")
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
            Tundra.audio.setLoop(value);
            break;
        default:
            break;
        }
    },

    load : function()
    {
        if (this.soundRef != "" && this.playOnLoad)
            Tundra.audio.loadSound(this.soundRef, this.playOnLoad, this.loopSound);
    },


});

return EC_Sound_WebAudio;

}); // require js
