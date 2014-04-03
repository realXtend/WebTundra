
define([
        "core/framework/TundraSDK",
        "core/scene/IDomIntegration"
    ], function(TundraSDK, IDomIntegration) {

/**
    Tundra DOM integration synchronizes the Tundra scene into the current web page.

    @class TundraDomIntegration
    @extends IDomIntegration
    @constructor
*/
var TundraDomIntegration = IDomIntegration.$extend(
{
    __init__ : function()
    {
        this.$super("Tundra");

        this.state = {};
        this.sceneNode = null;
        this.enabled_ = true;

        Object.defineProperties(this, {
            enabled : {
                get : function () {
                    return this.enabled_;
                },
                set : function (value) {
                    if (typeof value !== "boolean" || this.enabled_ === value)
                        return
                    this.enabled_ = value;
                    this.onSceneReset(TundraSDK.framework.scene);
                }
            }
        });
    },

    load : function()
    {
        TundraSDK.framework.scene.onReset(this, this.onSceneReset);
        this.onSceneReset(TundraSDK.framework.scene);
    },

    unload : function()
    {
        if (this.sceneNode !== null)
            this.sceneNode.remove();

        this.state = {};
        this.sceneNode = null;
    },

    getOrCreateDomNode : function(entity, component, attribute)
    {
        var node = null;
        if (entity === undefined || entity === null)
            return node;

        // Node for Entity
        if (component === undefined || component === null)
        {
            node = this.state[entity.id];
            if (node === undefined)
            {
                node = $("<entity/>", {
                    "id"   : entity.id,
                    "replicated" : entity.replicated
                });
                if (entity.name != "")
                    node.attr("name", entity.name);
                this.state[entity.id] = node;
                this.sceneNode.append(node);
            }
            return node;
        }

        // Component in Entity
        if (attribute === undefined || attribute === undefined)
        {
            var parentNode = this.getOrCreateDomNode(entity);
            var children = parentNode.children(component.typeName);
            for (var i=0; i<children.length; ++i)
            {
                if (parseInt($(children[i]).attr("id")) === component.id)
                {
                    node = $(children[i]);
                    break;
                }
            }
            if (node === null)
            {
                node = $("<" + component.typeName + "/>", {
                    "id"   : component.id
                });
                if (component.name != "")
                    node.attr("name", component.name);
                parentNode.append(node);
            }
            return node;
        }

        // Attribute in Component
        var parentNode = this.getOrCreateDomNode(entity, component);
        var children = parentNode.children(attribute.name);
        for (var i=0; i<children.length; ++i)
        {
            if (parseInt($(children[i]).attr("idx")) === attribute.index)
            {
                node = $(children[i]);
                break;
            }
        }
        if (node === null)
        {
            node = $("<" + attribute.name + "/>", {
                "idx" : attribute.index,
                "type"  : attribute.typeName
            });
            parentNode.append(node);
        }
        return node;
    },

    removeDomNode : function(entity, component, attribute)
    {
        var node = this.getOrCreateDomNode(entity, component, attribute);
        node.remove();
        node = null;

        if (component === undefined || component === null)
            delete this.state[entity.id];
    },

    onSceneReset : function(scene)
    {
        this.unload();

        if (this.enabled_ !== true || scene === undefined || scene === null)
            return;

        this.state = {};
        this.sceneNode = $("<scene/>");
        $("body").append(this.sceneNode);

        // Hook to scene signals
        scene.onEntityCreated(this, this.onEntityCreated);
        scene.onEntityRemoved(this, this.onEntityRemoved);

        // Iterate current content
        for (var i = 0; i < scene.entities.length; i++)
        {
            var ent = scene.entities[i];
            this.onEntityCreated(ent);
            for (var i = 0; i < ent.components.length; i++)
                this.onComponentCreated(ent, ent.components[i]);
        }
    },

    onEntityCreated : function(entity)
    {
        if (this.sceneNode == null)
            return;

        this.getOrCreateDomNode(entity);

        entity.onComponentCreated(this, this.onComponentCreated);
        entity.onComponentRemoved(this, this.onComponentRemoved);
    },

    onEntityRemoved : function(entity)
    {
        if (this.sceneNode == null)
            return;

        this.removeDomNode(entity);
    },

    onComponentCreated : function(entity, component)
    {
        if (this.sceneNode == null)
            return;

        this.getOrCreateDomNode(entity, component);

        for (var i=0; i<component.attributeCount; ++i)
        {
            var attribute = component.getAttributeByIndex(i);
            this.onAttributeChanged(entity, component, attribute.index, attribute.name, attribute.getClone());
        }

        component.onAttributeChanged(this, this.onAttributeChanged);
    },

    onComponentRemoved : function(entity, component)
    {
        if (this.sceneNode == null)
            return;

        this.removeDomNode(entity, component);
    },

    onAttributeChanged : function(entity, component, attributeIndex, attributeName, attributeValue)
    {
        if (this.sceneNode == null)
            return;

        var attribute = component.getAttributeByIndex(attributeIndex);
        var node = this.getOrCreateDomNode(entity, component, attribute);
        try
        {
            node.text(attributeValue.toString());
        }
        catch(e)
        {
            TundraSDK.framework.client.logError("[DomIntegration]: Failed to convert Attribute with type '" + attribute.typeName + "' to string!", true);
        }
    }
});

return TundraDomIntegration;

}); // require js
