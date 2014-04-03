
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/scene/IComponent",
        "core/scene/AttributeChange",
        "core/network/EntityActionMessage"
    ], function(Class, TundraSDK, TundraLogging, IComponent, AttributeChange, EntityActionMessage) {

/**
    Entity that resides in a {{#crossLink "core/scene/Scene"}}{{/crossLink}}.
    @class Entity
    @constructor
*/
var Entity = Class.$extend(
{
    __init__ : function()
    {
        this.log = TundraLogging.getLogger("Entity");

        /**
            Entity id
            @property id
            @type Number
        */
        this.id = -1;
        /**
            Entity name. Will return the name attribute value from EC_Name if it exists, otherwise empty string.
            for the change to be replicated to the server via EC_Name.
            @property name
            @type String
        */
        /**
            Entity description. Will return the description attribute value from EC_Name if it exists, otherwise empty string.
            @property description
            @type String
        */
        /**
            Entity description. Will return the description attribute value from EC_Name if it exists, otherwise empty string.
            @property description
            @type String
        */
        // Hide 'name' and 'description' properties behind getters, no direct access.
        // Redirects ent.name = "something"; into the correct EC_Name functionality.
        Object.defineProperties(this, {
            name : {
                get : function ()      { return this.getName(); },
                set : function (value) { this.setName(value); }
            },
            description : {
                get : function ()      { return this.getDescription(); },
                set : function (value) { this.setDescription(value); }
            },
            group : {
                get : function ()      { return this.getGroup(); },
                set : function (value) { this.setGroup(value); }
            }
        });
        /**
            Is this entity replicated to the network.
            @property replicated
            @type Boolean
        */
        this.replicated = true;
        /**
            Is this entity local only.
            @property local
            @type Boolean
        */
        this.local = false;
        /**
            Is this entity temporary.
            @property temporary
            @type Boolean
        */
        this.temporary = false;
        /**
            Parent scene for this entity.
            @property parentScene
            @type Scene
        */
        this.parentScene = null;
        /**
            Components in this entity.
            To retrieve use {{#crossLink "Entity/getComponent:method"}}Entity.getComponent(){{/crossLink}} or a shorthand property in the entity, for example:
            <pre>
            if (entity.mesh != null)
                entity.mesh.something();</pre>
            @property components
            @type Array
        */
        this.components = [];
    },

    __classvars__ :
    {
        /**
            Entity action execution type
            @example
                {
                    "Local"   : 1,
                    "Server"  : 2,
                    "Peers"   : 4,
                    1 : "Local",
                    2 : "Server",
                    4 : "Peers"
                }
            @property ExecType
            @type {Object}
        */
        ExecType :
        {
            "Invalid" : 0,
            "Local"   : 1,
            "Server"  : 2,
            "Peers"   : 4,
            0 : "Invalid",
            1 : "Local",
            2 : "Server",
            4 : "Peers"
        },
    },

    _nextLocalComponentId : function()
    {
        for (var compId = 100000; compId < 200000; ++compId)
        {
            if (this.getComponentById(compId) == null)
                return compId;
        }
        return -1;
    },

    _nextReplicatedComponentId : function()
    {
        for (var compId = 1; compId < 100000; ++compId)
        {
            if (this.getComponentById(compId) == null)
                return compId;
        }
        return -1;
    },

    /**
        Set name to EC_Name component. Creates the component if necessary.
        To get this property use {{#crossLink "Entity/id:property"}}Entity.id{{/crossLink}}.
        @method setId
        @param {Number} id New id for this entity.
    */
    setId : function(newId)
    {
        this.id = newId;
    },

    /**
        Get name of this Entity from EC_Name component. Empty string if name is not set.
        @return {String}
    */
    getName : function()
    {
        var nameComp = this.getComponent("EC_Name");
        if (nameComp != null)
            return nameComp.getName();
        return "";
    },

    /**
        Set name to EC_Name component. Creates the component if necessary.
        See also {{#crossLink "Entity/name:property"}}name{{/crossLink}}.
        @method setName
        @param {String} name New name for this entity.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setName : function(newName, change)
    {
        var nameComp = this.getOrCreateComponent("EC_Name", undefined, change);
        nameComp.setName(newName, change);
    },

    /**
        Get description of this Entity from EC_Name component. Empty string if description is not set.
        @return {String}
    */
    getDescription : function()
    {
        var nameComp = this.getComponent("EC_Name");
        if (nameComp != null)
            return nameComp.getDescription();
        return "";
    },

    /**
        Set description to EC_Name component. Creates the component if necessary.
        To get this property use {{#crossLink "Entity/description:property"}}Entity.description{{/crossLink}}.
        @method setDescription
        @param {String} description New description for this entity.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setDescription : function(description, change)
    {
        var nameComp = this.getOrCreateComponent("EC_Name", undefined, change);
        nameComp.setDescription(description, change);
    },

    /**
        Get group of this Entity from EC_Name component. Empty string if group is not set.
        @return {String}
    */
    getGroup : function()
    {
        var nameComp = this.getComponent("EC_Name");
        if (nameComp != null)
            return nameComp.getGroup();
        return "";
    },

    /**
        Set group to EC_Name component. Creates the component if necessary.
        To get this property use {{#crossLink "Entity/description:property"}}Entity.description{{/crossLink}}.
        @method setGroup
        @param {String} group New group for this entity.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setGroup : function(group, change)
    {
        var nameComp = this.getOrCreateComponent("EC_Name", undefined, change);
        nameComp.setGroup(group, change);
    },

    /**
        Registers a callback for when this Entity is about to be removed. You can query components
        and other Entity data but changing any state has no effect as the entity will be removed.

        @method onAboutToBeRemoved
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAboutToBeRemoved : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onAboutToBeRemoved called on a non initialized entity!");
            return null;
        }

        return TundraSDK.framework.events.subscribe("Entity.AboutToBeRemoved." + this.id.toString(), context, callback);
    },

    /**
        Registers a callback for component created event originating from this entity.

            function onComponentCreated(entity, component)
            {
                // entity == Entity
                // component == IComponent or one of its implementations.
                console.log("Entity", entity.id, entity.name, "got a new component: " + component.typeName);
            }

            var entity = TundraSDK.framework.scene.entityById(12);
            if (entity != null)
                entity.onComponentCreated(null, onComponentCreated);

        @method onComponentCreated
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onComponentCreated : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onComponentCreated called on a non initialized entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishComponentCreated not in Entity!
        return TundraSDK.framework.events.subscribe("Scene.ComponentCreated." + this.id.toString(), context, callback);
    },

    /**
        Registers a callback for component removed event originating from this entity.

            function onComponentRemoved(entity, component)
            {
                // entity == Entity
                // component == IComponent or one of its implementations.
            }

            var entity = TundraSDK.framework.scene.entityById(12);
            if (entity != null)
                entity.onComponentRemoved(null, onComponentRemoved);

        @method onComponentRemoved
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onComponentRemoved : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onComponentRemoved called on a non initialized entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishComponentRemoved not in Entity!
        return TundraSDK.framework.events.subscribe("Scene.ComponentRemoved." + this.id.toString(), context, callback);
    },

    /**
        Registers a callback for entity actions originating from this entity. See {{#crossLink "Scene/EntityAction:event"}}{{/crossLink}} for event data.

            function onEntityAction(entityAction)
            {
                // entityAction == EntityAction
            }

            var entity = TundraSDK.framework.scene.entityById(12);
            if (entity != null)
                entity.onEntityAction(null, onEntityAction);

        @method onEntityAction
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onEntityAction : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onEntityAction called on a non initialized entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishEntityAction not in Entity!
        return TundraSDK.framework.events.subscribe("Scene.EntityAction." + this.id.toString(), context, callback);
    },

    reset : function()
    {
        // Publish that we are about to be removed.
        TundraSDK.framework.events.send("Entity.AboutToBeRemoved." + this.id.toString(), this);

        /// @todo Fix this stupid EC_Placeable always first stuff...
        var placeableId = null;
        var componentIds = [];
        for (var i = 0; i < this.components.length; i++)
        {
            if (this.components[i] != null && this.components[i].typeName !== "EC_Placeable")
                componentIds.push(this.components[i].id);
            else (this.components[i] != null && this.components[i].typeName === "EC_Placeable")
                placeableId = this.components[i].id;
        }
        for (var i = 0; i < componentIds.length; i++)
            this.removeComponent(componentIds[i]);
        if (placeableId != null)
            this.removeComponent(placeableId);
        this.components = [];

        TundraSDK.framework.events.remove("Entity.AboutToBeRemoved." + this.id.toString());
        TundraSDK.framework.events.remove("Scene.EntityAction." + this.id.toString());
    },

    /**
        Utility function for log prints. Converts entity's id and name to a string and returns it.
        @method toString
        @return {String}
    */
    toString : function()
    {
        return this.id + (this.name.length > 0 ? " name = " + this.name : "");
    },

    setParent : function(scene)
    {
        this.parentScene = scene;
    },

    update : function()
    {
        /// @todo Fix this stupid EC_Placeable always first stuff...

        // Update for all components. Update EC_Placeable
        // first as its scene node needs to be there.
        var myPlaceable = this.getComponent("EC_Placeable");
        if (myPlaceable != null)
            myPlaceable.update();
        for (var i=0; i<this.components.length; ++i)
        {
            if (this.components[i] == null)
                continue;
            if (myPlaceable == null || myPlaceable.id !== this.components[i].id)
                this.components[i]._update();
        }

        // Check if someone is missing us as the parent
        // This is very slow
        /*if (this.parentScene != null)
        {
            console.log("Checking parent for", this.toString());
            for (var i = this.parentScene.entities.length - 1; i >= 0; i--)
            {
                var ent = this.parentScene.entities[i];
                if (ent != null)
                {
                    var placeable = ent.getComponent("EC_Placeable");
                    var parentRef = (placeable != null ? placeable.attributes.parentRef.getClone() : undefined);
                    if (parentRef !== undefined && (parentRef === this.name || parentRef === this.id.toString()))
                        placeable.checkParent();
                }
            }
            console.log("--- done");
        }*/
    },

    /**
        Executes an entity action on this entity.
        @method exec
        @param {String|Number} execType Execution type can be a string or a number as long as it maps correctly to {{#crossLink "Entity/ExecType:property"}}Entity.ExecType{{/crossLink}}.
        @param {String} actionName Entity action name.
        @param {Array} [parameters] List of parameters. All elements are converted to string using .toString() on the object.
    */
    exec : function(execType, actionName, stringParameterList)
    {
        if (typeof(execType) === "string")
        {
            var lowerExecType = execType.toLowerCase();
            if (lowerExecType === "local")
                execType = 1;
            else if (lowerExecType === "server")
                execType = 2;
            else if (lowerExecType === "peers")
                execType = 4;
            else
            {
                this.log.error("exec(): Error cannot convert string exec type " + execType + " no a valid Entity.ExecType!");
                return;
            }
        }
        if (execType != 1 && execType != 2 && execType != 4)
        {
            this.log.error("exec(): Invalid Entity.ExecType input parameter: " + execType);
            return;
        }

        var entityAction = {};
        entityAction.entity = this;
        entityAction.executionType = execType;
        entityAction.name = actionName;
        entityAction.parameters = [];

        if (stringParameterList != null)
        {
            for (var i = 0; i < stringParameterList.length; i++)
                entityAction.parameters.push(stringParameterList[i].toString());
        }

        // Local execute
        if (entityAction.executionType === 1)
        {
            if (this.parentScene != null)
                this.parentScene._publishEntityAction(entityAction);
        }
        // Server/Peers
        else
        {
            if (TundraSDK.framework.client.websocket != null)
            {
                var message = new EntityActionMessage();
                message.serialize(entityAction);
                TundraSDK.framework.network.send(message);
            }
        }
    },

    /**
        Adds a component to this entity.
        @method addComponent
        @param {IComponent} component
        @return {Boolean} True if added successfully, false if component could not be found.
    */
    addComponent : function(component)
    {
        if (component === undefined || component === null)
            return false;

        for (var i = this.components.length - 1; i >= 0; i--)
        {
            if (this.components[i] != null && this.components[i].id === component.id)
                return false;
        }

        // Assign component to shorthand property
        // We don't want EC_Name to override the name of the entity. SetName must be used.
        var propertyName = IComponent.propertyName(component.typeName);
        if (component.typeName !== "" && propertyName !== "name")
        {
            this[propertyName] = component;
            if (propertyName !== propertyName.toLowerCase())
                this[propertyName.toLowerCase()] = component;
        }

        // Push to components list and update parent.
        this.components.push(component);
        component.setParent(this);

        // Update the component
        component._update();

        // Send event
        if (this.parentScene != null)
            this.parentScene._publishComponentCreated(this, component);

        return true;
    },

    /**
        Removes a component by id from this entity.
        @method removeComponent
        @param {Number} componentId Component id.
        @return {Boolean} True if removed, false if component could not be found.
    */
    removeComponent : function(componentId)
    {
        for (var i = this.components.length - 1; i >= 0; i--)
        {
            if (this.components[i] != null && this.components[i].id === componentId)
            {
                var comp = this.components[i];
                if (comp != null)
                {
                    // Send event
                    if (this.parentScene != null)
                        this.parentScene._publishComponentRemoved(this, comp);

                    // Reset component
                    comp._reset();
                }
                this.components.splice(i, 1);
                comp = null;
                return true;
            }
        }
        return false;
    },

    /**
        Removes a component by name from this entity.
        @method removeComponentByName
        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {Boolean} True if removed, false if component could not be found with give type/name.
    */
    removeComponentByName : function(typeName, name)
    {
        var findTypeName = IComponent.ensureComponentNamePrefix(typeName);
        for (var i = this.components.length - 1; i >= 0; i--)
        {
            if (this.components[i].typeName === findTypeName)
            {
                if (name != null && this.components[i].name !== name)
                    continue;

                var comp = this.components[i];
                if (comp != null)
                {
                    // Send event
                    TundraSDK.framework.events.send("Scene.ComponentRemoved." + this.id.toString(), this, comp);

                    comp._reset();
                }
                this.components.splice(i, 1);
                comp = null;
                return true;
            }
        }
        return false;
    },

    /**
        Returns a component by type name. Components also have a shorthand property in the entity, for example:
        <pre>
            if (entity.mesh != null)
                entity.mesh.something();</pre>
        @method component
        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {IComponent|null} The component if found, otherwise null.
    */
    component : function(typeName, name)
    {
        if (name === undefined)
            name = null;
        if (typeof typeName !== "string")
        {
            this.log.error("getComponent called with non-string type name for Entity: " + this.toString());
            return null;
        }

        var findTypeName = IComponent.ensureComponentNamePrefix(typeName);
        for (var i = this.components.length - 1; i >= 0; i--)
        {
            if (this.components[i] != null && this.components[i].typeName === findTypeName)
            {
                if (name == null)
                    return this.components[i];
                else if (this.components[i].name === name)
                    return this.components[i];
            }
        }
        return null;
    },

    /// @deprecated use component @todo remove asap.
    getComponent : function(typeName, name) { return this.component(typeName, name); },

    /**
        Returns a component by id.
        @method componentById
        @param {Number} componentId Component id.
        @return {IComponent|null} The component if found, otherwise null.
    */
    componentById : function(componentId)
    {
        for (var i = this.components.length - 1; i >= 0; i--)
        {
            if (this.components[i] != null && this.components[i].id === componentId)
                return this.components[i];
        }
        return null;
    },

    /// @deprecated use componentById @todo remove asap.
    getComponentById : function(componentId) { return this.componentById(componentId); },

    /**
        Creates a local component by given type name and name.
        @method createLocalComponent
        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {IComponent|null} The component if created, otherwise null.
    */
    createLocalComponent : function(typeName, name)
    {
        if (name === undefined)
            name = null;
        return this.createComponent(typeName, name, AttributeChange.LocalOnly);
    },

    /**
        Creates a component by given type name and name.
        This function performs no check if this component already exists!
        Use getOrCreateComponent or getComponent for checking.
        @method createComponent
        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode. Note: Only AttributeChange.LocalOnly is supported at the moment!
        @return {IComponent|null} The component if created, otherwise null.
    */
    createComponent : function(typeName, name, change)
    {
        if (this.parentScene == null)
        {
            this.log.error("Cannot create component, parent scene is null for Entity: " + this.toString());
            return null;
        }

        if (change === undefined || change === null)
            change = AttributeChange.Default;
        if (typeof change !== "number")
        {
            this.log.warn("createComponent called with non AttributeChange.Type change mode, defaulting to AttributeChange.Default.");
            change = AttributeChange.Default;
        }
        if (change !== AttributeChange.LocalOnly)
        {
            /// @todo Read this.local to pick correct Default type once client -> server networking is implemented
            if (change === AttributeChange.Default)
                change = AttributeChange.LocalOnly;
            else
            {
                this.log.warn("createComponent called with localOnly != AttributeChange.LocalOnly. Creating replicated components is not supported at the moment, defaulting to LocalOnly.");
                change = AttributeChange.LocalOnly;
            }
        }

        var createTypeName = IComponent.ensureComponentNamePrefix(typeName);
        var component = this.parentScene.createComponent(createTypeName, name);
        if (component != null)
        {
            if (change == AttributeChange.LocalOnly || change == AttributeChange.Disconnected || change == AttributeChange.Default)
                component.replicated = false;
            else
                component.replicated = true;
            component.local = !component.replicated;
            component.id = (component.replicated ? this._nextReplicatedComponentId() : this._nextLocalComponentId());
        }

        this.addComponent(component);
        return component;
    },

    /**
        Returns or creates a local component by given type name and name.
        If component with the type is found but the name does not match, a new component is created.
        @method getOrCreateLocalComponent
        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".

        @return {IComponent|null} The component if found or created, otherwise null.
    */
    getOrCreateLocalComponent : function(typeName, name)
    {
        if (name === undefined)
            name = null;
        return this.getOrCreateComponent(typeName, name, AttributeChange.LocalOnly);
    },

    /**
        Returns or creates a component by given type name and name.
        If component with the type is found but the name does not match, a new component is created.
        @method getOrCreateComponent
        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode, in case component has to be created. Note: Only AttributeChange.LocalOnly is supported at the moment!
        @return {IComponent|null} The component if found or created, otherwise null.
    */
    getOrCreateComponent : function(typeName, name, change)
    {
        if (name === undefined)
            name = null;
        if (change === undefined)
            change = null;

        var component = this.getComponent(typeName, name);
        if (component == null)
            component = this.createComponent(typeName, name, change);
        return component
    }
});

return Entity;

}); // require js
