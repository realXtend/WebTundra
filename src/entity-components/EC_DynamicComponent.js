
define([
        "core/framework/TundraSDK",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(TundraSDK, Scene, IComponent, Attribute) {

/**
    DynamicComponent component that differs from static components in that it's attributes can be
    added, manipulated and removed during runtime.

    @class EC_DynamicComponent
    @extends IComponent
    @constructor
*/
var EC_DynamicComponent = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);
    },

    /**
        DynamicComponent always returns true as its structure is not known beforehand.
        This overrides the IComponent.isDynamic function.

        @method isDynamic
        @return {Boolean} Always true for DynamicComponent.
    */
    isDynamic : function()
    {
        return true;
    },

    /**
        Check if an attribute exists.

        @method hasAttribute
        @param {String} attributeName Name of the attribute.
        @return {Boolean} If this attribute exists.
    */
    hasAttribute : function(attributeName)
    {
        var attr = this.getAttribute(attributeName);
        return (attr !== undefined && attr !== null);
    },

    /**
        Creates a new attribute. <b>Note:</b> Does not replicate to the server at this moment!

        @method createAttribute
        @param {Number|String} typeNameOrId Type name or id of the attribute.
        @param {String} attributeName Name of the attribute.
        @return {Boolean} If this attribute was created.
    */
    createAttribute : function(typeId, name)
    {
        if (typeof typeId === "string")
            typeId = Attribute.toTypeId(typeId);
        if (typeId === undefined || typeId === null)
        {
            this.log.error("createAttribute: received invalid type name or id parameter.");
            return false;
        }
        if (this.hasAttribute(name))
        {
            this.log.error("createAttribute: attribute with name '" + name + "' already exists!");
            return false;
        }

        // Find a free index
        var index = 0;
        while (index < 10000)
        {
            if (this.attributeIndexes[index] === undefined)
                break;
            index++;
        }

        this.declareAttribute(index, name, Attribute.defaultValueForType(typeId), typeId);
        this._attributeAdded(index);
        return true;
    },

    /**
        Removes a existing attribute. <b>Note:</b> Does not replicate to the server at this moment!

        @method removeAttribute
        @param {Number|String} id Attribute name or index.
        @return {Boolean} If this attribute was removed.
    */
    removeAttribute : function(id)
    {
        try
        {
            var attributeName = undefined;
            var attributeIndex = undefined;
            if (typeof id === "string")
            {
                attributeName = id;
            }
            else if (typeof id === "number")
            {
                attributeIndex = id;
                attributeName = this.attributeIndexes[id];
            }

            if (attributeName === undefined || attributeName === null)
                return false;
            var attribute = this.attributes[attributeName];
            if (attribute === undefined || attribute === null)
                return false;

            if (attributeIndex === undefined)
                attributeIndex = attribute.index;

            this._attributeAboutToBeRemoved(attribute);

            if (this[attributeName] !== undefined)
            {
                var getSet   = {};
                getSet[attributeName] = 
                {
                    get : function ()      { return undefined; },
                    set : function (value) { },
                    configurable : true
                };
                Object.defineProperties(this, getSet);
            }

            attribute._reset();
            attribute = null;

            delete this.attributes[attributeName];
            delete this.attributeIndexes[attributeIndex];
            this.attributes[attributeName] = undefined;
            this.attributeIndexes[attributeIndex] = undefined;
            return true;
        }
        catch (e)
        {
            console.error("EC_DynamicComponent.removeAttribute:", e);
        }
        return false;
    },

    /**
        Registers a callback for when new attribute is created.
        @example
            ent.dynamicComponent.onAttributeAdded(null, function(component, attribute) {
                console.log("Attribute added", attribute.name, attribute.typeName, attribute.get().toString(),
                    "from component", component.id, component.name);
            });

        @method onAttributeAdded
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAttributeAdded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onAttributeAdded, no parent entity!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_DynamicComponent.AttributeAdded." + this.parentEntity.id + "." + this.id, context, callback);
    },

    _attributeAdded : function(attribute)
    {
        if (typeof attribute === "number")
            attribute = this.attributeByIndex(attribute);
        if (attribute !== undefined && attribute !== null && this.hasParentEntity())
        {
            TundraSDK.framework.events.send("EC_DynamicComponent.AttributeAdded." + this.parentEntity.id + "." + this.id,
                this, attribute);
        }
    },

    /**
        Registers a callback for when an existing attribute is about to be removed. Try to avoid querying the actual attribute object from the component.
        @example
            ent.dynamicComponent.onAttributeAboutToBeRemoved(null, function(component, attributeIndex, attributeName) {
                console.log("Attribute about to be removed", attributeIndex, attributeName, "from component", component.id, component.name);
            });

        @method onAttributeAboutToBeRemoved
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAttributeAboutToBeRemoved : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onAttributeAboutToBeRemoved, no parent entity!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_DynamicComponent.AttributeAboutToBeRemoved." + this.parentEntity.id + "." + this.id, context, callback);
    },

    _attributeAboutToBeRemoved : function(attribute)
    {
        if (attribute !== undefined && attribute !== null && this.hasParentEntity())
        {
            TundraSDK.framework.events.send("EC_DynamicComponent.AttributeAboutToBeRemoved." + this.parentEntity.id + "." + this.id,
                this, attribute.index, attribute.name);
        }
    }
});

Scene.registerComponent(25, "EC_DynamicComponent", EC_DynamicComponent);

return EC_DynamicComponent;

}); // require js
