
define([
    "entity-components/EC_SoundListener"
    ], function(EC_SoundListener) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_SoundListener
    in the Tundra protocol.

    Renderer implementations need to provide this components functionality, preferably by extending this object.

    @class EC_SoundListener_WebAudio
    @extends EC_SoundListener
    @constructor
*/
var EC_SoundListener_WebAudio = EC_SoundListener.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);
    },

    __classvars__ :
    {
        Implementation : "webaudio"
    }
});

return EC_SoundListener_WebAudio;

}); // require js
