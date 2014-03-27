"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global signals, Tundra */
// For conditions of distribution and use, see copyright notice in LICENSE

if (Tundra === undefined)
    var Tundra = {};

Tundra.componentTypeNames = {};
Tundra.componentTypeIds = {};
Tundra.componentFactories = {};
Tundra.customComponentTypes = {};
Tundra.customComponentRegistered = new signals.Signal();

function Component(typeId) {
    this.parentEntity = null;
    this.typeId = typeId;
    this.name = "";
    this.id = 0;
    this.supportsDynamicAttributes = false;
    this.attributes = [];
    this.attributeChanged = new signals.Signal();
    this.attributeAdded = new signals.Signal();
    this.attributeRemoved = new signals.Signal();
    this.parentEntitySet = new signals.Signal();
}

Component.prototype = {
    // Add a new static attribute at initialization
    addAttribute: function(typeId, id, name, value) {
        var newAttr = Tundra.createAttribute(typeId);
        if (newAttr != null) {
            newAttr.name = name;
            newAttr.id = id;
            newAttr.owner = this;
            if (value != null)
                newAttr.value = value;
            newAttr.index = this.attributes.length;
            this.attributes.push(newAttr);
            this.registerAttributeAsProperty(id, newAttr);
            return newAttr;
        }
        else
            return null;
    },
    
    // Create a dynamic attribute during runtime
    createAttribute: function(index, typeId, name, value, changeType) {
        if (!this.supportsDynamicAttributes) {
            console.log("Component " + this.typeName + " does not support adding dynamic attributes");
            return null;
        }
        var newAttr = createAttribute(typeId);
        if (newAttr != null) {
            newAttr.name = name;
            newAttr.id = name; // For dynamic attributes name == id
            newAttr.owner = this;
            if (value != null)
                newAttr.value = value;
            newAttr.index = index;
            newAttr.dynamic = true;

            // If needed, make "holes" to the attribute list
            while (this.attributes.length < index)
                this.attributes.push(null);
            if (this.attributes.length == index)
                this.attributes.push(newAttr)
            else
                this.attributes[index] = newAttr;

            this.registerAttributeAsProperty(newAttr.id, newAttr);

            if (changeType == null || changeType == Tundra.AttributeChange.Default)
                changeType = this.local ? Tundra.AttributeChange.LocalOnly : Tundra.AttributeChange.Replicate;
            if (changeType != Tundra.AttributeChange.Disconnected)
            {
                // Trigger scene level signal
                if (this.parentEntity && this.parentEntity.parentScene)
                    this.parentEntity.parentScene.emitAttributeAdded(this, newAttr, changeType);
                // Trigger component level signal
                this.attributeAdded.dispatch(newAttr, changeType);
            }
            
            return newAttr;
        }
        else
            return null;
    },

    registerAttributeAsProperty : function(id, attr) {
        var propName = Tundra.sanitatePropertyName(id);
        //based on http://stackoverflow.com/questions/1894792/determining-if-a-javascript-object-has-a-given-property
        //instead of hasOwnProperty to not create confusion if someone creates an EC called 'prototype' or so.
        if (!(propName in this)) {
            Object.defineProperty(this, propName, 
                                  {get: function() { return attr.value; },
                                   set: function(changedVal) { attr.value = changedVal; },
                                   enumerable : true,
                                   configurable : true}); //allows deleting the prop
        }
    },

    // Remove a dynamic attribute during runtime
    removeAttribute : function(index, changeType) {
        if (!this.supportsDynamicAttributes) {
            console.log("Component " + this.typeName + " does not support dynamic attributes");
            return null;
        }
        if (index < this.attributes.length && this.attributes[index] != null) {
            var attr = this.attributes[index];

            // Remove direct named access
            var propName = Tundra.sanitatePropertyName(attr.id);
            if (this[propName] === attr)
                delete this[propName];
            if (index == this.attributes.length - 1)
                this.attributes.splice(index, 1);
            else
                this.attributes[index] = null; // Leave hole if necessary

            if (changeType == null || changeType == Tundra.AttributeChange.Default)
                changeType = this.local ? Tundra.AttributeChange.LocalOnly : Tundra.AttributeChange.Replicate;
            if (changeType != Tundra.AttributeChange.Disconnected)
            {
                // Trigger scene level signal
                if (this.parentEntity && this.parentEntity.parentScene)
                    this.parentEntity.parentScene.emitAttributeRemoved(this, attr, changeType);
                // Trigger component level signal
                this.attributeRemoved.dispatch(attr, changeType);
            }
        }
    },
    

    // Look up and return attribute by id
    attributeById : function(id) {
        for (var i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i] != null && this.attributes[i].id == id)
                return this.attributes[i];
        }
        return null;
    },

    // Look up and return attribute by name
    attributeByName : function(name) {
        for (var i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i] != null && this.attributes[i].name == name)
                return this.attributes[i];
        }
        return null;
    },

    get typeName(){
        return Tundra.componentTypeNames[this.typeId];
    },

    get local(){
        return this.id >= Tundra.cFirstLocalId;
    },

    get unacked(){
        return this.id >= Tundra.cFirstUnackedId && this.id < Tundra.cFirstLocalId;
    },
    
    // Trigger attribute change signal. Called by Attribute
    emitAttributeChanged : function(attr, changeType) {
        if (changeType == null || changeType == Tundra.AttributeChange.Default)
            changeType = this.local ? Tundra.AttributeChange.LocalOnly : Tundra.AttributeChange.Replicate;
        if (changeType == Tundra.AttributeChange.Disconnected)
            return;

        // Trigger scene level signal
        if (this.parentEntity && this.parentEntity.parentScene)
            this.parentEntity.parentScene.emitAttributeChanged(this, attr, changeType);

        // Trigger component level signal
        this.attributeChanged.dispatch(attr, changeType);
    }
}

