
define([
        "core/framework/TundraSDK",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(TundraSDK, Scene, IComponent, Attribute) {

/**
    Name component provides functionality for Entity indenfication, description and grouping.

    @class EC_Name
    @extends IComponent
    @constructor
*/
var EC_Name = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property name (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "name", "", Attribute.String);
        /**
            @property description (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "description", "", Attribute.String);
        /**
            @property group (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "group", "", Attribute.String);
    },

    /**
        Event that is fired every time the Entitys name changes.

        @method onNameChanged
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onNameChanged : function()
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onNameChanged, parent entity not set!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_Name.NameChanged." + this.parentEntity.id + "." + this.id, context, callback);
    },

    /**
        Set name.
        @method setName
        @param {String} name New name.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setName : function(name, change)
    {
        if (name !== this.attributes.name.get())
        {
            var oldName = this.attributes.name.getClone();
            this.attributes.name.set(name, change);

            // Send generic event about the name change
            if (this.hasParentEntity())
                TundraSDK.framework.events.send("EC_Name.NameChanged." + this.parentEntity.id + "." + this.id, name, oldName);

            // Inform scene about the name change. This will update all parenting to be correct.
            if (this.hasParentScene())
                this.parentScene._onEntityNameChanged(this.parentEntity, name, oldName);
        }
    },

    /**
        Get name.
        @method getName
        @return {String}
    */
    getName : function()
    {
        return this.attributes.name.getClone();
    },

    /**
        Set description.
        @method setDescription
        @param {String} description New description.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setDescription : function(description, change)
    {
        if (description !== this.attributes.description.get())
            this.attributes.description.set(description, change);
    },

    /**
        Get description.
        @method getDescription
        @return {String}
    */
    getDescription : function()
    {
        return this.attributes.description.getClone();
    },

    /**
        Set group.
        @method setGroup
        @param {String} group New group.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setGroup : function(group, change)
    {
        if (group !== this.attributes.group.get())
            this.attributes.group.set(group, change);
    },

    /**
        Get group.
        @method getGroup
        @return {String}
    */
    getGroup : function()
    {
        return this.attributes.group.getClone();
    },

    update : function()
    {
    },

    attributeChanged : function(index, name, value)
    {
    }
});

Scene.registerComponent(26, "EC_Name", EC_Name);

return EC_Name;

}); // require js
