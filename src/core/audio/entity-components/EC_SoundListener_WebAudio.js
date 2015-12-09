
define([
    "lib/three",
    "entity-components/EC_SoundListener"
    ], function(THREE, EC_SoundListener) {

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
        this._positionCache = new THREE.Vector3();
    },

    __classvars__ :
    {
        Implementation : "webaudio"
    },

    update : function() 
    {
        this.lastActive = this.active;

        this.updater = Tundra.frame.onUpdate(this, this.onUpdate);
    },

    onUpdate : function(time) 
    {
        if (this.hasParentEntity() && this.active)
        {
            this.parentEntity.placeable.worldPosition(this._positionCache);
            Tundra.audio.context.listener.setPosition(this._positionCache.x, this._positionCache.y, this._positionCache.z);
        }
    },

    setContext : function(newContext) 
    {
        Tundra.audio.context = newContext;
    },

    getContext : function() 
    {
        return Tundra.audio.context;
    },

    getListener : function()
    {
        return this.getContext().listener;
    },

    attributeChanged : function(index, name, value)
    {
        switch (index)
        {
            case 0: // active
                //console.log("DEBUG PRINT: ACTIVE STATE CHANGED FROM " + this.lastActive + " => " + this.active);
                if (this.active)
                    Tundra.audio.setActiveSoundListener(this);
                break;
        }
    },
});

return EC_SoundListener_WebAudio;

}); // require js
