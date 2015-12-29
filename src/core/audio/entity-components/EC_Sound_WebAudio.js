
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
            //_soundGainNode: Tundra.audio.context.createGain(),
            _position: new THREE.Vector3(),
            _pannerNode: Tundra.audio.context.createPanner(),
            _placeable: undefined
        };

        this.cache._pannerNode.setPosition(this.cache._position.x, this.cache._position.y, this.cache._position.z);
        //this.cache._soundGainNode.gain.value = this.soundGain;

        this.cache._pannerNode.connect(Tundra.audio.masterGainNode);
        //this.cache._soundGainNode.connect(Tundra.audio.masterGainNode);
        
        this.checkAndUpdatePlaceable();
        this.checkAndUpdateSoundRef();

        // Register events listener for creating/removing placeable components 
        this.parentEntity.onComponentCreated(this, this.onComponentCreated);
        this.parentEntity.onComponentRemoved(this, this.onComponentRemoved);

        console.log('EC_Sound_WebAudio initialized!');
    },
    
    startPlaying: function()
    {
        if(this.cache._element)
        {
            this.cache._element.start();
        }
    },

    stopPlaying: function()
    {
        if(this.cache._element)
        {
            this.cache._element.stop();
        }
    },

    pausePlaying: function()
    {
        if(this.cache._element)
        {
            this.cache._element.pause();
        }
    },

    _testGetAudioElement: function (soundRef)
    {
        var audioElement = new Audio(soundRef);
        return audioElement;
    },

    checkAndUpdateSoundRef: function()
    {
        if(this.soundRef)
        {
            var _element = this._testGetAudioElement(this.soundRef);
            //Tundra.asset.requestAsset(newSoundRef).onCompleted(this, function (asset)
            //{
                // TODO: Properly dispose old HTMLAudioElement and MediaElementSourceNode
                // for now just disconnect the old source
                if(this.cache._element)
                    this.cache._element.stop();

                if(this.cache._source)
                    this.cache._source.disconnect();

                this.cache._element = _element;
                this.cache._source =  Tundra.audio.context.createMediaElementSource(_element);

                if(this.playOnLoad)
                {
                    // Setting it to false still performs autoplay, 
                    // so set it only if playOnLoad
                    _element.autoplay = true;
                }

                _element.loop = this.loopSound;
                _element.volume = this.soundGain;

                this._reconnectSourceNode();

            //}.bind(this));
        }
        // TODO: What to do if set to empty string
    },

    _reconnectSourceNode: function()
    {
        if(this.cache._source)
        {
            console.log('### EC_Sound_WebAudio, _reconnectSourceNode - spatial: ', this.spatial, ', pannerNode:', this.cache._pannerNode, ', placeable:', this.cache._placeable);
            this.cache._source.disconnect();
            // Spatial is not set, connect to gain node regardless of placeable or pannerNode
            if(!this.spatial)
            {
                this.cache._source.connect(Tundra.audio.masterGainNode);
                console.log('### EC_Sound_WebAudio, _reconnectSourceNode - connect to masterGainNode');
            }
            // Spatial is set, pannerNode exists, placeable is available
            else if(this.spatial && this.cache._pannerNode && this.cache._placeable)
            {
                // It is safe to call disconnect() even if not connected before
                this.cache._source.connect(this.cache._pannerNode);
                console.log('### EC_Sound_WebAudio, _reconnectSourceNode - connect to pannerNode');
            }
            // Something is wrong (spatial is set but no pannerNode or no placeable), stop playing
            else
            {
                if(this.cache._element)
                    this.cache._element.stop();
            }
        }

    },

    _updatePosition: function()
    {
        if(this.cache._pannerNode && this.cache._placeable)
        {
            this.parentEntity.placeable.worldPosition(this.cache._position);
            this.cache._pannerNode.setPosition(this.cache._position.x, this.cache._position.y, this.cache._position.z);
        }
    },

    checkAndUpdatePlaceable: function()
    {
        /* If there is already a placeable attached do nothing (only first placeable component is considered) */
        if(this.cache._placeable)
            return;

        /* Otherwise, get read its initial position and attach an attribute change listener to it */
        if(this.hasParentEntity() && this.parentEntity.placeable)
        {
            console.log('### EC_Sound_WebAudio, set placeable:', this.parentEntity.placeable);
            this.cache._placeable = this.parentEntity.placeable;
            
            this._updatePosition();

            // TODO: Check if unsubscribe is required later
            this.parentEntity.placeable.onAttributeChanged(this, function (entity, component, attributeIndex, attributeName, attributeValue){
                /* Check if transform attribute (attribute index = 0) changed */
                if(attributeIndex==0)
                {
                    this._updatePosition();
                }
            }.bind(this));

        }
    },

    onComponentCreated: function(ent, component)
    {
        /* Check if the created component is Placeable */
        if(component.id==20)
        {
            this.checkAndUpdatePlaceable();
            this._reconnectSourceNode();
        }
    },

    onComponentRemoved: function(ent, component)
    {
        /* Check if the removed component is Placeable and the same placeable cached */
        if(component.id==20 && this.cache._placeable && this.cache._placeable.id === component.id)
        {
            this.cache._placeable = undefined;
            this._reconnectSourceNode();
        }
    },

    changeGain: function()
    {
        if(this.cache._element)
        {
            this.cache._element.volume = this.soundGain;
        }
    },

    changeLoopSound: function()
    {
        if(this.cache._element)
        {
            this.cache._element.loop = this.loopSound;
        }

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
    },

    load : function(value)
    {

    },


});

return EC_Sound_WebAudio;

}); // require js
