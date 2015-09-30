
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/data/ITundraSerializer",
        "core/framework/TundraLogging",
        "core/scene/IComponent",
        "core/scene/AttributeChange",
        "core/scene/EntityAction",
        "core/scene/UniqueIdGenerator",
        "core/network/EntityActionMessage"
    ], function(Class, Tundra, ITundraSerializer, TundraLogging, IComponent, AttributeChange,
        EntityAction, UniqueIdGenerator, EntityActionMessage)
{

var Entity = ITundraSerializer.$extend(
/** @lends Entity.prototype */
{
    /**
        An entity is a collection of components that define the data and the functionality of the entity. Entity can have multiple components of the same type as long as the component names are unique.
        Entities should not be directly created, instead use {@link Scene#createEntity} or {@link Scene#createLocalEntity}

        Each different component type that is added to an entity will be available as a dynamic property of the entity. The property is named in the following following fashion: the "EC_" prefix of the component type name (if it is there) cut off and the type name is converted to lower camel case format, for example "EC_EnvironmentLight" -> "environmentLight". This allows the scripter to access the component using the following convenient syntax:
        If there are several components of the same type, only the firstly component is available as a dynamic property. If you want to access other components of the same type in the entity, you should use the {@link Entity#component} method instead.
        When a component is removed from an entity, the dynamic property association is invalidated, i.e. the value of the dynamic property will be `null` / `undefined`.

        @summary Represents a single object in a Scene.
        @constructs
        @extends ITundraSerializer

        * @example
        * entity.environmentLight.ambientColor = new Color(0.33, 0.33, 0.33, 1);
        * @example
        * entity.component("EnvironmentLight", "MySpecialLight").ambientColor = new Color(0.33, 0.33, 0.33, 1);
    */
    __init__ : function()
    {
        this.$super();
        this.log = TundraLogging.getLogger("Entity");
        this.componentIdGenerator = new UniqueIdGenerator();

        /**
            Entity id
            @var {Number}
        */
        this.id = -1;

        // Hide 'name' and 'description' properties behind getters, no direct access.
        // Redirects ent.name = "something"; into the correct EC_Name functionality.
        Object.defineProperties(this, {
            /**
                Entity name. Will return the name attribute value from EC_Name if it exists, otherwise empty string.
                for the change to be replicated to the server via EC_Name.
                @var {String}
                @memberof Entity.prototype
            */
            name : {
                get : function ()      { return this.getName(); },
                set : function (value) { this.setName(value); }
            },
            /**
                Entity description. Will return the description attribute value from EC_Name if it exists, otherwise empty string.
                @var {String}
                @memberof Entity.prototype
            */
            description : {
                get : function ()      { return this.getDescription(); },
                set : function (value) { this.setDescription(value); }
            },
            /**
                Entity group. Will return the group attribute value from EC_Name if it exists, otherwise empty string.
                @var {String}
                @memberof Entity.prototype
            */
            group : {
                get : function ()      { return this.getGroup(); },
                set : function (value) { this.setGroup(value); }
            }
        });

        /**
            Is this entity replicated to the network.
            @var {Boolean}
            @default true
        */
        this.replicated = true;
        /**
            Is this entity local only.
            @var {Boolean}
            @default false
        */
        this.local = false;
        /**
            Is this entity temporary.
            @var {Boolean}
            @default false
        */
        this.temporary = false;
        /**
            Parent Scene.
            @var {Scene}
        */
        this.parentScene = null;
        /**
            Parent Entity.
            @var {Entity}
        */
        this.parentEntity = null;
        /**
            Child Entities
            @var {Array.<Entity>}
        */
        this.children = [];
        /**
            Components in this entity. To retrieve use {@link Entity#component} or a shorthand property in the entity.
            @var {Array.<IComponent>}
            * @example
            * if (entity.mesh != null)
            *     entity.mesh.something();
        */
        this.components = [];
    },

    __classvars__ :
    {
        // @todo Obsolete/deprecated/remove, do not use; we already have these in EntityAction.
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
        return this.componentIdGenerator.allocateLocal();
    },

    _nextReplicatedComponentId : function()
    {
        return this.componentIdGenerator.allocateReplicated();
    },

    /* ENTITY LEVEL PARENTING

       API from https://github.com/realXtend/WebTundra/blob/master/src/scene/Entity.js
       that is presumably based on the C++ API (both by Lasse).

       @note This is not yet implemented on the network level.
       We are mocking up the Entity parenting API,
       so that the API can be used in applications. We can later make it
       proper entity level parenting once server side support is there.
    */

    /**
        Create new child Entity.

        @param {Number} [id]
        @param {AttributeChange} [change]
        @return {Entity} child
    */
    createChild: function(id, change)
    {
        if (!this.parentScene)
        {
            this.log.error("createChild: Parent scene null");
            return undefined;
        }
        var child = this.parentScene.createEntity(id, [], change);
        if (child)
            child.setParent(this, change);
        return child;
    },

    /**
        Add child Entity.

        @param {Entity} child
        @param {AttributeChange} [change]
        @return {Boolean}
    */
    addChild: function(child, change)
    {
        if (!child)
            return false;
        return child.setParent(this, change);
    },

    /**
        Detached child from this Entity. Does not remove the Entity from Scene.

        @param {Entity} child
        @param {AttributeChange} [change]
        @return {Boolean}
    */
    detachChild: function(child, change)
    {
        if (!child)
            return false;

        if (!this.isChild(child))
        {
            this.log.warn("detachChild: 'child' not parented to this Entity (" + this.toString() + "), cannot detach.");
            return false;
        }
        return child.setParent(null, change);
    },

    /**
        Remove child Entity. Removed child from the underlying Scene.

        @param {Entity} child
        @param {AttributeChange} [change]
        @return {Boolean}
    */
    removeChild: function(child, change)
    {
        if (!child)
            return false;

        if (!this.isChild(child))
        {
            this.log.warn("detachChild: 'child' not parented to this Entity (" + this.toString() + "), cannot detach.");
            return false;
        }

        // Simply remove from the scene, which will also set the child's parent to null
        if (this.parentScene)
            this.parentScene.removeEntity(child.id, change);
        else
            console.log("Null parent scene, can not remove child entity");

        return true;
    },

    /**
        Removes all child Entities. Children are removed from the underlying Scene.

        @param {AttributeChange} [change]
        @return {Boolean}
    */
    removeAllChildren: function(change)
    {
        if (this.children.length === 0)
            return true;
        while (this.children.length > 0)
        {
            // If false is returned dont stay in a infinite loop
            if (!this.removeChild(this.children[this.children.length - 1], change))
                return false;
        }
        return true;
    },

    // Internal
    setParentScene : function(scene)
    {
        this.parentScene = scene;
    },

    /**
        Clear current parent Entity.

        @param {AttributeChange} [change]
        @return {Boolean}
    */
    clearParent : function(change)
    {
        if (this.hasParent())
            return this.setParent(null, change);
        return true;
    },

    /**
        Set parent Entity.

        @param {Entity} [newParent] - If null/undefined, current parent will be removed, see {@link Entity#clearParent}.
        @param {AttributeChange} [change]
        @return {Boolean}
    */
    setParent: function(newParent, change)
    {
        // @note newParent can be null/undefined
        if (newParent && this.id === newParent.id)
        {
            this.log.error("setParent: Attempted to parent Entity to self");
            return false;
        }

        // Already parented
        if (this.isParent(newParent))
            return true;

        // Check for and prevent cyclic assignment
        var parentCheck = newParent;
        while (parentCheck)
        {
            if (parentCheck.id == this.id)
            {
                this.log.error("setParent: Attempted to cyclically parent an Entity");
                return false;
            }
            parentCheck = parentCheck.parentEntity;
        }
        // Remove from old parent's child vector
        var index = (this.parentEntity ? this.parentEntity.childIndex(this) : -1);
        if (index !== -1)
            this.parentEntity.children.splice(index, 1);

        // Add new child
        if (newParent)
            newParent.children.push(this);

        // Already unparented, don't continue as it will spam events with the same state.
        if (!newParent && !this.hasParent())
            return;
        this.parentEntity = newParent;

        // Send events
        if (!this.parentScene && newParent && newParent.parentScene)
            this.setParentScene(newParent.parentScene);
        if (this.parentScene)
            this.parentScene._publishParentChanged(newParent, this, change);
        else
            this.log.warn("setParent: Parent scene not set, cannot fire events");

        return true;
    },

    hasParent : function()
    {
        return (this.parentEntity !== undefined && this.parentEntity !== null);
    },

    isParent : function(ent)
    {
        return (this.hasParent() && ent && this.parentEntity.id === ent.id);
    },

    isChild : function(ent)
    {
        return (ent && ent.isParent(this));
    },

    childIndex : function(ent)
    {
        if (!ent)
            return -1;

        for (var i = 0; i < this.children.length; i++)
        {
            if (this.children[i].id === ent.id)
                return i;
        }
        return -1;
    },

    /**
        Registers a callback for when this Entitys parent changed.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onParentChanged : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onParentChanged called on a non initialized entity!");
            return null;
        }
        return Tundra.events.subscribe("Entity.Parent.Changed." + this.id.toString(), context, callback);
    },

    /**
        Registers a callback for when this Entitys child array changed.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onChildrenChanged : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onChildrenChanged called on a non initialized entity!");
            return null;
        }
        return Tundra.events.subscribe("Entity.Children.Changed." + this.id.toString(), context, callback);
    },

    /**
        Set the ID of the entity. Only for internal usage.

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
        var nameComp = this.componentByTypeId(26); // EC_Name
        if (nameComp)
            return nameComp.attributes.name.value;
        return "";
    },

    /**
        Set name to EC_Name component. Creates the component if necessary.
        See also {{#crossLink "Entity/name:property"}}name{{/crossLink}}.

        @param {String} name New name for this entity.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setName : function(newName, change)
    {
        var nameComp = this.getOrCreateComponent("Name", undefined, change);
        nameComp.setName(newName, change);
    },

    /**
        Get description of this Entity from EC_Name component. Empty string if description is not set.

        @return {String}
    */
    getDescription : function()
    {
        var nameComp = this.component("Name");
        if (nameComp)
            return nameComp.getDescription();
        return "";
    },

    /**
        Set description to EC_Name component. Creates the component if necessary.
        To get this property use {{#crossLink "Entity/description:property"}}Entity.description{{/crossLink}}.

        @param {String} description New description for this entity.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setDescription : function(description, change)
    {
        var nameComp = this.getOrCreateComponent("Name", undefined, change);
        nameComp.setDescription(description, change);
    },

    /**
        Get group of this Entity from EC_Name component. Empty string if group is not set.

        @return {String}
    */
    getGroup : function()
    {
        var nameComp = this.component("Name");
        if (nameComp)
            return nameComp.getGroup();
        return "";
    },

    /**
        Set group to EC_Name component. Creates the component if necessary.
        To get this property use {{#crossLink "Entity/group:property"}}Entity.group{{/crossLink}}.

        @param {String} group New group for this entity.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
    */
    setGroup : function(group, change)
    {
        var nameComp = this.getOrCreateComponent("Name", undefined, change);
        nameComp.setGroup(group, change);
    },

    /**
        Registers a callback for when this Entity is about to be removed. You can query components
        and other Entity data but changing any state has no effect as the entity will be removed.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onAboutToBeRemoved : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onAboutToBeRemoved called on a non initialized entity!");
            return null;
        }

        return Tundra.events.subscribe("Entity.AboutToBeRemoved." + this.id.toString(), context, callback);
    },

    /**
        Registers a callback for component created event originating from this entity.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * var entity = Tundra.scene.entityById(12);
        * if (entity != null) {
        *     entity.onComponentCreated(function(entity, component) {
        *         // entity == Entity
        *         // component == IComponent or one of its implementations.
        *         console.log("Entity", entity.id, entity.name, "got a new component: " + component.typeName);
        *     });
        * }
    */
    onComponentCreated : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onComponentCreated called on a non initialized entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishComponentCreated not in Entity!
        return Tundra.events.subscribe("Scene.ComponentCreated." + this.id.toString(), context, callback);
    },

    /**
        Registers a callback for component removed event originating from this entity.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * var entity = Tundra.scene.entityById(12);
        * if (entity != null) {
        *     entity.onComponentRemoved(function(entity, component) {
        *         // entity == Entity
        *         // component == IComponent or one of its implementations.
        *     });
        * }
    */
    onComponentRemoved : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onComponentRemoved called on a non initialized entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishComponentRemoved not in Entity!
        return Tundra.events.subscribe("Scene.ComponentRemoved." + this.id.toString(), context, callback);
    },

    /**
        Registers a callback for entity actions originating from this entity. See {{#crossLink "Scene/EntityAction:event"}}{{/crossLink}} for event data.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * var entity = Tundra.scene.entityById(12);
        * if (entity != null) {
        *     entity.onEntityAction(function(entityAction) {
        *         // entityAction == EntityAction
        *     });
        * }
    */
    onEntityAction : function(context, callback)
    {
        if (this.parentScene == null || this.id < 0)
        {
            this.log.error("onEntityAction called on a non initialized entity!");
            return null;
        }

        /// @note The event is triggered in Scene._publishEntityAction not in Entity!
        return Tundra.events.subscribe("Scene.EntityAction." + this.id.toString(), context, callback);
    },

    reset : function()
    {
        // Publish that we are about to be removed.
        Tundra.events.send("Entity.AboutToBeRemoved." + this.id.toString(), this);

        /// @todo Fix this stupid EC_Placeable always first stuff...
        var placeableId = null;
        var componentIds = [];
        for (var i = 0; i < this.components.length; i++)
        {
            if (this.components[i] != null)
            {
                if (this.components[i].typeName !== "Placeable")
                    componentIds.push(this.components[i].id);
                else
                    placeableId = this.components[i].id;
            }
        }
        for (i = 0; i < componentIds.length; i++)
            this.removeComponent(componentIds[i]);
        if (placeableId != null)
            this.removeComponent(placeableId);
        this.components = [];

        Tundra.events.remove("Entity.AboutToBeRemoved." + this.id.toString());
        Tundra.events.remove("Scene.EntityAction." + this.id.toString());
    },

    /**
        Serializes this entity and its components to JSON.
        @param {boolean} [serializeTemporary=false] If true, it will also serialize temporary components, if such case is needed
        @return {object} - The entity as JSON.
        @example
        * var entityObject = someEntity.serializeToObject();
        * // The object is described as follows:
        * // {
        * //      id            : {number}, The entity ID
        * //      sync          : {boolean}, true if the entity is replicated to the server
        * //      temp          : {boolean | undefined}, true if ths entity is temporary, undefined if not serialized
        * //      components    : {Array<IComponent>}, A list of all components which are also serialized into JSONs
        * // }
    */
    serializeToObject : function(serializeTemporary)
    {
        serializeTemporary = serializeTemporary || false;

        var object = {};
        object.id = this.id;
        object.sync = this.replicated;
        object.components = [];
        object.temp = (serializeTemporary && this.temporary) || undefined;

        for (var i = 0; i < this.components.length; ++i)
        {
            var temp = this.components[i].temporary;
            if (!temp || (temp && serializeTemporary))
                object.components.push(this.components[i].serializeToObject(serializeTemporary));
        }

        return object;
    },

    /**
        Serializes this entity to the TXML format.
        @param {boolean} [serializeTemporary=false] If true, it will also serialize temporary components, if such case is needed
        @return {Node} - The entity in XML
    */
    serializeToXml : function(serializeTemporary)
    {
        serializeTemporary = serializeTemporary || false;

        var entityElement = document.createElement("entity");
        entityElement.setAttribute("id", this.id);
        entityElement.setAttribute("sync", this.replicated);
        if (!this.temporary || (this.temporary && serializeTemporary))
            entityElement.setAttribute("temp", this.temporary);

        for (var i = 0; i < this.components.length; ++i)
        {
            var temp = this.components[i].temporary;
            if (!temp || (temp && serializeTemporary))
                entityElement.appendChild(this.components[i].serializeToXml(serializeTemporary));
        }

        return entityElement;
    },

    /**
        Deserializes the entity from JSON
        @param {object} obj The object to be deserialized
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromObject : function(obj, change)
    {
        change = change || AttributeChange.Default;
        for (var i = 0; i < obj.components.length; ++i)
        {
            var componentObject = obj.components[i];
            var typeId = componentObject.typeId;
            var typeName = componentObject.typeName;
            if (!this.parentScene.$class.registeredComponent(typeId))
            {
                this.log.warn("[deserializeFromObject]: skipping unregistered component:", typeName);
                continue;
            }

            var sync = componentObject.sync;
            var name = componentObject.name;
            var temp = componentObject.temp || false;
            var component = null;
            if (sync)
                component = this.createComponent(typeId, name, change);
            else
                component = this.createLocalComponent(typeId, name);

            component.temporary = temp;
            component.deserializeFromObject(componentObject, change);
        }
    },

    /**
        Deserializes the entity from a XML node
        @param {Node} entityElement The XML node to be parsed
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromXml : function(entityElement, change)
    {
        change = change || AttributeChange.Default;
        for (var i = 0; i < entityElement.childNodes.length; ++i)
        {
            var element = entityElement.childNodes[i];
            if (element.nodeName != "component")
                continue;

            var typeId = parseInt(element.getAttribute("typeId")) || parseInt(element.getAttribute("typeid"));
            var type = element.getAttribute("type");
            typeId = typeId || type;

            if (!this.parentScene.$class.registeredComponent(typeId))
            {
                this.log.warn("[deserializeFromXml]: skipping unregistered component:", type);
                continue;
            }
            var name = element.getAttribute("name");
            var sync = (element.getAttribute("sync") == "true");
            var temp = (element.getAttribute("temp") == "true") || false;

            var component = null;
            if (sync)
                component = this.createComponent(typeId, name);
            else
                component = this.createLocalComponent(typeId, name, change);

            component.temporary = temp;
            component.deserializeFromXml(element, change);
        }
    },

    /**
        Utility function for log prints. Converts entity's id and name to a string and returns it.

        @return {String}
    */
    toString : function()
    {
        return this.id + (this.name.length > 0 ? " name = " + this.name : "");
    },

    update : function()
    {
        /// @todo Fix this stupid EC_Placeable always first stuff...

        // Update for all components. Update EC_Placeable
        // first as its scene node needs to be there.
        var myPlaceable = this.component("Placeable");
        if (myPlaceable)
            myPlaceable.update();
        for (var i=0; i<this.components.length; ++i)
        {
            if (this.components[i] == null)
                continue;
            if (myPlaceable == null || myPlaceable.id !== this.components[i].id)
                this.components[i]._update();
        }
    },

    /**
        Executes an entity action on this entity.

        @param {Number} execType Execution type, single value or combination (using logical OR) of
            {@link EntityAction.Local}, {@link EntityAction.Server} and {@link EntityAction.Peers}.
        @param {String} actionName Entity action name.
        @param {Array} [parameterList] List of parameters. All elements are converted to string using `toString()` on the object.
    */
    exec : function(execType, actionName, parameterList)
    {
        // TODO Remove this as unnecessary and inconvenient (cannot do e.g. "local + server").
        if (typeof(execType) === "string")
        {
            var lowerExecType = execType.toLowerCase();
            if (lowerExecType === "local")
                execType = EntityAction.Local;
            else if (lowerExecType === "server")
                execType = EntityAction.Server;
            else if (lowerExecType === "peers")
                execType = EntityAction.Peers;
            else
            {
                this.log.error("exec(): Error cannot convert string exec type " + execType + " no a valid EntityAction exec type!");
                return;
            }
        }
        if (execType < 1 || execType > 7)
        {
            this.log.error("exec(): Invalid EntityAction input parameter: " + execType);
            return;
        }

        var entityAction = new EntityAction();
        entityAction.entity = this;
        entityAction.entityId = this.id;
        entityAction.executionType = execType;
        entityAction.name = actionName;
        entityAction.parameters = [];

        if (Array.isArray(parameterList))
        {
            for (var i = 0; i < parameterList.length; i++)
            {
                var param = parameterList[i];
                if (param === null || param === undefined)
                    entityAction.parameters.push("");
                else if (typeof param === "object" || Array.isArray(param))
                    entityAction.parameters.push(JSON.stringify(param));
                else
                    entityAction.parameters.push(param.toString());
            }
        }
        else if (param !== null && typeof parameterList === "object")
            entityAction.parameters.push(JSON.stringify(parameterList));
        else if (parameterList !== undefined && parameterList !== null)
            entityAction.parameters.push(parameterList.toString());

        if ((entityAction.executionType & EntityAction.Local) !== 0)
            if (this.parentScene)
                this.parentScene._publishEntityAction(entityAction);

        if ((entityAction.executionType & EntityAction.Server) !== 0 ||
            (entityAction.executionType & EntityAction.Peers) !== 0)
        {
            var message = new EntityActionMessage();
            message.serialize(entityAction);
            Tundra.network.send(message);
        }
    },

    /**
        Adds a component to this entity.

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

        if (component.local && component.id > this.componentIdGenerator.localId)
            this.componentIdGenerator.localId = component.id;
        else if (component.replicated && component.id > this.componentIdGenerator.id)
            this.componentIdGenerator.id = component.id;

        // Send event
        if (this.parentScene != null)
            this.parentScene._publishComponentCreated(this, component);

        return true;
    },

    /**
        Removes a component by id from this entity.

        @param {Number} componentId Component id.
        @return {Boolean} `true` if removed, `false` if component could not be found.
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

        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {Boolean} `true` if removed, `false` if component could not be found with give type/name.
    */
    removeComponentByName : function(typeName, name)
    {
        var findTypeName = IComponent.ensureComponentNameWithoutPrefix(typeName);
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
                    Tundra.events.send("Scene.ComponentRemoved." + this.id.toString(), this, comp);

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

        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {IComponent|null} The component if found, otherwise `null`.
    */
    component : function(typeName, name)
    {
        if (typeof typeName !== "string")
        {
            this.log.error("component() called with non-string type name for Entity: " + this.toString());
            return null;
        }
        // TODO optimize by comparing typeId instead of typeName?
        var findTypeName = IComponent.ensureComponentNameWithoutPrefix(typeName);
        for(var i = this.components.length - 1; i >= 0; i--)
        {
            if (this.components[i] && this.components[i].typeName === findTypeName &&
                (name === undefined || this.components[i].name === name))
            {
                return this.components[i];
            }
        }
        return null;
    },

    /// @deprecated use component @todo remove asap.
    getComponent : function(typeName, name) { return this.component(typeName, name); },

    /**
        Returns a component by id.

        @param {Number} componentId Component id.
        @return {IComponent|null} The component if found, otherwise `null`.
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
        Returns first component with type id.

        @param {Number} id Component typename or type id.
        @return {IComponent|null} Found component.
    */
    componentByTypeId : function(typeId, name)
    {
        for (var i = this.components.length - 1; i >= 0; i--)
        {
            if ((this.components[i] != null && this.components[i].typeId === typeId) && (name === undefined || this.components[i].name === name))
                return this.components[i];
        }
        return null;
    },

    /**
        Returns component by type name or type id.
        @note Must have a get prefix as components is aready a propery.


        @param {String|Number} id Component typename or type id.
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {Array<IComponent>} Array of found components.
    */
    getComponents : function(id, name)
    {
        var result = [];
        var byTypeId = (typeof id !== "string");
        var typeName = (!byTypeId ? IComponent.ensureComponentNameWithoutPrefix(id) : "");
        for (var i = this.components.length - 1; i >= 0; i--)
        {
            var comp = this.components[i];
            if (comp != null && (byTypeId && comp.typeId === id) || (!byTypeId && comp.typeName === typeName))
            {
                if (name === undefined || typeof name !== "string")
                    result.push(comp);
                else if (comp.name === name)
                    result.push(comp);
            }
        }
        return result;
    },

    /**
        Creates a local component by given type name and name.

        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {IComponent|null} The component if created, otherwise null.
    */
    createLocalComponent : function(typeName, name)
    {
        return this.createComponent(typeName, name, AttributeChange.LocalOnly);
    },

    /**
        Creates a component by given type name and name.
        This function performs no check if this component already exists!
        Use getOrCreateComponent() or component() for checking.

        @param {String|Number} type Component type name ("Placeable") or type id (20).
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode. Note: Only AttributeChange.LocalOnly is supported at the moment!
        @return {IComponent|null} The component if created, otherwise null.
    */
    createComponent : function(type, name, change)
    {
        if (this.parentScene == null)
        {
            this.log.error("Cannot create component, parent scene is null for Entity: " + this.toString());
            return null;
        }

        if (change !== undefined && typeof change !== "number")
            this.log.warn("createComponent called with non AttributeChange.Type change mode, defaulting to AttributeChange.Default.");
        change = change || AttributeChange.Default;
        name = name || "";
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

        var component = this.parentScene.createComponent(type, name);
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

        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".

        @return {IComponent|null} The component if found or created, otherwise `null`.
    */
    getOrCreateLocalComponent : function(typeName, name)
    {
        return this.getOrCreateComponent(typeName, name, AttributeChange.LocalOnly);
    },

    /**
        Returns or creates a component by given type name and name.
        If component with the type is found but the name does not match, a new component is created.

        @param {String} typeName Component type name e.g. "Placeable".
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode, in case component has to be created. Note: Only AttributeChange.LocalOnly is supported at the moment!
        @return {IComponent|null} The component if found or created, otherwise `null`.
    */
    getOrCreateComponent : function(typeName, name, change)
    {
        var component = this.component(typeName, name);
        if (!component)
            component = this.createComponent(typeName, name, change);
        return component;
    }
});

return Entity;

}); // require js
