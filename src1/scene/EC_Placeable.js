"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global signals */
// For conditions of distribution and use, see copyright notice in LICENSE

if (Tundra === undefined)
    var Tundra = {};

Tundra.cComponentTypePlaceable = 20;

Tundra.EC_Placeable = function() {
    
    Tundra.Component.call(this, Tundra.cComponentTypePlaceable);
    this.addAttribute(Tundra.cAttributeTransform, "transform", "Transform");
    this.addAttribute(Tundra.cAttributeBool, "drawDebug", "Show bounding box", false);
    this.addAttribute(Tundra.cAttributeBool, "visible", "Visible", true);
    this.addAttribute(Tundra.cAttributeInt, "selectionLayer", "Selection layer", 1);
    this.addAttribute(Tundra.cAttributeEntityReference, "parentRef", "Parent entity ref");
    this.addAttribute(Tundra.cAttributeString, "parentBone", "Parent bone name");
    this.attributeChanged.add(this.onAttributeChanged, this);
    
    // entity this placeable is attach to.
    this.targetEntity = null;
    
    // Bone that this mesh is attached to.
    this.parentBone = null;

    this.parentEntitySet.add(this.connectToEntity.bind(this));

    this.parentRefReady = new signals.Signal();
    
};

Tundra.EC_Placeable.prototype = new Tundra.Component(Tundra.cComponentTypePlaceable);

Tundra.EC_Placeable.prototype.connectToEntity = function() {
    // When we are first added to the entity, check parent ref. Also re-check it if the entity is re-parented
    this.parentEntity.parentChanged.add(this.checkParentRef, this);
    this.checkParentRef();
};

Tundra.EC_Placeable.prototype.checkParentRef = function() {

    if (this.parentRef) {

        var parentEnt = this.parentEntity.parentScene.entityById(this.parentRef);
        if (parentEnt && parentEnt.componentByType(Tundra.cComponentTypePlaceable)) {
            
            this.setParentEntity(parentEnt);
            this.targetEntity = parentEnt;
            
            //XXX TODO: may break if the parent placeable is not ready yet
            //if there is a deeper hierarchy with multiple levels of parents
            //an ugly way to fix would be to add a 'ready' boolean.
            //same problem is in the waitParent case below
            
            this.parentRefReady.dispatch();

        } else {

            this.parentEntity.parentScene.entityCreated.add(this.waitParent, this);

        }
        
    } else {
        // If parent ref is not defined, fall back to the entity's parent, which may be null - in that case we are parented to the scene
        this.setParentEntity(this.parentEntity.parent);
        this.targetEntity = this.parentEntity.parent;
        this.parentRefReady.dispatch();
    }
};

Tundra.EC_Placeable.prototype.onAttributeChanged = function(attr, changeType) {
    
    if (attr.id === "visible") {
        
        this.setVisible(this.visible);
        
    }
    
    if (attr.id === "transform") {
        
        this.updateTransform();
        
    }
    
    if (attr.id === "parentRef") {
        
        this.checkParentRef();

    }

    if (attr.id === "parentRef" || attr.id === "parentBone") {

        this._updateParentRef();

    }
};

Tundra.EC_Placeable.prototype.setVisible = function( visible ) {};

Tundra.EC_Placeable.prototype.waitParent = function(addedEntity, changeType) {
    
    if (addedEntity.id === this.parentRef) {
        
        //console.log("placeable parent was there later");
        this.parentRefReady.dispatch();
        
        this.parentEntity.parentScene.entityCreated.remove(this.waitParent, this);
        
        this.targetEntity = this.parentEntity.parentScene.entityById(this.parentRef);
        
        this.setParentEntity(this.targetEntity);

    }
    
};

Tundra.EC_Placeable.prototype.updateTransform = function() {};

Tundra.EC_Placeable.prototype.setParentEntity = function ( entity ) {};

Tundra.EC_Placeable.prototype._targetMeshReady = function() {
    
    this._updateParentRef();
    
};
    
Tundra.EC_Placeable.prototype._targetEntityComponentAdded = function(entity, component) {
    
    if (entity.id == this.parentRef && component instanceof Tundra.EC_Mesh)
        this._updateParentRef();
    
};

// Check if placeable parentRef or parentBone has changed and update parent
// child hierachy based on the change.
Tundra.EC_Placeable.prototype._updateParentRef = function() {
    
    var placeable = this;
    if ( placeable == null )
        return;

    // If parent mesh id is set to null detach mesh from bone.

    var targetEntity;

    if ( placeable.parentRef == "" ) {

        if ( placeable.targetBone != null ) {
            placeable.targetBone.detach( placeable );
        }

        placeable.setParentEntity(null);
        return;

    } else if ( placeable.parentBone == "" && placeable.targetBone != null) {

        placeable.targetBone.detach( placeable );

        targetEntity = placeable.parentEntity.parentScene.entityById( placeable.parentRef );
        if (targetEntity)
            placeable.setParentEntity( targetEntity );

        return;

    }

    // Check if parent entity or mesh asset is ready. If not wait until they are created

    targetEntity = placeable.parentEntity.parentScene.entityById( placeable.parentRef );
    
    if (placeable.parentEntity.parentScene.componentAdded.has( this._targetEntityComponentAdded, this ))
        placeable.parentEntity.parentScene.componentAdded.remove( this._targetEntityComponentAdded, this );
    
    if ( targetEntity == null ) {

        placeable.parentEntity.parentScene.componentAdded.add( this._targetEntityComponentAdded, this );
        return;

    } else if ( targetEntity.mesh != null && !targetEntity.mesh.assetReady ) {

        targetEntity.mesh.meshAssetReady.addOnce( this._targetMeshReady, this );
        return;

    }

    // Check if we need to attach this mesh to bone.

    if ( placeable.parentBone == "" ) {

        placeable.setParentEntity( targetEntity );

    } else if ( targetEntity.mesh.skeleton != null ) {

        var bone = targetEntity.mesh.skeleton.getBone(placeable.parentBone);
        if ( bone != null) {

            bone.attach( placeable );
            return;

        }

    }

};

Tundra.registerComponent(Tundra.cComponentTypePlaceable, "Placeable", function(){ return new Tundra.EC_Placeable(); });
        
