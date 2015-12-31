
define([
    "entity-components/EC_Sound"
    ], function(EC_Sound) {

/**
    This is implementation of EC_Sound using Web Audio API.

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

    /**
        Called only ONCE when the component is initialized
    */
    update : function()
    {
        this.cache = {
            _soundGainNode: Tundra.audio.context.createGain(),
            _position: new THREE.Vector3(),
            _pannerNode: Tundra.audio.context.createPanner(),
            _placeable: undefined
        };

        this.cache._soundGainNode.gain.value = this.soundGain;

        this.cache._pannerNode.setPosition(this.cache._position.x, this.cache._position.y, this.cache._position.z);
        this.cache._pannerNode.connect(Tundra.audio.masterGainNode);
        
        this.checkAndUpdatePlaceable();
        this.checkAndUpdateSoundRef();

        // Register events listener for creating/removing placeable components 
        this.parentEntity.onComponentCreated(this, this.onComponentCreated);
        this.parentEntity.onComponentRemoved(this, this.onComponentRemoved);
    },

    reset : function()
    {
        this.disposeSource();
    },

    disposeSource : function()
    {
        if (this.cache._element)
            this.cache._element.pause();

        if (this.cache._source)
            this.cache._source.disconnect();

        this.cache._element = undefined;
        this.cache._source = undefined;
    },

    play: function()
    {
        if (this.cache._element)
            this.cache._element.play();
    },

    stop: function()
    {
        if (this.cache._element)
        {
            this.cache._element.pause();
            this.cache._element.currentTime = 0;
        }
    },

    pause: function()
    {
        if (this.cache._element)
            this.cache._element.pause();
    },

    checkAndUpdateSoundRef: function()
    {
        if (this.soundRef)
        {
            this.disposeSource();

            var _element = new Audio(this.soundRef);

            if (this.cache._source)
                this.cache._source.disconnect();

            this.cache._element = _element;
            this.cache._source = Tundra.audio.context.createMediaElementSource(_element);

            if (this.playOnLoad)
            {
                // Setting it to false still performs autoplay, 
                // so set it only if playOnLoad
                _element.autoplay = true;
            }

            _element.loop = this.loopSound;

            this._reconnectSourceNode();
        }
        else
            this.disposeSource();
    },

    _reconnectSourceNode: function()
    {
        if (this.cache._source)
        {
            this.cache._source.disconnect();
            this.cache._soundGainNode.disconnect();
            this.cache._source.connect(this.cache._soundGainNode);
            this.cache._soundGainNode.connect(Tundra.audio.ambientNode);

            // Spatial is not set, connect to gain node regardless of placeable or pannerNode
            if (!this.spatial)
                this.cache._soundGainNode.connect(Tundra.audio.masterGainNode);
            // Spatial is set, pannerNode exists, placeable is available
            else if (this.spatial && this.cache._pannerNode && this.cache._placeable)
            {
                // It is safe to call disconnect() even if not connected before
                this.cache._soundGainNode.connect(this.cache._pannerNode);
            }
            else
            {
                // Something is wrong (spatial is set but no pannerNode or no placeable), just disconnect
                if (this.cache._source)
                    this.cache._source.disconnect();
            }
        }
    },

    _updatePosition: function()
    {
        if (this.cache._pannerNode && this.cache._placeable)
        {
            this.parentEntity.placeable.worldPosition(this.cache._position);
            this.cache._pannerNode.setPosition(this.cache._position.x, this.cache._position.y, this.cache._position.z);
        }
    },

    checkAndUpdatePlaceable: function()
    {
        /* If there is already a placeable attached do nothing (only first placeable component is considered) */
        if (this.cache._placeable)
            return;

        /* Otherwise, get read its initial position and attach an attribute change listener to it */
        if (this.hasParentEntity() && this.parentEntity.placeable)
        {
            this.cache._placeable = this.parentEntity.placeable;
            this._updatePosition();

            // TODO: Check if unsubscribe is required later
            this.parentEntity.placeable.onAttributeChanged(this, this.onPlaceableAttributeChanged);
        }
    },

    onComponentCreated: function(ent, component)
    {
        // Check if the created component is Placeable
        if (component.typeId == 20)
        {
            this.checkAndUpdatePlaceable();
            this._reconnectSourceNode();
        }
    },

    onComponentRemoved: function(ent, component)
    {
        /* Check if the removed component is Placeable and the same placeable cached */
        if (component.typeId == 20 && this.cache._placeable && this.cache._placeable.id === component.id)
        {
            this.cache._placeable = undefined;
            this._reconnectSourceNode();
        }
    },

    onPlaceableAttributeChanged: function(entity, component, attributeIndex, attributeName, attributeValue)
    {
        if (attributeIndex == 0) // transform
            this._updatePosition();
    },

    changeGain: function()
    {
        if (this.cache._soundGainNode)
            this.cache._soundGainNode.gain.value = this.soundGain;
    },

    changeLoopSound: function()
    {
        if (this.cache._element)
            this.cache._element.loop = this.loopSound;
    },

    attributeChanged : function(index, name, value)
    {
        switch(index)
        {
            case 0: // soundRef
                this.checkAndUpdateSoundRef();
                break;
            case 3: // soundGain
                this.changeGain();
                break;
            case 4: // playOnLoad
                break;
            case 5: // loopSound
                this.changeLoopSound();
                break;
            case 6: // spatial
                this._reconnectSourceNode();
                break;
            default:
                break;
        }
    }
});

return EC_Sound_WebAudio;

}); // require js
