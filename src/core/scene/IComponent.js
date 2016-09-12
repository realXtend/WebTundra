
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/data/ITundraSerializer",
        "core/framework/TundraLogging",
        "core/scene/Attribute",
        "core/scene/AttributeChange",
    ], function(Class, Tundra, ITundraSerializer, TundraLogging, Attribute, AttributeChange) {

var IComponent = ITundraSerializer.$extend(
/** @lends IComponent.prototype */
{
    /**
        IComponent is the interface all component implementations will extend. Provides a set of utility functions for all components.

        Components are not created directly. Use {@link Entity#createComponent} to create a component.

        Handles automatic network deserialization for declared components. Implementations can override
        {@link IComponent#reset}, {@link IComponent#update} and {@link IComponent#attributeChanged}.

        @constructs
        @extends ITundraSerializer
        @param {Number} id Component id.
        @param {Number} typeId Component type id.
        @param {String} typeName Component type name.
        @param {String} name Component name.
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super();
        /**
            Component's logger instance, with channel name as the component type name without EC_ prefix.
            @var {TundraLogger}
        */
        this.log = TundraLogging.getLogger(IComponent.ensureComponentNameWithoutPrefix(typeName));

        /**
            Component id.
            @var {Number}
        */
        this.id = id;
        /**
            Component type id.
            @var {Number}
        */
        this.typeId = typeId;
        /**
            Component type name.
            @var {String}
        */
        this.typeName = IComponent.ensureComponentNameWithoutPrefix(typeName);
        /**
            Component name.
            @var {String}
        */
        this.name = name;
        /**
            Is this component replicated over the network.
            @var {Boolean}
            @default true
        */
        this.replicated = true;
        /**
            Is this component local. Same as !comp.replicated.
            @var {Boolean}
            @default false
        */
        this.local = false;
        /**
            Is this component temporary, meaning it won't be serialized when scene is stored to disk.
            @var {Boolean}
            @default false
        */
        this.temporary = false;
        /**
            Parent entity.
            @var {Entity}
        */
        this.parentEntity = null;
        /**
            Parent scene.
            @var {Scene}
        */
        this.parentScene = null;
        /**
            Flag for if this component has a real implementation or is it just
            the IComponent base implementation.
            @var {Boolean}
            @default false
        */
        this.notImplemented = false;
        /**
            Attributes for this component.
            @var {Array.<Attribute>}
            * @example
            * // There are three ways of accessing an attribute
            * var value = comp.myAttributeName.get();
            * value = comp.attribute("myAttributeName").get();
            * value = comp.attributeByIndex(index).get();
        */
        this.attributes = {};
        /**
            Count of attributes in this component.
            @var {Number}
        */
        this.attributeCount = 0;

        this.attributeIndexes = {}; // Don't document
        this.blockSignals = false;  // Don't document
        this.oldTxmlFormatAttrNames = {};
    },

    __classvars__ :
    {
        /**
            Ensures a typename <b>has</b> "EC_" prefix.

            @static
            @param {String} typeName
            @return {String}
        */
        ensureComponentNamePrefix : function(typeName)
        {
            return (typeName.substring(0,3).toLowerCase() === "ec_" ? typeName : "EC_" + typeName);
        },

        /**
            Ensures a typename does <b>not</b> have "EC_" prefix.

            @static
            @param {String} typeName
            @return {String}
        */
        ensureComponentNameWithoutPrefix : function(typeName)
        {
            return (typeName.substring(0,3).toLowerCase() === "ec_" ? typeName.substr(3) : typeName);
        },

        /**
            Converts a typename to valid property name (camel-case).
            * @example
            * IComponent.propertyName("EC_AnimationController") // === "animationController"

            @static
            @param {String} typeName
            @return {String}
        */
        propertyName : function(typeName)
        {
            typeName = IComponent.ensureComponentNameWithoutPrefix(typeName);
            return typeName.substring(0,1).toLowerCase() + typeName.substring(1);
        },
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

        @return {Boolean}
    */
    hasParentEntity : function()
    {
        return (this.parentEntity !== null);
    },

    /**
        Returns if this component has a parent scene.

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

    /**
        Override in component implementations.
    */
    update : function()
    {
        /// @note Virtual no-op function. Implementations can override.
    },

    /**
        Registers a callback for attribute changed event originating from this component.

        * @example
        * function onAttributeChanged(entity, component, attributeIndex, attributeName, attributeValue)
        * {
        *     // entity == Entity
        *     // component == IComponent or one of its implementations.
        *     // attributeIndex == Attribute index that changed
        *     // attributeName == Attribute name that changed
        *     // attributeValue == New value
        *     console.log("Entity", entity.id, entity.name, "components", component.typeName, "attribute", attributeName, "changed to:", attributeValue.toString());
        * }
        *
        * var entity = Tundra.scene.entityById(12);
        * if (entity != null && entity.mesh != null)
        *     entity.mesh.onAttributeChanged(null, onAttributeChanged);

        @subscribes
    */
    onAttributeChanged : function(context, callback)
    {
        if (!this.parentEntity || this.parentEntity.id <= 0)
        {
            console.log("ERROR: Entity.onAttributeChanged called on a non initialized component! No valid parent entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishAttributeChanged not in Entity!
        return Tundra.events.subscribe("Scene.AttributeChanged." + this.parentEntity.id.toString() + "." + this.id.toString(), context, callback);
    },

    /**
        Serializes this component and its attributes to JSON.
        @param {boolean} [serializeTemporary=false] If true, it will also serialize temporary components, if such case is needed
        @return {object} - The component as JSON.
        @example
        * var componentObject = someComponent.serializeToObject();
        * // The object is described as follows:
        * // {
        * //      id            : {number}, The component ID
        * //      typeId        : {number}, The type ID of the component
        * //      typeName      : {string}, The type name of the component
        * //      name          : {string | undefined}, The name of the component, or undefined if not named
        * //      temp          : {boolean | undefined}, true if this component is temporary, undefined if not serialized
        * //      sync          : {boolean}, If the component is replicated to the server
        * //      attributes    : {Array<Attribute>}, A list of all attributes which are also serialized into JSONs
        * // }
    */
    serializeToObject : function(serializeTemporary)
    {
        var object = {};
        object.id = this.id;
        object.typeId = this.typeId;
        object.typeName = this.typeName;
        object.sync = this.replicated;
        object.attributes = [];
        object.name = this.name || undefined;
        object.temp = (serializeTemporary && this.temporary) || undefined;

        for (var i in this.attributes)
            object.attributes.push(this.attributes[i].serializeToObject());

        return object;
    },

    /**
        Serializes this component to the TXML format.
        @param {boolean} [serializeTemporary=false] If true, it will also serialize temporary components, if such case is needed
        @return {Node} - The component in XML
    */
    serializeToXml : function(serializeTemporary)
    {
        serializeTemporary = serializeTemporary || false;
        var componentElement = document.createElement("component");
        componentElement.setAttribute("type", this.typeName);
        componentElement.setAttribute("typeId", this.typeId);
        componentElement.setAttribute("sync", this.replicated);
        if (this.name.length > 0)
            componentElement.setAttribute("name", this.name);
        if (!this.temporary || (this.temporary && serializeTemporary))
            componentElement.setAttribute("temp", this.temporary);
        for (var i in this.attributes)
            componentElement.appendChild(this.attributes[i].serializeToXml());

        return componentElement;
    },

    /**
        Deserializes the component from JSON
        @param {object} obj The object to be deserialized
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromObject : function(obj, change)
    {
        change = change || AttributeChange.Default;
        for (var i = 0; i < obj.attributes.length; ++i)
        {
            var attributeObject = obj.attributes[i];
            var id = attributeObject.id;
            if (this.isDynamic())
            {
                var type = attributeObject.type;
                var typeId = Attribute.toTypeId(type);
                if (!typeId)
                {
                    this.log.warn("[deserializeFromObject]: Unknown type name: ", type, "skipping attribute creation!");
                    return;
                }

                if (this.createAttribute(typeId, id))
                    this.attributes[id].deserializeFromObject(attributeObject, change);
                else
                    this.log.warn("[deserializeFromObject]: Could not create attribute named " + id + " with type " + type + ", skipping");
            }
            else
            {
                if (this.attributes[id])
                    this.attributes[id].deserializeFromObject(attributeObject, change);
                else
                    this.log.warn("[deserializeFromObject]: Skipping undeclared attribute:", id);
            }
        }
    },

    /**
        Deserializes the component from a XML node
        @param {Node} componentElement The XML node to be parsed
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromXml : function(componentElement, change)
    {
        change = change || AttributeChange.Default;
        for (var i = 0; i < componentElement.childNodes.length; ++i)
        {
            var element = componentElement.childNodes[i];
            if (element.nodeName != "attribute")
                continue;

            var id = element.getAttribute("id");
            var type = element.getAttribute("type");
            var oldTxmlFormatName = element.getAttribute("name");
            id = id || this.oldTxmlFormatAttrNames[oldTxmlFormatName];

            if (this.isDynamic())
            {
                var typeId = Attribute.toTypeId(type);
                if (!typeId)
                {
                    this.log.warn("[deserializeFromXml]: Unknown type name: ", type, "skipping attribute creation!");
                    continue;
                }

                if (this.createAttribute(typeId, id))
                    this.attributes[id].deserializeFromXml(element, change);
            }
            else
            {
                if (this.attributes[id])
                    this.attributes[id].deserializeFromXml(element, change);
                else
                    this.log.warn("[deserializeFromXml]: Skipping undeclared attribute:", id);
            }
        }
    },

    /**
        Returns this component as a string for logging purposes.

        @return {String} The component type name and name as string.
    */
    toString : function()
    {
        return this.id + " " + this.typeName + (this.name.length > 0 ? " name = " + this.name : "");
    },

    /**
        Returns if this component's structure is dynamic.

        @return {Boolean} True if dynamic, false otherwise (default base IComponent implementation returns false).
    */
    isDynamic : function()
    {
        return false;
    },

    /**
        Set parent entity for this component. This function is automatically called by Scene/Entity.

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

        @param {Number} index Attribute index.
        @param {String} name Attribute name.
        @param {Object} value Initial attribute value.
        @param {Number} typeId Attribute type id, see {{#crossLink "core/scene/Attribute"}}Attribute{{/crossLink}}
        @todo then name given here is the attribute ID, not the human-readable name! Add human-readable name parameter also.
        static type properties.
    */
    declareAttribute : function(index, name, value, typeId, oldTxmlFormatName)
    {
        var attribute = new Attribute(this, index, name, value, typeId);
        this.attributes[name] = attribute;
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

        if (typeof oldTxmlFormatName === "string" && oldTxmlFormatName != "")
            this.oldTxmlFormatAttrNames[oldTxmlFormatName] = name;
    },

    /**
        Sets a new value to an attribute. Replicates to the network depending on the change mode.

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

        @param {String} name Attribute name.
        @return {Attribute} Attribute or undefined if attribute does not exist.
    */
    attribute : function(name) { return this.attributeById(name); },

    /// @deprecated use attributeById or attribute @todo remove asap.
    getAttribute : function(name) { return this.attributeById(name); },

    /**
        Returns if this component has an attribute.

        @param {String} name Attribute name.
        @return {Boolean}
    */
    hasAttribute : function(name)
    {
        return (this.attribute(name) !== undefined);
    },

    /**
        Returns attribute for a index.

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
            Tundra.client.logError("[Attribute]: deserializeFromBinary exception: " + e);
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
            Tundra.client.logError("[IComponent]: createAttributeFromBinary called to a non dynamic component!", true);
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

        if (!this.parentEntity || !this.parentEntity.parentScene)
        {
            Tundra.client.logError("[IComponent]: Cannot send attribute update event, parent entity or scene is null!", true);
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
