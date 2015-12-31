
define([
    "lib/three",
    "entity-components/EC_SoundListener"
    ], function(THREE, EC_SoundListener) {

/**
    EC_SoundListener implementation using WebAudio API

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
        this._orientationCache = new THREE.Quaternion();
        this._frontVector = new THREE.Vector3(0,0,-1);
        this._frontDir = this._frontVector.clone();
        this._upVector = new THREE.Vector3(0,1,0);
        this._upDir = this._upVector.clone();
    },

    __classvars__ :
    {
        Implementation : "webaudio"
    },

    update : function() 
    {
        this.updater = Tundra.frame.onUpdate(this, this.onUpdate);
    },

    onUpdate : function(time) 
    {
        if (this.hasParentEntity() && this.parentEntity.placeable != null && this.active)
        {
            this.parentEntity.placeable.worldPosition(this._positionCache);
            this.parentEntity.placeable.worldOrientation(this._orientationCache);

            this._frontDir.copy(this._frontVector);
            this._frontDir.applyQuaternion(this._orientationCache);
            this._frontDir.normalize();
            this._upDir.copy(this._upVector);
            this._upDir.applyQuaternion(this._orientationCache);
            this._upDir.normalize();

            Tundra.audio.context.listener.setPosition(this._positionCache.x, this._positionCache.y, this._positionCache.z);
            Tundra.audio.context.listener.setOrientation(this._frontDir.x, this._frontDir.y, this._frontDir.z, this._upDir.x, this._upDir.y, this._upDir.z);
        }
    },

    setActive: function()
    {
        Tundra.audio.setActiveSoundListener(this);
    },

    reset: function()
    {
        if ((Tundra.audio.activeSoundListenerEntity().id == this.parentEntity.id) && 
            (Tundra.audio.activeSoundListener.id == this.id))
            Tundra.audio.setActiveSoundListener(null);
    }
});

return EC_SoundListener_WebAudio;

}); // require js
