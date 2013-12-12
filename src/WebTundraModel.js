"use strict";
// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *	@author Erno Kuusela
 *      @author Tapani Jamsa
 */
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals */
/* global WebSocketClient, Scene, SyncManager, EC_Mesh, EC_Placeable */
/* global cComponentTypePlaceable, cComponentTypeMesh, componentTypeIds */

var scene = null; // for networking code

function WebTundraModel() {
    this.client = new WebSocketClient();
    this.scene = new Scene();
    scene = this.scene;
    this.syncManager = new SyncManager(this.client, this.scene);
    this.syncManager.logDebug = false;
    this.loginData = {
	"name": "Test User"
    };
    this.host = "localhost";
    this.port = 2345;

    if (useSignals) {
        this.meshComponentReady = new signals.Signal();
        this.scene.entityCreated.add(this.onEntityCreated.bind(this));
    }
}

WebTundraModel.prototype = {
    constructor: WebTundraModel,

    connectClient: function() {
	this.client.connect(this.host, this.port, this.loginData);
    },
    onEntityCreated: function(newEntity, changeType) {
        var havePlaceable = new signals.Signal();
        var haveGoodMeshAssetRef = new signals.Signal();
        var meshGood = new signals.CompoundSignal(haveGoodMeshAssetRef, havePlaceable);
        var thisIsThis = this;
        meshGood.add(function(meshInfo, placeableInfo) {
            thisIsThis.meshComponentReady.dispatch(placeableInfo[0], placeableInfo[1],
                                                   meshInfo[0]);
        });  
        signalWhenComponentTypePresent(newEntity, cComponentTypePlaceable, havePlaceable);
        
        var meshRefOk = function(assetref) {
            return assetref.value.ref !== "";
        };
        signalWhenAttributePreconditionOk(newEntity, cComponentTypeMesh, "meshRef",
                                          meshRefOk, haveGoodMeshAssetRef);
    },
    
};



function signalWhenAttributePreconditionOk(entity, componentTypeId, targetAttributeId, condFunc, mySignal) {
    var onGotComponent = function(entity, component) {
        if (entity.id == 55)
            console.log("55 precond 2");

        var currentAttribute = component.attributeById(targetAttributeId);
        if (currentAttribute !== null) {
            var statusNow = condFunc(currentAttribute);
            if (statusNow) {
                mySignal.dispatch(component, currentAttribute);
                return;
            }
        }
        var onAttributeChanged = function(changedAttribute, changeType) {
            if (entity.id == 55)
                console.log("55 precond 3.1", changedAttribute);
            if (targetAttributeId !== changedAttribute.id)
                return;
            var status = condFunc(changedAttribute);
            if (!status)
                return;
            mySignal.dispatch(changedAttribute.owner, changedAttribute);
            component.attributeChanged.remove(onAttributeChanged);
        };
        
        component.attributeChanged.add(onAttributeChanged);

        var onAttributeAdded = function(changedComponent, changedAttribute, changeType) {
            if (entity.id == 55)
                console.log("55 precond 3.2");
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
    if (entity.id == 55)
        console.log("55 precond 1", entity.componentByType(componentTypeId));
    var gotComponentSig = new signals.Signal();
    gotComponentSig.add(onGotComponent);
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
        if (entity.id == 55)
            console.log("55 present 2");
        if (newComponent.typeId === typeId) {
            mySignal.dispatch(entity, newComponent);
            entity.componentAdded.remove(onComponentAdded);
        }
    };
    if (entity.id == 55)
        console.log("55 present 1");
    entity.componentAdded.add(onComponentAdded);
}



