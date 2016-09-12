
define([
        "core/framework/Tundra",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(Tundra, Scene, IComponent, Attribute) {

var EC_Name = IComponent.$extend(
/** @lends EC_Name.prototype */
{
    /**
        Name component provides functionality for Entity indenfication, description and grouping.

        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {string} name ""
        */
        this.declareAttribute(0, "name", "", Attribute.String, "name");
        /**
            @ec_attribute {string} description ""
        */
        this.declareAttribute(1, "description", "", Attribute.String, "description");
        /**
            @ec_attribute {string} group ""
        */
        this.declareAttribute(2, "group", "", Attribute.String);
    },

    __classvars__ :
    {
        TypeId   : 26,
        TypeName : "Name"
    },

    /**
        Event that is fired every time the Entitys name changes.

        @subscribes
    */
    onNameChanged : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onNameChanged, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Name.NameChanged." + this.parentEntity.id + "." + this.id, context, callback);
    },

    /**
        Set name.

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
                Tundra.events.send("EC_Name.NameChanged." + this.parentEntity.id + "." + this.id, name, oldName);

            // Inform scene about the name change. This will update all parenting to be correct.
            if (this.hasParentScene())
                this.parentScene._onEntityNameChanged(this.parentEntity, name, oldName);
        }
    },

    /**
        Get name.

        @return {String}
    */
    getName : function()
    {
        return this.attributes.name.value;
    },

    /**
        Set description.

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

        @return {String}
    */
    getDescription : function()
    {
        return this.attributes.description.getClone();
    },

    /**
        Set group.

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

Scene.registerComponent(EC_Name);

return EC_Name;

}); // require js
