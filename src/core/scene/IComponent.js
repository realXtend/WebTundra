
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/scene/Attribute",
        "core/scene/AttributeChange",
    ], function(Class, TundraSDK, TundraLogging, Attribute, AttributeChange) {

/**
    IComponent is the interface all component implementations will extend. Provides a set of utility functions for all components.

    Handles automatic network deserialization for declared components. Implementations can override
    {{#crossLink "IComponent/reset:method"}}{{/crossLink}}, {{#crossLink "IComponent/update:method"}}{{/crossLink}}
    and {{#crossLink "IComponent/attributeChanged:method"}}{{/crossLink}}.

    @class IComponent
    @constructor
    @param {Number} id Component id.
    @param {Number} typeId Component type id.
    @param {String} typeName Component type name.
    @param {String} name Component name.
*/
var IComponent = Class.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        /**
            Components logger instance, with channel name as the component type name.
            @property log
            @type TundraLogger
        */
        this.log = TundraLogging.getLogger(IComponent.propertyName(typeName, false));

        /**
            Component id.
            @property id
            @type Number
        */
        this.id = id;
        /**
            Component type id.
            @property typeId
            @type Number
        */
        this.typeId = typeId;
        /**
            Component type name.
            @property typeName
            @type String
        */
        this.typeName = typeName;
        /**
            Component name.
            @property name
            @type String
        */
        this.name = name;

        /**
            Is this component replicated over the network.
            @property replicated
            @type Boolean
        */
        this.replicated = true;
        /**
            Is this component local. Same as !comp.replicated.
            @property local
            @type Boolean
        */
        this.local = false;
        /**
            Is this component temporary, meaning it won't be serialized when scene is stored to disk.
            @property temporary
            @type Boolean
        */
        this.temporary = false;
        /**
            Parent entity.
            @property parentEntity
            @type Entity
        */
        this.parentEntity = null;
        /**
            Parent scene.
            @property parentScene
            @type Scene
        */
        this.parentScene = null;
        /**
            Flag for if this component has a real implementation or is it just
            the IComponent base implementation.
            @property notImplemented
            @type Boolean
        */
        this.notImplemented = false;
        /**
            Attributes for this component.
            @example
                // There are three ways of accessing a attribute
                var value = comp.myAttributeName.get();
                value = comp.attribute("myAttributeName").get();
                value = comp.attributeByIndex(index).get();
            @property attributes
            @type Array<Attribute>
        */
        this.attributes = {};
        /**
            Count of attributes in this component.
            @property attributeCount
            @type Number
        */
        this.attributeCount = 0;

        this.attributeIndexes = {}; // Don't document
        this.blockSignals = false;  // Don't document
    },

    __classvars__ :
    {
        ensureComponentNamePrefix : function(typeName)
        {
            return (typeName.substring(0,3).toLowerCase() === "ec_" ? typeName : "EC_" + typeName);
        },

        propertyName : function(typeName, lowerCase)
        {
            if (lowerCase === undefined)
                lowerCase = true;
            // "EC_Placeable" -> "Placeable"
            var propertyName = typeName;
            if (propertyName.substring(0,3).toLowerCase() === "ec_")
                propertyName = propertyName.substring(3);
            // "EC_Placeable" -> "placeable"
            if (lowerCase)
                propertyName = propertyName.substring(0,1).toLowerCase() + propertyName.substring(1);
            return propertyName;
        },

        propertyNameLowerCase : function(typeName)
        {
            return this.propertyName().toLowerCase();
        }
    },

    _reset : function()
    {
        // Call the implementation reset.
        this.reset();

        this.attributeIndexes = {};
        this.attributeCount = 0;
        this.blockSignals = false;

        for (var attributeName in this.attributes)
        {
            var attribute = this.attributes[attributeName];
            if (attribute !== undefined && attribute !== null)
                attribute._reset();
            attribute = null;
        }
        this.attrs = {};

        this.parentEntity = null;
        this.parentScene = null;
    },

    /**
        Returns if this component has a parent entity.
        @method hasParentEntity
        @return {Boolean}
    */
    hasParentEntity : function()
    {
        return (this.parentEntity !== null);
    },

    /**
        Returns if this component has a parent scene.
        @method hasParentScene
        @return {Boolean}
    */
    hasParentScene : function()
    {
        return (this.parentScene !== null);
    },

    /**
        Resets component state, if this gets called it means the component is being destroyed.
        The component should unload any CPU/GPU memory that it might have allocated.

        Override in component implementations.
        @method reset
    */
    reset : function()
    {
        /// @note Virtual no-op function. Implementations can override.
    },

    _update : function()
    {
        // @note Internal update that calls the implementation update.
        this.update();
    },

    update : function()
    {
        /// @note Virtual no-op function. Implementations can override.
    },

    /**
        Registers a callback for attribute changed event originating from this component.

        @example
            function onAttributeChanged(entity, component, attributeIndex, attributeName, attributeValue)
            {
                // entity == Entity
                // component == IComponent or one of its implementations.
                // attributeIndex == Attribute index that changed
                // attributeName == Attribute name that changed
                // attributeValue == New value
                console.log("Entity", entity.id, entity.name, "components", component.typeName, "attribute", attributeName, "changed to:", attributeValue.toString());
            }

            var entity = TundraSDK.framework.scene.entityById(12);
            if (entity != null && entity.mesh != null)
                entity.mesh.onAttributeChanged(null, onAttributeChanged);

        @method onAttributeChanged
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity/component is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAttributeChanged : function(context, callback)
    {
        if (this.parentEntity == null || this.parentEntity.id < 0)
        {
            console.log("ERROR: Entity.onAttributeChanged called on a non initialized component! No valid parent entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishAttributeChanged not in Entity!
        return TundraSDK.framework.events.subscribe("Scene.AttributeChanged." + this.parentEntity.id.toString() + "." + this.id.toString(), context, callback);
    },

    /**
        Returns this component as a string for logging purposes.
        @method toString
        @return {String} The component type name and name as string.
    */
    toString : function()
    {
        return this.id + " " + this.typeName + (this.name.length > 0 ? " name = " + this.name : "");
    },

    /**
        Returns if this components structure is dynamic.
        @method isDynamic
        @return {Boolean} True if dynamic, false otherwise (default base IComponent implementation returns false).
    */
    isDynamic : function()
    {
        return false;
    },

    /**
        Set parent entity for this component. This function is automatically called by Scene/Entity.
        @method setParent
        @param {Entity} entity Parent entity.
    */
    setParent : function(entity)
    {
        this.parentEntity = (entity !== undefined ? entity : null);
        this.parentScene = (entity !== undefined ? entity.parentScene : null);
    },

    /**
        Do not call this unless you are creating a component. Component implementations
        constructor should call this function and declare all network synchronized attributes.
        @method declareAttribute
        @param {Number} index Attribute index.
        @param {String} name Attribute name.
        @param {Object} value Initial attribute value.
        @param {Number} typeId Attribute type id, see {{#crossLink "core/scene/Attribute"}}Attribute{{/crossLink}}
        @todo then name given here is the attribute ID, not the human-readable name! Add human-readable name parameter also.
        static type properties.
    */
    declareAttribute : function(index, name, value, typeId)
    {
        var attribute = new Attribute(this, index, name, value, typeId);
        this.attributes[name] = attribute
        this.attributeIndexes[index] = name;
        this.attributeCount = Object.keys(this.attributes).length;

        // Do not define get/set methods for attribute names
        // that are already reserved by IComponent or the implementing
        // component. For example EC_Name "name" attribute.
        if (this[name] === undefined)
        {
            var getSet   = {};
            getSet[name] =
            {
                get : function ()      { return attribute.getClone(); },
                set : function (value) { attribute.set(value); }, /// @todo Implement 'value' type check here or inside IAttribute.set()?
                configurable : this.isDynamic()
                /// @todo See what should be set for 'enumerable'
            };
            Object.defineProperties(this, getSet);
        }
    },

    /**
        Sets a new value to an attribute. Replicates to the network depending on the change mode.
        @method setAttribute
        @param {String} name Attribute name.
        @param {Object} value New value.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setAttribute : function(name, value, change)
    {
        var attribute = this.attributes[name];
        if (attribute !== undefined)
            attribute.set(value, change);
    },

    /**
        Returns an attribute by ID. Does NOT return the attribute value, but the attribute object itself.
        @method attributeById
        @param {String} name Attribute name.
        @return {Attribute} Attribute or undefined if attribute does not exist.
    */
    attributeById : function(name)
    {
        if (name === undefined || name === null)
            return undefined;
        return this.attributes[name];
    },

    /**
        Alias for attributeById.
        @method attribute
        @param {String} name Attribute name.
        @return {Attribute} Attribute or undefined if attribute does not exist.
    */
    attribute : function(name) { return this.attributeById(name); },

    /// @deprecated use attributeById or attribute @todo remove asap.
    getAttribute : function(name) { return this.attributeById(name); },

    /**
        Returns if this component has an attribute.
        @method hasAttribute
        @param {String} name Attribute name.
        @return {Boolean}
    */
    hasAttribute : function(name)
    {
        return (this.attribute(name) !== undefined);
    },

    /**
        Returns attribute for a index.
        @method attributeByIndex
        @param {Number} index Attribute index.
        @return {Attribute} Attribute or undefined if attribute does not exist.
    */
    attributeByIndex : function(index)
    {
        return this.attributeById(this.attributeIndexes[index]);
    },

    /// @deprecated use attributeByIndex @todo remove asap.
    getAttributeByIndex : function(index) { return this.attributeByIndex(index); },

    /// @todo Document.
    deserializeFromBinary : function(ds)
    {
        if (this.attributeCount <= 0 && !this.isDynamic())
            return -1;

        // This is a full component update. Block attributeChanged() invocations!
        // The component implementation will get update() call when all attributes
        // are initialized and parent entity is set

        this.blockSignals = true;
        try
        {
            if (!this.isDynamic())
            {
                this._deserializeFromBinaryStatic(ds);
            }
            else
            {
                this._deserializeFromBinaryDynamic(ds);
            }
        }
        catch(e)
        {
            TundraSDK.framework.client.logError("[Attribute]: deserializeFromBinary exception: " + e);
        }
        this.blockSignals = false;
    },

    _deserializeFromBinaryStatic : function(ds)
    {
        for (var i=0; i<this.attributeCount; ++i)
        {
            var attribute = this.attributeByIndex(i);
            attribute.fromBinary(ds);
        }
    },

    _deserializeFromBinaryDynamic : function(ds)
    {
        // The code pushing this deserializer needs to set readLimitBytes
        // for this logic to know when to stop parsing. This is needed
        // if the deserializer has more data than just this dynamic component.
        if (ds.readLimitBytes !== undefined)
        {
            var bytesReadPre = ds.readBytes();
            while (ds.readBytes() - bytesReadPre < ds.readLimitBytes)
            {
                var index = ds.readU8();
                var typeId = ds.readU8();
                var name = ds.readStringU8();

                // Declare new attribute and read data
                this.declareAttribute(index, name, Attribute.defaultValueForType(typeId), typeId);
                this.deserializeAttributeFromBinary(index, ds);
            }
        }
        else
        {
            console.error("[Attribute]: DataDeserializer for parsing dynamic component structure does not have 'readLimitBytes' property. " +
                "This information is needed to know when to stop parsing.");
        }
    },

    deserializeAttributeFromBinary : function(index, ds)
    {
        if (this.attributeCount <= 0)
            return;

        var attribute = this.attributeByIndex(index);
        if (attribute !== undefined && attribute !== null)
            attribute.fromBinary(ds);
    },

    createAttributeFromBinary : function(index, ds)
    {
        if (!this.isDynamic())
        {
            TundraSDK.framework.client.logError("[IComponent]: createAttributeFromBinary called to a non dynamic component!", true);
            return;
        }

        var typeId = ds.readU8();
        var name = ds.readStringU8();

        // Declare new attribute and read data.
        this.declareAttribute(index, name, Attribute.defaultValueForType(typeId), typeId);
        this.deserializeAttributeFromBinary(index, ds);

        // Fire dynamic component attribute added event.
        if (typeof this._attributeAdded === "function")
            this._attributeAdded(index);
    },

    _attributeChanged : function(attribute, change)
    {
        /// @todo Construct message and send to network!
        //if (change === AttributeChange.Replicate)

        if (this.blockSignals)
            return;

        if (this.parentEntity == null || this.parentEntity.parentScene == null)
        {
            TundraSDK.framework.client.logError("[IComponent]: Cannot send attribute update event, parent entity or scene is null!", true);
            return;
        }
        if (attribute === undefined || attribute === null)
            return;

        this.attributeChanged(attribute.index, attribute.name, attribute.get());

        if (this.parentEntity !== null && this.parentEntity.parentScene !== null)
            this.parentEntity.parentScene._publishAttributeChanged(this.parentEntity, attribute);
    },

    /**
        Component implementations can override this function to receive information when a particular attribute has changed.

        @method attributeChanged
        @param {Number} index Attribute index.
        @param {String} name Attribute name.
        @param {Object} value New attribute value.
    */
    attributeChanged : function(index, name, value)
    {
        /// @note Virtual no-op function. Implementations can override.
    },
});

return IComponent;

}); // require js