// This function is meant for ordinary components that have a C++ counterpart in the Tundra server
function registerComponent(typeId, typeName, factory) {
    console.log("Registering component typeId " + typeId + " typename " + typeName);
    Tundra.componentTypeNames[typeId] = typeName;
    Tundra.componentTypeIds[typeName] = typeId;
    Tundra.componentFactories[typeId] = factory;
}

// This function registers a static-structured component without C++ counterpart in the server.
// A blueprint component needs to be provided. SyncManager will replicate the attribute structure
// to the server when joining
function registerCustomComponent(typeName, blueprintComponent, changeType) {
    if (blueprintComponent == null)
        return;

    if (changeType == null)
        changeType = Tundra.AttributeChange.Default;

    // In WebTundra the convention is to use component typenames without EC_ prefix
    typeName = ensureTypeNameWithoutPrefix(typeName);

    // Calculate typeId if necessary
    var typeId = blueprintComponent.typeId;
    if (typeId === undefined || typeId === null || typeId == 0 || typeId == 0xffffffff)
        typeId = generateComponentTypeId(typeName)

    console.log("Registering custom component typeId " + typeId + " typename " + typeName);

    Tundra.componentTypeNames[typeId] = typeName;
    Tundra.componentTypeIds[typeName] = typeId;
    Tundra.componentFactories[typeId] = function() {
        var comp = new Component(typeId);
        var attributes = blueprintComponent.attributes;

        for (var i = 0; i < attributes.length; ++i)
            comp.addAttribute(attributes[i].typeId, attributes[i].id, attributes[i].name);

        return comp;
    }

    // Remember the type and signal for the SyncManager
    Tundra.customComponentTypes[typeId] = typeName;
    Tundra.customComponentRegistered.dispatch(typeId, typeName, changeType);
}

function ensureTypeNameWithPrefix(typeName) {
    if (typeName.indexOf("EC_") != 0)
        return "EC_" + typeName;
    else
        return typeName;
}

function ensureTypeNameWithoutPrefix(typeName) {
    if (typeName.indexOf("EC_") == 0)
        return typeName.substring(3);
    else
        return typeName;
}

function generateComponentTypeId(typeName)
{
    typeName = ensureTypeNameWithoutPrefix(typeName).toLowerCase();
    // SDBM hash function
    var h = 0;
    for (var i = 0; i < typeName.length; ++i) {
        h = typeName.charCodeAt(i) + (h << 6) + (h << 16) - h;
    }
    h &= 0xffff;
    h |= 0x10000;
    return h;
}

function createComponent(typeId) {
    // Convert typename to numeric ID if necessary
    if (typeof typeId == 'string' || typeId instanceof String)
        typeId = Tundra.componentTypeIds[ensureTypeNameWithoutPrefix(typeId)];
    if (Tundra.componentFactories.hasOwnProperty(typeId))
        return Tundra.componentFactories[typeId]();
    else
    {
        console.log("Could not create unknown component " + typeId);
        return null;
    }
}
