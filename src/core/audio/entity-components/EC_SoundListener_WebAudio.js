
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
        this._prevPositionCache = new THREE.Vector3();
        this._positionCache = new THREE.Vector3();
        this._velocityCache = new THREE.Vector3();
        this._orientationCache = new THREE.Vector3();
        this._quaternion = new THREE.Quaternion();
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
        //@TODO Remove useless, commented-out stuff if DEEMED USELESS

        if (this.hasParentEntity() && this.parentEntity.placeable != null && this.active)
        {
            this.parentEntity.placeable.worldPosition(this._positionCache);
            
            //Tundra.audio.context.listener.setPosition(this._positionCache.x, this._positionCache.y, this._positionCache.z);

            this._orientationCache.set(this._positionCache.x, this._positionCache.y, this._positionCache.x).applyQuaternion(this.parentEntity.placeable.orientation());
            this._velocityCache.subVectors(this._positionCache, this._prevPositionCache);

            //Tundra.audio.panner.setPosition(this._positionCache.x, this._positionCache.y, this._positionCache.z);
            //Tundra.audio.panner.setOrientation(this._orientationCache.x, this._orientationCache.y, this._orientationCache.z);

            Tundra.audio.context.listener.setPosition(this._positionCache.x, this._positionCache.y, this._positionCache.z);
            Tundra.audio.context.listener.setOrientation(this._orientationCache.x, this._orientationCache.y, this._orientationCache.z, 0, 1, 0); //@TODO this.up stuff????
            //Tundra.audio.context.listener.setVelocity(this._velocityCache.x, this._velocityCache.y, this._velocityCache.z);

            this._prevPositionCache.copy(this._positionCache);
        }
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
