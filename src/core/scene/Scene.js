
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        "core/scene/Entity",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/scene/AttributeChange",
        "core/scene/UniqueIdGenerator",
        "core/network/Network",
        "core/data/DataDeserializer"
    ], function(Tundra, ITundraAPI, TundraLogging, CoreStringUtils, Entity, IComponent, Attribute,
        AttributeChange, UniqueIdGenerator, Network, DataDeserializer, DataSerializer)
{

var Scene = ITundraAPI.$extend(
/** @lends Scene.prototype */
{
    /**
        Scene is a complete manager for the current WebTundra scene. It is used for the bulk of the operations in most applications, mainly to manipulate with the scene, and listening to scene events.
        Scene provides methods to add, get and remove entities, and listen to changes such as adding / removing entities, adding / removing components, attribute changes etc.

        Only one single scene exists in a WebTundra session. Scene is a singleton and accessible from {@link Tundra.scene}.

        @constructs
        @extends ITundraAPI
        @private
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        /**
            List of {@link Entity} objects in this scene
            @var {Array.<Entity>}
        */
        this.entities = [];
        this.id = 1;
        this.entityIdGenerator = new UniqueIdGenerator();
    },

    // ITundraAPI override
    postInitialize : function()
    {
        var comps = Scene.registeredComponentsList();
        for (var i = 0; i < comps.length; i++)
            if (typeof comps[i].Implementation !== "string")
                this._logComponentRegistration(comps[i], true);
        for (var i = 0; i < comps.length; i++)
            if (typeof comps[i].Implementation === "string")
                this._logComponentRegistration(comps[i], true);

        Tundra.console.registerCommand("dumpScene", "Dumps the scene to browsers developer console",
            "(string) Optional entity name if you want to print a single entity", this, this.onDumpScene);
    },

    // ITundraAPI override
    reset : function()
    {
        this.id = 1;
        this.removeAllEntities();

        Tundra.events.remove("Scene.EntityCreated");
        Tundra.events.remove("Scene.EntityRemoved");
        Tundra.events.remove("Scene.ComponentCreated");
        Tundra.events.remove("Scene.ComponentRemoved");
        Tundra.events.remove("Scene.EntityAction");

        Tundra.events.send("Scene.Reset", this);
    },

    __classvars__ :
    {
        registeredComponents : {},

        ClearRegisteredComponents : function()
        {
            this.registeredComponents = {};
        },

        /**
            Returns all the registered component information as a list.

            @static
            @return {Array.<IComponent>}
        */
        registeredComponentsList : function()
        {
            var result = [];
            var componentIds = Object.keys(Scene.registeredComponents);
            for (var i = 0; i < componentIds.length; i++)
            {
                var typeId = componentIds[i];
                result.push(Scene.registeredComponents[typeId]);
            }
            return result;
        },

        /**
            Returns component information object (typeId, typeName, prototype).

            @static
            @param {Number|String} id Component type id or name.
            @return {Object|undefined}
        */
        registeredComponent : function(id)
        {
            if (typeof id === "string")
            {
                var typeName = IComponent.ensureComponentNameWithoutPrefix(id);
                var componentIds = Object.keys(Scene.registeredComponents);
                for (var i = 0; i < componentIds.length; i++)
                {
                    var typeId = componentIds[i];
                    if (Scene.registeredComponents[typeId].TypeName === typeName)
                    {
                        id = typeId;
                        break;
                    }
                }
            }
            return Scene.registeredComponents[id];
        },

        /**
            Registers a new component to the client. Once the component is registered it can be instantiated when it is sent from server to the client.

            This function is static and should be called directly with `Scene.registerComponent(...)` without getting the Scene instance from the client.

            @static
            @param {IComponent} componentClass - Object to instantiate when this component needs to be created.
            @return {Boolean} `true` if component was registered successfully, `false` if failed.
        */
        registerComponent : function(component)
        {
            if (!(component.prototype instanceof IComponent))
            {
                TundraLogging.getLogger("Scene").error("registerComponent: Invalid component class. First parameter must be a IComponent.");
                return false;
            }
            else if (typeof component.TypeId !== "number")
            {
                debugger;
                TundraLogging.getLogger("Scene").error("registerComponent: Invalid component class. 'TypeId' is not a number.");
                return false;
            }
            else if (component.TypeId <= 0)
            {
                TundraLogging.getLogger("Scene").error("registerComponent: Invalid component class. 'TypeId' number is invalid", component.TypeId);
                return false;
            }
            else if (typeof component.TypeName !== "string")
            {
                TundraLogging.getLogger("Scene").error("registerComponent: Invalid component class. 'TypeName' is not a string.");
                return false;
            }
            else if (component.TypeName === "")
            {
                TundraLogging.getLogger("Scene").error("registerComponent: Invalid component class. 'TypeName' string is invalid", component.TypeName);
                return false;
            }

            if (this.registeredComponents[component.TypeId] !== undefined)
            {
                TundraLogging.getLogger("Scene").error("Component with type id", component.TypeId, "(" + this.registeredComponents[component.TypeId].TypeName + ") already registered!");
                return false;
            }

            component.TypeName = IComponent.ensureComponentNameWithoutPrefix(component.TypeName);
            this.registeredComponents[component.TypeId] = component;
            this._registerComponentPropertyName(component);

            if (Tundra.scene != null)
                Tundra.scene._logComponentRegistration(component);
            return true;
        },

        /**
            Return if component is registered

            @static
            @param {IComponent} componentClass
            @return {Boolean}
        */
        registered : function(component)
        {
            if (!(component.prototype instanceof IComponent))
            {
                TundraLogging.getLogger("Scene").error("registered: Invalid component class. First parameter must be a IComponent.");
                return false;
            }
            else if (typeof component.TypeId !== "number")
            {
                TundraLogging.getLogger("Scene").error("registered: Invalid component class. 'TypeId' is not a number.");
                return false;
            }
            else if (component.TypeId <= 0)
            {
                TundraLogging.getLogger("Scene").error("registered: Invalid component class. 'TypeId' number is invalid", component.TypeId);
                return false;
            }
            return (this.registeredComponents[component.TypeId] !== undefined);
        },

        _registerComponentPropertyName : function(component)
        {
            // Register unkown components property name
            var propertyName = IComponent.propertyName(component.TypeName);
            var added = false;
            for (var k = 0; k < Scene.componentPropertyNames.length; k++)
            {
                added = (Scene.componentPropertyNames[k] === propertyName);
                if (added)
                    break;
            }
            if (!added)
                Scene.componentPropertyNames.push(propertyName);
        },

        componentPropertyNames : (function() {
            var result = [];
            for (var compTypeId in Network.components)
                result.push(IComponent.propertyName(Network.components[compTypeId]));
            return result;
        }())
    },

    registerComponent : function(component)
    {
        return Scene.registerComponent(component);
    },

    registered : function(component)
    {
        return Scene.registered(component);
    },

    /**
        Serializes the whole scene into a JSON.
        @param {boolean} [serializeTemporary=false] If true, it will also serialize temporary entities, if such case is needed
        @return {object} The whole scene in JSON
        @example
        * var sceneObject = Tundra.scene.serializeToObject();
        * // The object is described as follows:
        * // {
        * //      id            : {number}, The scene ID
        * //      entities      : {Array<Entity>}, A list of all entities which are also serialized into JSONs
        * // }
    */
    serializeToObject : function(serializeTemporary)
    {
        serializeTemporary = serializeTemporary || false;

        var object = {};
        object.id = this.id;
        object.entities = [];

        for (var i = 0; i < this.entities.length; ++i)
        {
            var temp = this.entities[i].temporary;
            if (!temp || (temp && serializeTemporary))
                object.entities.push(this.entities[i].serializeToObject(serializeTemporary));
        }

        return object;
    },

    /**
        Serializes the whole scene to the TXML format.
        @param {boolean} [serializeTemporary=false] If true, it will also serialize temporary entities, if such case is needed
        @return {XMLNode} - The whole scene in XML
    */
    serializeToXml : function(serializeTemporary)
    {
        serializeTemporary = serializeTemporary || false;

        var sceneElement = document.createElement("scene");
        for (var i = 0; i < this.entities.length; ++i)
        {
            var temp = this.entities[i].temporary;
            if (!temp || (temp && serializeTemporary))
               sceneElement.appendChild(this.entities[i].serializeToXml(serializeTemporary));
        }

        return sceneElement;
    },

    /**
        Deserializes a scene from JSON
        @param {object} obj The object to be deserialized
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
        @return {Array<Entity>} - The entities that were created
    */
    deserializeFromObject : function(obj, change)
    {
        change = change || AttributeChange.Default;
        // @todo What about scene ID?
        var entities = [];
        for (var i = 0; i < obj.entities.length; ++i)
        {
            var entityObject = obj.entities[i];
            var sync = entityObject.sync;
            var temp = entityObject.temp || false;
            var entity = this.createEntity(0, null, change, sync, sync, true);
            entity.temporary = temp;
            entity.deserializeFromObject(entityObject, change);
            entities.push(entity);
        }

        return entities;
    },

    /**
        Deserializes the scene from a TXML document
        @param {Document} xmlDoc The XML document to be parsed
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
        @return {Array<Entity>} - The entities that have been created.
    */
    deserializeFromXml : function(xmlDoc, change)
    {
        if (xmlDoc.getElementsByTagName("parsererror").length > 0)
        {
            Tundra.scene.log.error("[deserializeFromXml]: Error parsing a scene from TXML: the document is not a valid TXML format!");
            return;
        }

        var sceneElement = xmlDoc.firstChild;
        while (sceneElement && sceneElement.nodeName != "scene")
            sceneElement = sceneElement.nextSibling;

        return this.createContentFromXml(sceneElement, change);
    },

    /**
        Creates the scene content from a <scene> XML element
        @param {Node} sceneElement The XML <scene> element
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
        @return {Array<Entity>} - The entities that have been created.
    */
    createContentFromXml : function(sceneElement, change)
    {
        change = change || AttributeChange.Default;
        var entities = [];
        if (sceneElement.nodeName != "scene")
        {
            Tundra.scene.log.error("[createContentFromXml]: The given element is not a <scene> element, instead it is <" + sceneElement.nodeName + ">");
            return entities;
        }

        for (var i = 0; i < sceneElement.childNodes.length; ++i)
        {
            var element = sceneElement.childNodes[i];
            if (element.nodeName != "entity")
                continue;

            var sync = (element.getAttribute("sync") == "true");
            var temp = (element.getAttribute("temp") == "true") || false;

            var entity = this.createEntity(0, null, change, sync, sync, true);
            entity.temporary = temp;
            entity.deserializeFromXml(element, change);
            entities.push(entity);
        }

        return entities;
    },

    /**
        Utility function for log prints. Converts scene's id and name to a string and returns it.

        @return {String}
    */
    toString : function()
    {
        return "id=" + this.id + " entities=" + this.entities.length;
    },

    _logComponentRegistration : function(component, forcePrint)
    {
        if (Tundra.scene == null)
            return;

        if (this.staging.postInitialized || forcePrint)
        {
            var implName = (component.Implementation !== undefined ? "[" + component.Implementation + "] " : "");
            var typeIdPretty = component.TypeId.toString();
            while(typeIdPretty.length < 3) typeIdPretty = " " + typeIdPretty;
            Tundra.scene.log.debug("Registered component " +  implName + typeIdPretty, component.TypeName);
        }
    },

    onDumpScene : function(parameters)
    {
        if (this.entities.length === 0)
        {
            this.log.info("Current scene has no entities");
            return;
        }
        this.log.info("");

        var foundMatch = false;
        var entName = parameters[0];
        for (var i = 0; i < this.entities.length; i++)
        {
            var ent = this.entities[i];
            var match = (entName !== undefined ? entName === ent.name : true);
            if (!match)
                continue;
            foundMatch = true;

            this.log.info(ent.id + " " + ent.name);
            for (var k = 0; k < ent.components.length; k++)
            {
                var comp = ent.components[k];
                this.log.info("  " + comp.id + " " + comp.typeName);
                if (!comp.isDynamic())
                {
                    for (var j = 0; j < comp.attributeCount; j++)
                        this.log.info("    " + comp.getAttributeByIndex(j).toString());
                }
                else
                {
                    for (var attributeIndex in comp.attributeIndexes)
                    {
                        var attribute = comp.getAttributeByIndex(attributeIndex);
                        if (attribute !== undefined && attribute !== null)
                            this.log.info("    " + attribute.toString());
                    }
                }
            }
        }
        if (!foundMatch && entName !== undefined)
            this.log.error("Failed to find entity '" + entName + "'");
    },

    /**
        Private handler of Entity name changes. This will take care of correct EC_Placeable parenting in a central place.
        We could leave it off to EC_Placeable to detect all situations and parent/unparent correctly, but it would require
        multiple iterations over all scene entities. Now we can iterate once per name change.

        This function is called automatically by {@link EC_Name} when a name change occurs.
    */
    _onEntityNameChanged : function(entity, newName, oldName)
    {
        for (var i = this.entities.length - 1; i >= 0; i--)
        {
            var iter = this.entities[i];
            var parentRef = (iter.placeable != null ? iter.placeable.parentRef : undefined);
            if (parentRef !== undefined && parentRef !== null)
            {
                // Parented to the old name?
                if (oldName !== "" && parentRef !== "" && parentRef === oldName)
                    iter.placeable.removeParent();
                // Needs to be parented to the new name?
                if (newName !== "" && parentRef === newName)
                    iter.placeable.checkParent();
            }
        }
    },

    /**
        Registers a callback for scene resets.

        * @example
        * Tundra.scene.onReset(null, function(scene) {
        *     console.log("Scene reseted: " + scene.id);
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onReset : function(context, callback)
    {
        return Tundra.events.subscribe("Scene.Reset", context, callback);
    },

    /**
        Registers a callback for entity created event.

        * @example
        * Tundra.scene.onEntityCreated(function(entity) {
        *     // entity == Entity
        *     console.log("Entity", entity.id, entity.name, "created");
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onEntityCreated : function(context, callback)
    {
        return Tundra.events.subscribe("Scene.EntityCreated", context, callback);
    },

    /**
        Registers a callback for entity removed event.

        * @example
        * Tundra.scene.onEntityRemoved(function(entity) {
        *     // entity == Entity
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onEntityRemoved : function(context, callback)
    {
        return Tundra.events.subscribe("Scene.EntityRemoved", context, callback);
    },

    /**
        Registers a callback for component created event.

        * @example
        * Tundra.scene.onComponentCreated(function(entity, component) {
        *     // entity == Entity
        *     // component == IComponent or one of its implementations.
        *     console.log("Entity", entity.id, entity.name, "got a new component: " + component.typeName);
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onComponentCreated : function(context, callback)
    {
        return Tundra.events.subscribe("Scene.ComponentCreated", context, callback);
    },

    /**
        Registers a callback for component removed event.

        * @example
        * Tundra.scene.onComponentRemoved(function(entity, component) {
        *     // entity == Entity
        *     // component == IComponent or one of its implementations.
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onComponentRemoved : function(context, callback)
    {
        return Tundra.events.subscribe("Scene.ComponentRemoved", context, callback);
    },

    /**
        Registers a callback for all attribute changes in the scene.

        * @example
        * Tundra.scene.onAttributeChanged(null, function(entity, component, attributeIndex, attributeName, newValue) {
        *     console.log(entity.name, component.id, attributeName, "=", newValue);
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onAttributeChanged : function(context, callback)
    {
        return Tundra.events.subscribe("Scene.AttributeChanged", context, callback);
    },

    /**
        Registers a callback for entity actions. See {{#crossLink "core/scene/EntityAction"}}{{/crossLink}} for the event parameter.

        * @example
        * Tundra.scene.onEntityAction(function(entityAction) {
        *     // entityAction == EntityAction
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onEntityAction : function(context, callback)
    {
        return Tundra.events.subscribe("Scene.EntityAction", context, callback);
    },

    _publishEntityCreated : function(entity)
    {
        if (entity == null)
        {
            console.log("ERROR: Scene trying to publish EntityCreated with null entity!");
            return;
        }

        Tundra.events.send("Scene.EntityCreated", entity);
    },

    _publishEntityRemoved : function(entity, change)
    {
        if (entity == null)
        {
            console.log("ERROR: Scene trying to publish EntityRemoved with null entity!");
            return;
        }

        // @todo Apply change, if disconnected, dont emit events?!
        // @see Below _publishParentChanged
        if (change === undefined || change === null || change === AttributeChange.Default)
            change = (entity.local ? AttributeChange.LocalOnly : AttributeChange.Replicate);

        try
        {
            if (change !== AttributeChange.Disconnected)
                Tundra.events.send("Scene.EntityRemoved", entity);
        }
        catch(e)
        {
            this.log.error("Scene.EntityRemoved handler exception:", e.stack || e);
        }

        // This entity will be removed. Unregister all callbacks.
        var idStr = entity.id.toString();
        Tundra.events.remove("Scene.ParentChanged." + idStr);
        Tundra.events.remove("Scene.ComponentCreated." + idStr);
        Tundra.events.remove("Scene.ComponentRemoved." + idStr);
        Tundra.events.remove("Scene.AttributeChanged." + idStr);
        Tundra.events.remove("Scene.EntityAction." + idStr);
    },

    _publishParentChanged : function(parent, child, change)
    {
        // @note null/undefined 'parent' is a valid case (prev. parent removed)

        if (change === undefined || change === null || change === AttributeChange.Default)
        {
            if (child)
                change = (child.local ? AttributeChange.LocalOnly : AttributeChange.Replicate);
            else if (parent)
                change = (parent.local ? AttributeChange.LocalOnly : AttributeChange.Replicate);
            else
                change = AttributeChange.LocalOnly; // good default?
        }
        if (change !== AttributeChange.Disconnected)
        {
            if (child)
            {
                Tundra.events.send("Entity.Parent.Changed." + child.id.toString(), child, parent, change);
                Tundra.events.send("Scene.ParentChanged." + child.id.toString(), child, parent, change);
            }
            if (parent)
                Tundra.events.send("Entity.Children.Changed." + parent.id.toString(), parent, child, change);
        }
    },

    _publishComponentCreated : function(entity, component)
    {
        if (entity == null)
        {
            console.log("ERROR: Scene trying to publish ComponentCreated with null entity!");
            return;
        }
        if (component == null)
        {
            console.log("ERROR: Scene trying to publish ComponentCreated with null component!");
            return;
        }

        Tundra.events.send("Scene.ComponentCreated", entity, component);
        Tundra.events.send("Scene.ComponentCreated." + entity.id.toString(), entity, component);
    },

    _publishComponentRemoved : function(entity, component)
    {
        if (entity == null)
        {
            console.log("ERROR: Scene trying to publish ComponentRemoved with null entity!");
            return;
        }
        if (component == null)
        {
            console.log("ERROR: Scene trying to publish ComponentRemoved with null component!");
            return;
        }

        Tundra.events.send("Scene.ComponentRemoved", entity, component);
        Tundra.events.send("Scene.ComponentRemoved." + entity.id.toString(), entity, component);
    },

    _publishEntityAction : function(entityAction)
    {
        if (entityAction == null)
        {
            console.log("ERROR: Scene trying to publish EntityAction with null entity action object!");
            return;
        }
        if (entityAction.entity == null)
        {
            console.log("ERROR: Scene trying to publish EntityAction with null entity in the action object!");
            return;
        }

        Tundra.events.send("Scene.EntityAction", entityAction);
        Tundra.events.send("Scene.EntityAction." + entityAction.entity.id.toString(), entityAction);
    },

    _publishAttributeChanged : function(entity, attribute)
    {
        if (entity == null)
        {
            console.log("ERROR: Scene trying to publish AttributeChanged with null entity!");
            return;
        }
        if (attribute.owner == null)
        {
            console.log("ERROR: Scene trying to publish AttributeChanged with null component!");
            return;
        }

        var entId = entity.id.toString();
        var compId = attribute.owner.id.toString();
        var attrIndex = attribute.index;
        var clone = attribute.getClone();

        Tundra.events.send("Scene.AttributeChanged",
            entity, attribute.owner, attribute.index, attribute.name, clone);
        Tundra.events.send("Scene.AttributeChanged." + entId,
            entity, attribute.owner, attribute.index, attribute.name, clone);
        Tundra.events.send("Scene.AttributeChanged." + entId + "." + compId,
            entity, attribute.owner, attribute.index, attribute.name, clone);
        Tundra.events.send("Scene.AttributeChanged." + entId + "." + compId + "." + attrIndex,
            clone);
    },

    _initComponentProperties : function(entity)
    {
        var propNames = Scene.componentPropertyNames;
        for (var cti = propNames.length - 1; cti >= 0; cti--)
        {
            var propertyName = propNames[cti];

            // We dont want EC_Name to override the name of the entity.
            // ent.name = "whee" etc. will be correctly redirected to EC_Name.
            if (propertyName === "name")
                continue;

            entity[propertyName] = null;
            var propertyNameLc = propertyName.toLowerCase();
            if (propertyName !== propertyNameLc)
                entity[propertyNameLc] = null;
        }
    },

    /**
        Gets and allocates the next local free entity id.

        @return {Number} The free id
    */
    nextFreeIdLocal : function()
    {
        return this.entityIdGenerator.allocateLocal();
    },

    /**
        Gets and allocates the next replicated free entity id.

        <b>Note:</b> As WebTundra doesn't currently support real replicated entities created by the client
        by design, this function always returns an ID from the replicated ID range and not from
        the unacked ID range.

        @return {Number} The free id
    */
    nextFreeId : function()
    {
        return this.entityIdGenerator.allocateReplicated();
    },

    update : function(frametime)
    {
    },

    /**
        Creates new local entity that contains the specified components. To create an empty entity, omit the components parameter.

        @param {Array} [components=Array()] Optional list of component names the entity will use. If omitted or the list is empty, creates an empty entity.
        @param {AttributeChange} [change=AttributeChange.LocalOnly] Change signaling mode. Note: Only `AttributeChange.LocalOnly` is supported at the moment!
        @param {Boolean} [componentsReplicated=false] Whether created components will be replicated.
        @return {Entity|null} `Entity` if created, otherwise `null`.
    */
    createLocalEntity : function(components, change, componentsReplicated)
    {
        if (components === undefined || components === null)
            components = [];
        if (change === undefined || change === null)
            change = AttributeChange.LocalOnly;
        if (componentsReplicated === undefined || componentsReplicated === null || typeof componentsReplicated !== "boolean")
            componentsReplicated = false;

        return this.createEntity(this.nextFreeIdLocal(), components, change, false, componentsReplicated);
    },

    /**
        Creates new entity that contains the specified components. To create an empty entity, omit the components parameter.

        @param {Number} [id=0] Id of the new entity. Specify 0 to use the next free ID
        @param {Array} [components=Array()] Optional list of component names the entity will use. If omitted or the list is empty, creates an empty entity.
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode. Note: Only `AttributeChange.LocalOnly` is supported at the moment!
        @param {Boolean} [replicated=true] Whether the entity is replicated.
        @param {Boolean} [componentsReplicated=true] Whether created components will be replicated.
        @return {Entity|null} `Entity` if created, otherwise `null`.
    */
    createEntity : function(id, components, change, replicated, componentsReplicated, publishCreated /* no doc, for internal use only */)
    {
        if (typeof id !== "number")
            id = 0;

        if (components === undefined || components === null)
            components = [];

        if (change === undefined || change === null)
            change = AttributeChange.Default;
        if (typeof change !== "number")
        {
            this.log.warn("createEntity called with non AttributeChange.Type change mode, defaulting to AttributeChange.Default.");
            change = AttributeChange.Default;
        }
        if (change != AttributeChange.LocalOnly)
        {
            //this.log.warn("createEntity called with localOnly != AttributeChange.LocalOnly. Creating replicated components is not supported at the moment, defaulting to LocalOnly.");
            change = AttributeChange.LocalOnly;
        }

        if (typeof replicated !== "boolean")
            replicated = true;
        if (typeof componentsReplicated !== "boolean")
            componentsReplicated = (typeof replicated === "boolean" ? replicated : true);

        id = (id !== 0 ? id : (replicated ? this.nextFreeId() : this.nextFreeIdLocal()));
        if (this.entityById(id))
        {
            this.log.error("Entity id " + id + " already exists in scene, can not create");
            return null;
        }

        var entity = new Entity();
        entity.replicated = replicated;
        entity.local = !entity.replicated;
        entity.setId(id);

        // Init component shorthand properties.
        this._initComponentProperties(entity);

        // Add entity: Sets parent scene and updates components.
        this.addEntity(entity, (publishCreated !== false && components.length === 0));

        // Create components
        for (var i = 0; i < components.length; ++i)
        {
            var compTypeName = IComponent.ensureComponentNameWithoutPrefix(components[i]);
            var component = entity.createComponent(compTypeName, null, (componentsReplicated ? AttributeChange.Replicate : AttributeChange.LocalOnly));
        }

        // Update entity once more now that it has all components
        if (components.length > 0)
            entity.update();

        // Publish in all other cases except false being passed to the funtion.
        // This means the network code wants to add components before the event.
        if (publishCreated !== false)
            this._publishEntityCreated(entity);

        return entity;
    },

    /**
        Adds entity to this scene.

        <b>Note:</b> Scene methods such as {@link Scene#createEntity} and {@link Scene#createLocalEntity}
        immediately add new created entities to the scene.

        @param {Entity} entity
        @return {Boolean} `true` if added successfully, otherwise `false`.
    */
    addEntity : function(entity, publishCreated)
    {
        this.entities.push(entity);
        entity.setParentScene(this);
        entity.update();

        // Send event if not suppressed
        if (publishCreated !== false)
            this._publishEntityCreated(entity);

        return true;
    },

    remove : function(entityId, change)
    {
        return this.removeEntity(entityId, change);
    },

    /**
        Removes entity from this scene by id.

        @param {Number} entityId
        @param {AttributeChange} [change]
        @return {Boolean} `true` if removed, otherwise `false`.
    */
    removeEntity : function(entityId, change)
    {
        if (entityId instanceof Entity)
            entityId = entityId.id;

        for (var i = this.entities.length - 1; i >= 0; i--)
        {
            if (this.entities[i].id === entityId)
            {
                var ent = this.entities.splice(i, 1)[0];
                if (ent)
                {
                    // Send event
                    this._publishEntityRemoved(ent, change);
                    try
                    {
                        ent.reset();
                    }
                    catch(e)
                    {
                        this.log.error("removeEntity: Failed to remove entity:");
                        this.log.error(e.stack || e);
                    }

                    // Unparent removed entity.
                    ent.clearParent(AttributeChange.Disconnected);

                    // Remove child entities. Possibly recursive.
                    ent.removeAllChildren(change);

                    ent.id = -1;
                    ent.parentScene = null;
                }
                ent = null;
                return true;
            }
        }
        return false;
    },

    /**
        Removes all entities.

    */
    removeAllEntities : function()
    {
        while (this.entities.length > 0)
        {
            var ent = this.entities[0];
            try
            {
                if (ent && typeof ent.reset === "function")
                    ent.reset();
            }
            catch(e)
            {
                this.log.error("removeAllEntities: Failed to remove entity '" + ent.toString() + "'");
                this.log.error(e.stack || e);
            }
            if (typeof ent === "object")
            {
                ent.id = -1;
                ent.parentScene = null;
            }
            this.entities.splice(0, 1);
        }
        this.entities = [];
    },

    /**
        Returns entity with given id `entityId`, or `null` if not found.

        @param {Number} entityId
        @return {Entity|null}
    */
    entityById : function(entityId)
    {
        for (var i = this.entities.length - 1; i >= 0; i--)
        {
            if (this.entities[i].id === entityId)
                return this.entities[i];
        }
        return null;
    },

    /**
        Returns entity with given name, or null if not found.

        @param {String} name
        @return {Entity|null}
    */
    entityByName : function(name)
    {
        for (var i = this.entities.length - 1; i >= 0; i--)
        {
            var ent = this.entities[i];
            var iterName = ent.getName();
            if (iterName === name)
                return ent;
        }
        return null;
    },

    /**
        Find entity by name that has a particular component.
        This can be useful if the scene has multiple entities with
        the same name but with different set of components. First
        match will be returned.


        @param {String|Number} compTypeOrId
        @param {String} entName
        @return {Entity|null}
    */
    findEntityWith : function(compTypeOrId, entName)
    {
        var ents = this.entitiesWithComponent(compTypeOrId);
        for (var i = 0; i < ents.length; i++)
        {
            if (ents[i].name === entName)
                return ents[i];
        }
        return null;
    },

    /**
        Performs a search through the entities, and returns a list of all the entities that contain `str` substring in their Entity name.

        @param {String} str String to be searched.
        @param {Boolean} [caseSensitive=true] Case sensitivity for the string matching.
        @return {Array<Entity>}
    */
    findEntitiesContaining : function(str, caseSensitive)
    {
        if (caseSensitive === false)
            str = str.toLowerCase();

        var ents = [];
        for (var i = this.entities.length - 1; i >= 0; i--)
        {
            var src = (caseSensitive === false ? this.entities[i].name.toLowerCase() : this.entities[i].name);
            if (src !== "" && src.indexOf(str) !== -1)
                ents.push(this.entities[i]);
        }
        return ents;
    },

    /**
        Returns list of entities that contain a component with given type/name.

        @param {String|Number} type Type name of the component e.g. "Placeable" or type id of the component.
        @param {String} [name=undefined] Optional component name on top of the type e.g. "MyThing".
        @return {Array<Entity>} List of Entity objects.
    */
    entitiesWithComponent : function(type, name)
    {
        var ents = [];
        if (type == null && name == null)
            return ents;

        var queryById = (typeof type != "string");

        for (var i=this.entities.length-1; i>=0; i--)
        {
            var component = (queryById ? this.entities[i].componentByTypeId(type, name) : this.entities[i].component(type, name));
            if (component != null)
                ents.push(this.entities[i]);
        }
        return ents;
    },

    /**
        Returns list of entities that contain all of the given types of components.

        @param {Array} types Array or type names/ids of the component e.g. "Placeable" and "Mesh" or type id of the component.
        @return {Array<Entity>} List of Entity objects.
    */
    entitiesWithComponents : function(types)
    {
        var ents = [];
        if (types == null || types.length === undefined || types.length <= 0)
            return ents;

        for (var i=this.entities.length-1; i>=0; i--)
        {
            var ent = this.entities[i];
            for (var ti=0, tilen=types.length; ti<tilen; ++ti)
            {
                var type = types[ti];
                var component = (typeof type !== "string" ? ent.componentByTypeId() : ent.component(types[ti]));
                if (component != null)
                    ents.push(ent);
            }
        }
        return ents;
    },

    /**
        Returns all components from the scene with given `type` and `name`.

        @param {String|Number} type Type name of the component e.g. "Placeable" or type id of the component.
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {Array<IComponent>} List of IComponent or its implementation objects.
    */
    components : function(type, name)
    {
        var comps = [];
        for (var i=this.entities.length-1; i>=0; i--)
        {
            var ent = this.entities[i];
            var entComps = ent.getComponents(type, name);
            if (entComps.length > 0)
                comps = comps.concat(entComps);
        }
        return comps;
    },

    /**
        Creates a new non-parented WebTundra Component by type name.
        The component id will be set to -1, the caller is responsible
        for initializing the id to a sane value.


        @param {String|Number} type Component type name or id.
        @param {String} [name=""] Component name.
        @return {IComponent} The created component.
    */
    createComponent : function(type, name)
    {
        if (typeof type !== "string" && typeof type !== "number")
        {
            this.log.error("createComponent: 'type' must be string or a number:", type);
            return null;
        }
        var proto = Scene.registeredComponent(type);

        // Not formally registered but might still be recognized as a valid Tundra component by the network layer.
        if (!proto && typeof type === "string")
        {
            var typeNameClean = IComponent.ensureComponentNameWithoutPrefix(type);

            var protocolComponentDefines = Object.keys(Network.components);
            for (var i = 0, len = protocolComponentDefines.length; i<len; i++)
            {
                if (Network.components[protocolComponentDefines[i]] === typeNameClean)
                {
                    proto = { TypeId : parseInt(protocolComponentDefines[i]) };
                    break;
                }
            }
        }
        if (!proto)
        {
            this.log.error("createComponent: Failed to find component implementation for type '" + type + "'");
            return null;
        }
        return this.createComponentById(-1, proto.TypeId, (typeof name === "string" ? name : ""));
    },

    /**
        Creates a new non-parented Tundra Component by id and with optional attribute binary data.
        Used when exact component information is known, e.g. it was sent from server.

        @param {Number} compId Component id.
        @param {Number} compTypeId Component type id.
        @param {String} [compName=""] Component name.
        @param {DataDeserializer} [ds=undefined] Data deserializer for attribute data.
        If `null` or `undefined` deserialization from binary data is skipped.
        @return {IComponent} The created component.
    */
    createComponentById : function(compId, compTypeId, compName, ds)
    {
        if (compName === undefined)
            compName = "";
        if (ds === null)
            ds = undefined;

        // Fin the registered component
        var component = null;
        var componentImpl = Scene.registeredComponent(compTypeId);
        if (componentImpl !== undefined)
        {
            try
            {
                component = this._createComponentImpl(componentImpl, compId, compName);
            }
            catch (e)
            {
                this.log.error("Failed to instantiate registered component " + componentImpl.typeName + ": " + e);
                if (console.error != null)
                    console.error(e);
                return null;
            }
        }

        if (component != null)
        {
            // Components can be created without any input binary data.
            if (ds !== undefined)
                component.deserializeFromBinary(ds);
        }
        else
        {
            var typeName = Network.components[compTypeId];
            if (typeName === undefined || typeName === null)
            {
                this.log.warn("Component type name could not be resolved from ID " + compTypeId);
                return null;
            }

            // Generic component. Attribute parsing not implemented.
            component = new IComponent(compId, compTypeId, typeName, compName);
            component.notImplemented = true;
        }
        return component;
    },

    _createComponentImpl : function(componentImpl, compId, compName)
    {
        return (new componentImpl(compId, componentImpl.TypeId, componentImpl.TypeName, compName));
    },

    createComponentFromBinary : function(entity, ds)
    {
        // Read needed info to instantiate the correct component
        var compId = ds.readVLE();
        var compTypeId = ds.readVLE();
        var compName = ds.readStringU8();
        var compAttributeBytes = ds.readVLE();
        var bytesReadPre = ds.readBytes();
        ds.readLimitBytes = compAttributeBytes;

        // Create unparented component from binary data.
        var component = this.createComponentById(compId, compTypeId, compName, ds);
        if (component == null)
        {
            this.log.error("Failed to create Component with id " + compId + " and type id " + compTypeId + " from binary data.");
            return;
        }

        /* If the server has more attributes than the client component implementation, we need to skip those bytes.
           This is also the case if a components web implementation does not declare all its attributes on purpose.
           This code right here allows us to have older versions of the component and still keep the component functional,
           although with less attributes than the server has to offer us. */
        var bytesDiff = compAttributeBytes - (ds.readBytes() - bytesReadPre);
        if (bytesDiff > 0)
            ds.skipBytes(bytesDiff);

        // Add the component to the entity.
        return entity.addComponent(component);
    },

    onTundraMessage : function(message)
    {
        /// @note RigidBody message is differently structured; it may contain multiple entities
        if (message.id === 119)
        {
            this.handleRigidBodyUpdateMessage(message.ds);
            return;
        }

        var sceneId = message.ds.readVLE();
        var entityId = message.ds.readVLE();

        // EditAttributesMessage. This is the bulk of Tundra network traffic
        if (message.id === 113)
            this.handleEditAttributesMessage(entityId, message.ds);
        // CreateEntityMessage
        else if (message.id === 110)
            this.handleCreateEntityMessage(entityId, message.ds);
        // RemoveEntityMessage
        else if (message.id === 116)
            this.handleRemoveEntityMessage(entityId);
        // CreateComponentsMessage
        else if (message.id === 111)
            this.handleCreateComponentsMessage(entityId, message.ds);
        // RemoveComponentsMessage
        else if (message.id === 115)
            this.handleRemoveComponentsMessage(entityId, message.ds);
        // CreateAttributesMessage
        else if (message.id === 112)
            this.handleCreateAttributesMessage(entityId, message.ds);
        // RemoveAttributesMessage
        else if (message.id === 114)
            this.handleRemoveAttributesMessage(entityId, message.ds);
    },

    handleEntityActionMessage : function(message)
    {
        message.entityAction.entity = this.entityById(message.entityAction.entityId);
        if (message.entityAction.entity == null)
        {
            if (Tundra.network.options.debug)
                this.log.error("Failed to find entity with id " + message.entityAction.entityId + " to execute Entity action on!", true);
            return;
        }
        this._publishEntityAction(message.entityAction);
    },

    handleCreateEntityMessage : function(entityId, ds)
    {
        // New entity
        var entity = this.createEntity(entityId, [], AttributeChange.Replicate, true, true, false);
        entity.temporary = ds.readBoolean();

        if (entityId > this.entityIdGenerator.id)
            this.entityIdGenerator.id = entityId;

        /// Read parent entity ID
        /// @todo: use properly
        var parentEntityId = 0;
        if (Tundra.client.protocolVersion >= Network.protocolVersion.HierarchicScene)
            parentEntityId = ds.readU32();

        // Components
        var numComponents = ds.readVLE();
        for (var i=0; i<numComponents; ++i)
        {
            if (!this.createComponentFromBinary(entity, ds))
            {
                this.log.error("Failed to create Component to a newly created Entity " + entityId);
                break;
            }
        }

        this._publishEntityCreated(entity);
    },

    handleRemoveEntityMessage : function(entityId)
    {
        if (this.removeEntity(entityId))
            return;

        if (Tundra.network.options.debug)
            this.log.error("Failed to find Entity with id " + entityId + " for removal!");
    },

    handleCreateComponentsMessage : function(entityId, ds)
    {
        var entity = this.entityById(entityId);
        if (entity == null)
        {
            if (Tundra.network.options.debug)
                this.log.error("Failed to create Components. Entity with id " + entityId + " was not found!");
            return;
        }

        // 3 bytes is the absolute minimum bytes this message has to have
        while (ds.bytesLeft() >= 3)
        {
            if (!this.createComponentFromBinary(entity, ds))
            {
                this.log.error("Failed to create Component to a existing Entity " + entityId);
                return;
            }
        }
    },

    handleRemoveComponentsMessage : function(entityId, ds)
    {
        var entity = this.entityById(entityId);
        if (entity == null)
        {
            if (Tundra.network.options.debug)
                this.log.error("Failed to remove Components. Entity with id " + entityId + " was not found!");
            return;
        }

        while (ds.bytesLeft() >= 1)
        {
            var compId = ds.readVLE();
            if (entity.removeComponent(compId))
                continue;

            if (Tundra.network.options.debug)
                this.log.error("Failed to remove Component with id " + compId + " from Entity " + entityId);
            return;
        }
    },

    handleCreateAttributesMessage : function(entityId, ds)
    {
        var entity = this.entityById(entityId);
        if (entity == null)
        {
            if (Tundra.network.options.debug)
                this.log.error("Failed to create Attribute. Entity with id " + entityId + " was not found!");
            return;
        }

        // 3 bytes is the absolute minimum bytes this message has to have
        while (ds.bytesLeft() >= 3)
        {
            var compId = ds.readVLE();
            var component = entity.componentById(compId);
            if (component != null)
            {
                var attributeIndex = ds.readU8();
                component.createAttributeFromBinary(attributeIndex, ds);
            }
            else if (Tundra.network.options.debug)
            {
                this.log.error("Failed to create Attribute from Component with id " + compId + " from Entity " + entityId + ". Component not found!");
                return;
            }
        }
    },

    handleRemoveAttributesMessage : function(entityId, ds)
    {
        var entity = this.entityById(entityId);
        if (entity == null)
        {
            if (Tundra.network.options.debug)
                this.log.error("Failed to remove Attribute. Entity with id " + entityId + " was not found!");
            return;
        }

        // 2 bytes is the absolute minimum bytes this message has to have
        while (ds.bytesLeft() >= 2)
        {
            var compId = ds.readVLE();
            var component = entity.componentById(compId);
            if (component == null)
            {
                if (Tundra.network.options.debug)
                    this.log.error("Failed to remove Attribute with component id " + compId + ". Component not found!");
                return;
            }

            // This message can only be handled by a dynamic component
            if (component.isDynamic())
                component.removeAttribute(ds.readU8());
            else
            {
                this.log.error("Cannot remove Attribute from Component with id " + compId + ". Component is not of dynamic type.");
                return;
            }
        }
    },

    handleEditAttributesMessage : function(entityId, ds)
    {
        var entity = this.entityById(entityId);
        if (entity == null)
        {
            if (Tundra.network.options.debug)
                this.log.error("Failed to update Attributes. Entity with id " + entityId + " was not found!");
            return;
        }

        while (ds.bytesLeft() >= 2)
        {
            var compId = ds.readVLE();
            var component = entity.componentById(compId);
            if (component == null)
            {
                if (Tundra.network.options.debug)
                    this.log.error("Failed to update Attributes with component id " + compId + ". Component not found!");
                return;
            }
            var totalBytes = ds.readVLE();

            // If this is base implementation of IComponent skip the data.
            if (component.notImplemented)
            {
                ds.skipBytes(totalBytes);
                continue;
            }

            // Control bit
            // 1 = Bitmask
            // 0 = Indices
            if (ds.readBit() === 1)
            {
                for(var i = 0; i < component.attributeCount; ++i)
                {
                    // Change bit
                    // 1 = attribute changed
                    // 0 = no change
                    if (ds.readBit() === 0)
                        continue;

                    component.deserializeAttributeFromBinary(i, ds);
                }
            }
            else
            {
                var changeCount = ds.readU8();
                for (var ci=0; ci<changeCount; ++ci)
                {
                    var attributeIndex = ds.readU8();
                    component.deserializeAttributeFromBinary(attributeIndex, ds);
                }
            }
        }
    },

    handleRigidBodyUpdateMessage : function(ds)
    {
        while (ds.bitsLeft() >= 9)
        {
            var entityId = ds.readVLE();
            var entity = this.entityById(entityId);
            var placeable = entity ? entity.placeable : null;
            var rigidBody = entity ? entity.rigidbody : null;
            var t = placeable ? placeable.attributes.transform.get() : new Transform();

            if (entity == null)
            {
                if (Tundra.client.networkDebugLogging)
                    this.log.error("Failed to find entity with id " + entityId + " to apply rigid body update to!");
                // The message parsing will continue regardless, we just read the correct amount of bits
            }

            var sendTypes = ds.readArithmeticEncoded5(8, 3, 4, 3, 3, 2);
            var posSendType = sendTypes[0];
            var rotSendType = sendTypes[1];
            var scaleSendType = sendTypes[2];
            var velSendType = sendTypes[3];
            var angVelSendType = sendTypes[4];
            
            if (posSendType == 1)
                t.setPosition(ds.readSignedFixedPoint(11, 8), ds.readSignedFixedPoint(11, 8), ds.readSignedFixedPoint(11, 8));
            else if (posSendType == 2)
                t.setPosition(ds.readFloat32(), ds.readFloat32(), ds.readFloat32());

            if (rotSendType == 1)
            {
                var forward2D = ds.readNormalizedVector2D(8);
                t.lookAt(new THREE.Vector3(0,0,0), new THREE.Vector3(forward2D.x, 0, forward2D.y));
            }
            else if (rotSendType == 2)
            {
                var forward3D = ds.readNormalizedVector3D(9, 8);
                t.lookAt(new THREE.Vector3(0,0,0), new THREE.Vector3(forward3D.x, forward3D.y, forward3D.z));
            }
            else if (rotSendType == 3)
            {
                var quantizedAngle = ds.readBits(10);
                if (quantizedAngle != 0)
                {
                    var angle = quantizedAngle * Math.PI / ((1 << 10) - 1);
                    var axis = ds.readNormalizedVector3D(11, 10);
                    var quat = new THREE.Quaternion();
                    quat.setFromAxisAngle(new THREE.Vector3(axis.x, axis.y, axis.z), angle);
                    t.setRotation(quat);
                }
                else
                    t.setRotation(0, 0, 0); // Identity
            }

            if (scaleSendType == 1)
            {
                var scale = ds.readFloat32();
                t.setScale(scale, scale, scale);
            }
            else if (scaleSendType == 2)
                t.setScale(ds.readFloat32(), ds.readFloat32(), ds.readFloat32());

            /// @todo Set position/rotation to interpolate, even without physics simulation
            if (velSendType == 1)
            {
                var vel = ds.readVector3D(11, 10, 3, 8);
                if (rigidBody && rigidBody.attributes.linearVelocity)
                    rigidBody.attributes.linearVelocity.set(new THREE.Vector3(vel.x, vel.y, vel.z));
            }
            else if (velSendType == 2)
            {
                var vel = ds.readVector3D(11, 10, 10, 8);
                if (rigidBody && rigidBody.attributes.linearVelocity)
                    rigidBody.attributes.linearVelocity.set(new THREE.Vector3(vel.x, vel.y, vel.z));
            }

            if (angVelSendType == 1)
            {
                var quantizedAngle = ds.readBits(10);
                if (quantizedAngle != 0)
                {
                    var axis = ds.readNormalizedVector3D(11, 10);
                    if (rigidBody && rigidBody.attributes.angularVelocity)
                    {
                        var angle = quantizedAngle * Math.PI / ((1 << 10) - 1);
                        var quat = new THREE.Quaternion();
                        quat.setFromAxisAngle(new THREE.Vector3(axis.x, axis.y, axis.z), angle);
                        var euler = new THREE.Euler();
                        euler.setFromQuaternion(quat, 'ZYX', false);
                        rigidBody.attributes.angularVelocity.set(new THREE.Vector3(euler.x * 180 / Math.PI, euler.y * 180 / Math.PI, euler.z * 180 / Math.PI));
                    }
                }
            }

            if (placeable && (posSendType != 0 || rotSendType != 0 || scaleSendType != 0))
            {
                // Update the transform value if something changed
                placeable.attributes.transform.set(t, AttributeChange.LocalOnly);
            }
        }
    }
});

return Scene;

}); // require js
