
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        "core/scene/Entity",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/scene/AttributeChange",
        "core/network/Network",
        "core/data/DataDeserializer"
    ], function(Class, TundraSDK, TundraLogging, CoreStringUtils, Entity, IComponent, Attribute, AttributeChange, Network, DataDeserializer, DataSerializer) {

/**
    Scene that is accessible from {{#crossLink "TundraClient/scene:property"}}TundraClient.scene{{/crossLink}}

    Manages the current Tundra scene. Functions for querying entities and components. Events for entity and component created/removed etc.
    @class Scene
    @constructor
*/
var Scene = Class.$extend(
{
    __init__ : function(params)
    {
        this.log = TundraLogging.getLogger("Scene");

        /**
            List of Entity objects in this scene
            @property entities
            @type Array
        */
        this.entities = [];
        this.id = 1;
    },

    __classvars__ :
    {
        registeredComponents : {},

        /**
            Returns all the registered component information as a list.
            
            @static
            @method registeredComponentsList
            @return {Array<Object>}
        */
        registeredComponentsList : function()
        {
            var result = [];
            for (var typeId in Scene.registeredComponents)
                result.push(Scene.registeredComponents[typeId]);
            return result;
        },

        /**
            Returns all the registered component information as a list.

            @static
            @method registeredComponent
            @param {Number|String} id Component type id or name.
            @return {Object|undefined}
        */
        registeredComponent : function(id)
        {
            if (typeof id === "string")
            {
                var typeName = IComponent.ensureComponentNamePrefix(id);
                for (var compTypeId in Scene.registeredComponents)
                {
                    if (Scene.registeredComponents[compTypeId].typeName === typeName)
                    {
                        id = compTypeId;
                        break;
                    }
                }
            }
            return Scene.registeredComponents[id];
        },

        /**
            Registers a new component to the client. Once the component is registered it can be instantiated when it is sent from server to the client.

            This function is static and should be called directly with 'Scene.registerComponent(...)' without getting the Scene instance from the client.

            @static
            @method registerComponent
            @param {Number} typeId Component type id. This needs to match the server implementation.
            @param {String} typeName Full type name of the component e.g. "EC_Mesh".
            @param {IComponent} componentClass Object to instantiate when this component needs to be created.
            @return {Boolean} True if component was registered, false if failed.
        */
        registerComponent : function(typeId, typeName, componentClass)
        {
            typeName = IComponent.ensureComponentNamePrefix(typeName);

            if (this.registeredComponents[typeId] !== undefined)
            {
                TundraLogging.getLogger("Scene").error("Component with type id", typeId, "(" + this.registeredComponents[typeId].typeName + ") already registered!");
                return false;
            }
            this.registeredComponents[typeId] = {
                "typeId"    : typeId,
                "typeName"  : typeName,
                "prototype" : componentClass
            };
            if (TundraSDK.framework.scene != null)
                TundraSDK.framework.scene._logComponentRegistration(this.registeredComponents[typeId]);
            return true;
        },

        componentPropertyNames : (function() {
            var result = [];
            for (var compTypeId in Network.components)
                result.push(IComponent.propertyName(Network.components[compTypeId]));
            return result;
        }())
    },

    /**
        Utility function for log prints. Converts entity's id and name to a string and returns it.
        @method toString
        @return {String}
    */
    toString : function()
    {
        return "id=" + this.id + " entities=" + this.entities.length;
    },

    postInitialize : function()
    {
        this.postInitialized = true;
        var comps = Scene.registeredComponentsList();
        for (var i = 0; i < comps.length; i++)
            this._logComponentRegistration(comps[i]);

        TundraSDK.framework.console.registerCommand("dumpScene", "Dumps the scene to browsers developer console",
            "(string) Optional entity name if you want to print a single entity", this, this.onDumpScene);
    },

    _logComponentRegistration : function(compData)
    {
        if (TundraSDK.framework.scene != null && TundraSDK.framework.scene.postInitialized === true)
        {
            var implName = (compData.prototype.implementationName !== undefined ? compData.prototype.implementationName + " " : "");
            TundraSDK.framework.scene.log.debug("Registered " + implName + compData.typeName);
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

        This function is called by EC_Name when a name change occurs
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

        @example
            TundraSDK.framework.scene.onReset(null, function(scene) {
                console.log("Scene reseted: " + scene.id);
            });

        @method onReset
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onReset : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("Scene.Reset", context, callback);
    },

    /**
        Registers a callback for entity created event.

            function onEntityCreated(entity)
            {
                // entity == Entity
                console.log("Entity", entity.id, entity.name, "created");
            }

            TundraSDK.framework.scene.onEntityCreated(null, onEntityCreated);

        @method onEntityCreated
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onEntityCreated : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("Scene.EntityCreated", context, callback);
    },

    /**
        Registers a callback for entity removed event.

            function onEntityRemoved(entity)
            {
                // entity == Entity
            }

            TundraSDK.framework.scene.onEntityRemoved(null, onEntityRemoved);

        @method onEntityRemoved
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onEntityRemoved : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("Scene.EntityRemoved", context, callback);
    },

    /**
        Registers a callback for component created event.

            function onComponentCreated(entity, component)
            {
                // entity == Entity
                // component == IComponent or one of its implementations.
                console.log("Entity", entity.id, entity.name, "got a new component: " + component.typeName);
            }

            TundraSDK.framework.scene.onComponentCreated(null, onComponentCreated);

        @method onComponentCreated
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onComponentCreated : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("Scene.ComponentCreated", context, callback);
    },

    /**
        Registers a callback for component removed event.
        @example
            function onComponentRemoved(entity, component)
            {
                // entity == Entity
                // component == IComponent or one of its implementations.
            }

            TundraSDK.framework.scene.onComponentRemoved(null, onComponentRemoved);

        @method onComponentRemoved
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onComponentRemoved : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("Scene.ComponentRemoved", context, callback);
    },

    /**
        Registers a callback for all attribute changes in the scene.
        @example
            TundraSDK.framework.scene.onAttributeChanged(null,
                function(entity, component, attributeIndex, attributeName, newValue) {
                    console.log(entity.name, component.id, attributeName, "=", newValue);
            });

        @method onAttributeChanged
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAttributeChanged : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("Scene.AttributeChanged", context, callback);
    },

    /**
        Registers a callback for entity actions. See {{#crossLink "core/scene/EntityAction"}}{{/crossLink}} for the event parameter.
        @example
            function onEntityAction(entityAction)
            {
                // entityAction == EntityAction
            }

            TundraSDK.framework.scene.onEntityAction(null, onEntityAction);

        @method onEntityAction
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onEntityAction : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("Scene.EntityAction", context, callback);
    },

    _publishEntityCreated : function(entity)
    {
        if (entity == null)
        {
            console.log("ERROR: Scene trying to publish EntityCreated with null entity!");
            return;
        }

        TundraSDK.framework.events.send("Scene.EntityCreated", entity);
    },

    _publishEntityRemoved : function(entity)
    {
        if (entity == null)
        {
            console.log("ERROR: Scene trying to publish EntityRemoved with null entity!");
            return;
        }

        TundraSDK.framework.events.send("Scene.EntityRemoved", entity);

        // This entity will be removed. Unregister all callbacks.
        var idStr = entity.id.toString();
        TundraSDK.framework.events.remove("Scene.ComponentCreated." + idStr);
        TundraSDK.framework.events.remove("Scene.ComponentRemoved." + idStr);
        TundraSDK.framework.events.remove("Scene.AttributeChanged." + idStr);
        TundraSDK.framework.events.remove("Scene.EntityAction." + idStr);
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

        TundraSDK.framework.events.send("Scene.ComponentCreated", entity, component);
        TundraSDK.framework.events.send("Scene.ComponentCreated." + entity.id.toString(), entity, component);
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

        TundraSDK.framework.events.send("Scene.ComponentRemoved", entity, component);
        TundraSDK.framework.events.send("Scene.ComponentRemoved." + entity.id.toString(), entity, component);
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

        TundraSDK.framework.events.send("Scene.EntityAction", entityAction);
        TundraSDK.framework.events.send("Scene.EntityAction." + entityAction.entity.id.toString(), entityAction);
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

        TundraSDK.framework.events.send("Scene.AttributeChanged",
            entity, attribute.owner, attribute.index, attribute.name, clone);
        TundraSDK.framework.events.send("Scene.AttributeChanged." + entId,
            entity, attribute.owner, attribute.index, attribute.name, clone);
        TundraSDK.framework.events.send("Scene.AttributeChanged." + entId + "." + compId,
            entity, attribute.owner, attribute.index, attribute.name, clone);
        TundraSDK.framework.events.send("Scene.AttributeChanged." + entId + "." + compId + "." + attrIndex,
            clone);
    },

    _initComponentProperties : function(entity)
    {
        for (var cti = Scene.componentPropertyNames.length - 1; cti >= 0; cti--)
        {
            var propertyName = Scene.componentPropertyNames[cti]

            // We dont want EC_Name to override the name of the entity.
            // ent.name = "whee" etc. will be correctly redirected to EC_Name.
            if (propertyName === "name")
                continue;

            entity[propertyName] = null;
            if (propertyName !== propertyName.toLowerCase())
                entity[propertyName.toLowerCase()] = null;
        };
    },

    /**
        Gets and allocates the next local free entity id.
        @method nextFreeIdLocal
        @return {Number} The free id
    */
    nextFreeIdLocal : function()
    {
        for (var entId = 100000; entId < 200000; ++entId)
        {
            if (this.entityById(entId) == null)
                return entId;
        }
        return -1;
    },

    /**
        Gets and allocates the next replicated free entity id.
        @method nextFreeId
        @return {Number} The free id
    */
    nextFreeId  : function()
    {
        for (var entId = 1; entId < 100000; ++entId)
        {
            if (this.entityById(entId) == null)
                return entId;
        }
        return -1;
    },

    /**
        Resets the scene state. Deletes all entities.
        @method reset
    */
    reset : function()
    {
        this.id = 1;
        while (this.entities.length > 0)
        {
            var ent = this.entities[0];
            if (ent != null)
                ent.reset();
            this.entities.splice(0, 1);
        }
        this.entities = [];

        TundraSDK.framework.events.remove("Scene.EntityCreated");
        TundraSDK.framework.events.remove("Scene.EntityRemoved");
        TundraSDK.framework.events.remove("Scene.ComponentCreated");
        TundraSDK.framework.events.remove("Scene.ComponentRemoved");
        TundraSDK.framework.events.remove("Scene.EntityAction");

        TundraSDK.framework.events.send("Scene.Reset", this);
    },

    update : function(frametime)
    {
    },

    /**
        Creates new local entity that contains the specified components. To create an empty entity, omit the components parameter.
        @method createLocalEntity
        @param {Array} [components=Array()] Optional list of component names the entity will use. If omitted or the list is empty, creates an empty entity.
        @param {AttributeChange} [change=AttributeChange.LocalOnly] Change signaling mode. Note: Only AttributeChange.LocalOnly is supported at the moment!
        @param {Boolean} [componentsReplicated=false] Whether created components will be replicated.
        @return {Entity|null} The entity if created, otherwise null.
    */
    createLocalEntity : function(components, change, componentsReplicated)
    {
        if (components === undefined || components === null)
            components = [];
        if (change === undefined || change === null)
            change = AttributeChange.LocalOnly;
        if (componentsReplicated === undefined || componentsReplicated === null || typeof componentsReplicated !== "boolean")
            componentsReplicated = false;

        return this.createEntity(this.nextFreeIdLocal(), components, change, false, componentsReplicated)
    },

    /**
        Creates new entity that contains the specified components. To create an empty entity, omit the components parameter.
        @method createEntity
        @param {Number} [id=0] Id of the new entity. Specify 0 to use the next free ID
        @param {Array} [components=Array()] Optional list of component names the entity will use. If omitted or the list is empty, creates an empty entity.
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode. Note: Only AttributeChange.LocalOnly is supported at the moment!
        @param {Boolean} [replicated=true] Whether entity is replicated.
        @param {Boolean} [componentsReplicated=true] Whether created components will be replicated.
        @return {Entity|null} The entity if created, otherwise null.
    */
    createEntity : function(id, components, change, replicated, componentsReplicated)
    {
        if (id === undefined || id === null || typeof id !== "number")
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

        if (replicated === undefined || replicated === null || typeof replicated !== "boolean")
            replicated = true;
        if (componentsReplicated === undefined || componentsReplicated === null || typeof componentsReplicated !== "boolean")
            componentsReplicated = true;

        var entity = new Entity();
        entity.replicated = replicated;
        entity.local = !entity.replicated;
        entity.setId((id != 0 ? id : (entity.replicated ? this.nextFreeId() : this.nextFreeIdLocal())));

        // Init component shorthand properties.
        this._initComponentProperties(entity);

        // Add entity: Sets parent scene and updates components.
        this.addEntity(entity);

        // Create components
        for (var i = 0; i < components.length; ++i)
        {
            var compTypeName = IComponent.ensureComponentNamePrefix(components[i]);
            var component = entity.createComponent(compTypeName, null, (componentsReplicated ? AttributeChange.Replicate : AttributeChange.LocalOnly));
        }

        // Update entity once more now that it has all components
        if (components.length > 0)
            entity.update();

        return entity;
    },

    /**
        Adds entity to this scene.
        @method addEntity
        @param {Entity} entity
        @return {Boolean} True if added successfully, otherwise false.
    */
    addEntity : function(entity)
    {
        this.entities.push(entity);
        entity.setParent(this);
        entity.update();

        // Send event
        this._publishEntityCreated(entity);

        return true;
    },

    /**
        Removes entity from this scene by id.
        @method removeEntity
        @param {Number} entityId
        @return {Boolean} True if removed, otherwise false.
    */
    removeEntity : function(entityId)
    {
        for (var i = this.entities.length - 1; i >= 0; i--)
        {
            if (this.entities[i].id === entityId)
            {
                var ent = this.entities[i];
                if (ent != null)
                {
                    // Send event
                    this._publishEntityRemoved(ent);
                    ent.reset();
                }
                this.entities.splice(i, 1);
                ent = null;
                return true;
            }
        }
        return false;
    },

    /**
        Returns entity with given id, or null if not found.
        @method entityById
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
        @method entityByName
        @param {String} name
        @return {Entity|null}
    */
    entityByName : function(name)
    {
        for (var i = this.entities.length - 1; i >= 0; i--)
        {
            if (this.entities[i].name === name)
                return this.entities[i];
        }
        return null;
    },

    /**
        Returns list of entities that contains a component with given type/name.
        @method entitiesWithComponent
        @param {String|Number} type Type name of the component e.g. "Placeable" or type id of the component.
        @param {String} [name=undefined] Optional component name on top of the type e.g. "MyThing".
        @return {Array} List of Entity objects.
    */
    entitiesWithComponent : function(type, name)
    {
        var ents = [];
        if (type == null && name == null)
            return ents;

        var queryById = (typeof type != "string");

        for (var i=this.entities.length-1; i>=0; i--)
        {
            var component = (queryById ? this.entities[i].componentById(type) : this.entities[i].component(type));
            if (component != null)
            {
                if (name == null)
                    ents.push(this.entities[i]);
                else if (component.name == name)
                    ents.push(this.entities[i]);
            }
        }
        return ents;
    },

    /**
        Returns list of entities that contains components with given types.
        @method entitiesWithComponents
        @param {Array} types Array or type names/ids of the component e.g. "Placeable" and "Mesh" or type id of the component.
        @return {Array} List of Entity objects.
    */
    entitiesWithComponents : function(types)
    {
        var ents = [];
        if (types == null || types.length === undefined || types.length <= 0)
            return ents;

        var queryById = (typeof types[0] !== "string");

        for (var i=this.entities.length-1; i>=0; i--)
        {
            for (var ti=0, tilen=types.length; ti<tilen; ++ti)
            {
                var component = (queryById ? this.entities[i].componentById(types[ti]) : this.entities[i].component(types[ti]));
                if (component != null)
                {
                    if (name == null)
                        ents.push(this.entities[i]);
                    else if (component.name == name)
                        ents.push(this.entities[i]);
                }
            }
        }
        return ents;
    },

    /**
        Returns all components from the scene with given type/name.
        @method components
        @param {String|Number} type Type name of the component e.g. "Placeable" or type id of the component.
        @param {String} [name=""] Optional component name on top of the type e.g. "MyThing".
        @return {Array} List of IComponent or its implementation objects.
    */
    components : function(type, name)
    {
        var comps = [];
        var ents = this.entitiesWithComponent(type, name);
        for (var i = ents.length - 1; i >= 0; i--)
            comps.push(ents[i].component(type));
        return comps;
    },

    /**
        Creates a new non-parented Tundra Component by type name.
        The component id will be set to -1, the caller is responsible
        for initializing the id to a sane value.
        @method createComponent
        @param {String} typeName Component type name.
        @param {String} [compName=""] Component name.
        @return {IComponent} The created component.
    */
    createComponent : function(typeName, compName)
    {
        if (typeName === undefined || typeName === null)
            return null;
        if (compName === undefined || compName === null)
            compName = "";
        if (typeof compName !== "string")
        {
            this.log.error("createComponent called with non-string component name.");
            return null;
        }

        var typeId = -1;
        var findTypeName = IComponent.ensureComponentNamePrefix(typeName);
        for (var typeIdIter in Network.components)
        {
            if (Network.components[typeIdIter] === findTypeName)
            {
                typeId = parseInt(typeIdIter);
                break;
            }
        }
        if (typeId == -1)
        {
            this.log.error("createComponent could not find component implementation for '" + typeName + "'");
            return null;
        }
        return this.createComponentById(-1, typeId, compName);
    },

    /**
        Creates a new non-parented Tundra Component by id and with optional attribute binary data.
        Used when exact component information is known, e.g. it was sent from server.
        @method createComponentById
        @param {Number} compId Component id.
        @param {Number} compTypeId Component type id.
        @param {String} [compName=""] Component name.
        @param {DataDeserializer} [ds=undefined] Data deserializer for attribute data.
        If null or undefined deserialization from binary data is skipped.
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
                component = this._createComponentImpl(componentImpl, compId, compTypeId, compName);
            }
            catch (e)
            {
                this.log.error("Failed to instantiate registered component " + componentImpl.typeName + ": " + e);
                if (console.error != null)
                    console.error(e);
                return;
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
                this.log.warn("Component type name could not be resolved from ID " + compTypeId);

            // Generic component. Attribute parsing not implemented.
            component = new IComponent(compId, compTypeId, typeName, compName);
            component.notImplemented = true;
        }
        return component;
    },

    _createComponentImpl : function(componentImpl, compId, compTypeId, compName)
    {
        return (new componentImpl.prototype(compId, compTypeId, componentImpl.typeName, compName));
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
        /// @note This entity id u16 is probably a sync manger hack for web socket!
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
            if (TundraSDK.framework.client.networkDebugLogging)
                this.log.error("Failed to find entity with id " + message.entityAction.entityId + " to execute Entity action on!", true);
            return;
        }
        this._publishEntityAction(message.entityAction);
    },

    handleCreateEntityMessage : function(entityId, ds)
    {
        // New entity
        var entity = this.createEntity(entityId, [], AttributeChange.Replicate, true, true);
        entity.temporary = ds.readBoolean();

        // Components
        var numComponents = ds.readVLE();
        for (var i=0; i<numComponents; ++i)
        {
            if (!this.createComponentFromBinary(entity, ds))
            {
                this.log.error("Failed to create Component to a newly created Entity " + entityId);
                return;
            }
        }
    },

    handleRemoveEntityMessage : function(entityId)
    {
        if (this.removeEntity(entityId))
            return;

        if (TundraSDK.framework.client.networkDebugLogging)
            this.log.error("Failed to find Entity with id " + entityId + " for removal!");
    },

    handleCreateComponentsMessage : function(entityId, ds)
    {
        var entity = this.entityById(entityId);
        if (entity == null)
        {
            if (TundraSDK.framework.client.networkDebugLogging)
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
            if (TundraSDK.framework.client.networkDebugLogging)
                this.log.error("Failed to remove Components. Entity with id " + entityId + " was not found!");
            return;
        }

        while (ds.bytesLeft() >= 1)
        {
            var compId = ds.readVLE();
            if (entity.removeComponent(compId))
                continue;

            if (TundraSDK.framework.client.networkDebugLogging)
                this.log.error("Failed to remove Component with id " + compId + " from Entity " + entityId);
            return;
        }
    },

    handleCreateAttributesMessage : function(entityId, ds)
    {
        var entity = this.entityById(entityId);
        if (entity == null)
        {
            if (TundraSDK.framework.client.networkDebugLogging)
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
            else if (TundraSDK.framework.client.networkDebugLogging)
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
            if (TundraSDK.framework.client.networkDebugLogging)
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
                if (TundraSDK.framework.client.networkDebugLogging)
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
            if (TundraSDK.framework.client.networkDebugLogging)
                this.log.error("Failed to update Attributes. Entity with id " + entityId + " was not found!");
            return;
        }

        var array = null;
        var bufferView = null;
        var _ds = null;

        while (ds.bytesLeft() >= 2)
        {
            var compId = ds.readVLE();
            var component = entity.componentById(compId);
            if (component == null)
            {
                if (TundraSDK.framework.client.networkDebugLogging)
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

            // Read all bytes to bits for inspection.
            var bitArray = ds.readBits(totalBytes);

            // Control bit
            // 1 = Bitmask
            // 0 = Indices
            if (bitArray.get(0) === 1)
            {
                for(var i=1, bitmaskAttributeIndex=0; i<bitArray.size; ++i, ++bitmaskAttributeIndex)
                {
                    // Change bit
                    // 1 = attribute changed
                    // 0 = no change
                    if (bitArray.get(i) === 0)
                        continue;

                    var bitIndex = i+1;

                    var attribute = component.getAttributeByIndex(bitmaskAttributeIndex);
                    if (attribute === undefined || attribute === null)
                    {
                        // Don't log an error as some component web implementation might not declare all attributes!
                        //this.log.error("EditAttributesMessage 'bitmask' deserialization could not find attribute with index " + bitmaskAttributeIndex);
                        return;
                    }

                    // Read potential header
                    var len = attribute.sizeBytes;
                    if (len === undefined)
                    {
                        array = new Uint8Array(attribute.headerSizeBytes);
                        bufferView = new DataView(array.buffer);
                        for (var hi = 0; hi<attribute.headerSizeBytes; hi++)
                        {
                            var byte = DataDeserializer.readByteFromBits(bitArray, bitIndex);
                            bufferView.setUint8(hi, byte);
                            bitIndex += 8;
                        }
                        _ds = new DataDeserializer(array.buffer);
                        len = attribute.headerFromBinary(_ds);
                        i += (attribute.headerSizeBytes * 8);
                        if (len === undefined)
                            return;
                    }

                    // Read data
                    if (attribute.typeId !== Attribute.AssetReferenceList &&
                        attribute.typeId !== Attribute.QVariantList)
                    {
                        array = new Uint8Array(len);
                        bufferView = new DataView(array.buffer);
                        for (var di = 0; di<len; di++)
                        {
                            var byte = DataDeserializer.readByteFromBits(bitArray, bitIndex);
                            bufferView.setUint8(di, byte);
                            bitIndex += 8;
                        }
                        _ds = new DataDeserializer(array.buffer);
                        var readDataBytes = attribute.dataFromBinary(_ds, len);
                        i += (readDataBytes * 8);
                    }
                    else
                    {
                        // Do string list types by hand here, as we don't
                        // have enough information inside Attribute.dataFromBinary.
                        attribute.value = [];

                        // String list length
                        var totalLenght = 0;
                        for (var di = 0; di<len; di++)
                        {
                            // 255 max length for string
                            array = new Uint8Array(255);
                            bufferView = new DataView(array.buffer);

                            // Read individual string
                            var stringLen = DataDeserializer.readByteFromBits(bitArray, bitIndex);
                            bitIndex += 8;

                            for (var si=0; si<stringLen; ++si)
                            {
                                var byte = DataDeserializer.readByteFromBits(bitArray, bitIndex);
                                bufferView.setUint8(si, byte);
                                bitIndex += 8;
                            }
                            _ds = new DataDeserializer(bufferView.buffer, 0, stringLen);
                            attribute.value.push(_ds.readString(stringLen, false));
                            totalLenght += stringLen + 1;
                        }

                        i += (totalLenght * 8);
                        attribute.set(attribute.value, AttributeChange.LocalOnly);
                    }
                }
            }
            else
            {
                // Unroll bits back to bytes skipping the control bit
                array = new Uint8Array(totalBytes);
                bufferView = new DataView(array.buffer);
                for(var i=1, byteIndex=0; i<bitArray.size; i+=8, ++byteIndex)
                {
                    var byte = DataDeserializer.readByteFromBits(bitArray, i);
                    bufferView.setUint8(byteIndex, byte);
                }

                _ds = new DataDeserializer(array.buffer);
                var changeCount = _ds.readU8();
                for (var ci=0; ci<changeCount; ++ci)
                {
                    var attributeIndex = _ds.readU8();
                    component.deserializeAttributeFromBinary(attributeIndex, _ds);
                }
            }
        }
    }
});

return Scene;

}); // require js
