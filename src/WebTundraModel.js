"use strict";
// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *	@author Erno Kuusela
 *      @author Tapani Jamsa
 */
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals */
/* global WebSocketClient, Scene, SyncManager */
/* global EC_Mesh, EC_Placeable, EC_Light, EC_Camera */
/* global cComponentTypePlaceable, cComponentTypeMesh, componentTypeIds */

var scene = null; // for networking code
var watchEntity = null;

function WebTundraModel() {
    this.client = new WebSocketClient();
    this.scene = new Scene();
    scene = this.scene;
    this.syncManager = new SyncManager(this.client, this.scene);
    this.syncManager.logDebug = false;
    this.loginData = {
        "name": "Test User"
    };
}

WebTundraModel.prototype = {
    constructor: WebTundraModel,

    connectClient: function(host, port) {
        this.client.connect(host, port, this.loginData);
    }
};

function signalWhenAttributePreconditionOk(
/* Notes:
       - this can be used even when the component is not present yet
       - this is multi-shot (subsequent attribute changes)
    */
entity, componentTypeId, targetAttributeId, condFunc, mySignal) {
    var onGotComponent = function(entity, component) {
        if (entity.id == watchEntity)
            console.log("watchEntity precond 2");

        var currentAttribute = component.attributeById(targetAttributeId);
        if (currentAttribute !== null) {
            var statusNow = condFunc(currentAttribute);
            if (statusNow) {
                mySignal.dispatch(component, currentAttribute);
                return;
            }
        }
        var onAttributeChanged = function(changedAttribute, changeType) {
            if (entity.id == watchEntity)
                console.log("watchEntity precond 3.1", changedAttribute);
            if (targetAttributeId !== changedAttribute.id)
                return;
            var status = condFunc(changedAttribute);
            if (!status)
                return;
            mySignal.dispatch(changedAttribute.owner, changedAttribute);
        };

        component.attributeChanged.add(onAttributeChanged);

        var onAttributeAdded = function(changedComponent, changedAttribute, changeType) {
            if (entity.id == watchEntity)
                console.log("watchEntity precond 3.2");
            if (targetAttributeId !== changedAttribute.id)
                return;
            var status = condFunc(changedAttribute);
            if (!status)
                return;
            mySignal.dispatch(changedComponent, changedAttribute);
            component.attributeAdded.remove(onAttributeAdded);
        };

        component.attributeAdded.add(onAttributeAdded);
    };
    if (entity.id == watchEntity)
        console.log("watchEntity precond 1", entity.componentByType(componentTypeId));
    var gotComponentSig = new signals.Signal();
    gotComponentSig.add(onGotComponent);
    /* rely on signalWhenComponenTypePresent to handle the case where
       component already exists */
    signalWhenComponentTypePresent(entity, componentTypeId, gotComponentSig);
}

function signalWhenComponentTypePresent(entity, typeId, mySignal) {
    if (typeof typeId == 'string' || typeId instanceof String)
        typeId = componentTypeIds[typeId];

    var currentComponent = entity.componentByType(typeId);
    if (currentComponent !== null) {
        mySignal.dispatch(entity, currentComponent);
        return;
    }
    var onComponentAdded = function(newComponent, changeType) {
        if (newComponent === null) {
            // can happen with unknown component type from server
            return;
        }
        if (entity.id == watchEntity)
            console.log("watchEntity present 2");
        if (newComponent.typeId === typeId) {
            mySignal.dispatch(entity, newComponent);
            entity.componentAdded.remove(onComponentAdded);
        }
    };
    if (entity.id == watchEntity)
        console.log("watchEntity present 1");
    entity.componentAdded.add(onComponentAdded);
}
