"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
// For conditions of distribution and use, see copyright notice in LICENSE

if (Tundra === undefined)
    var Tundra = {};

Tundra.cComponentTypeMesh = 17;

Tundra.EC_Mesh = function () {
    
    Tundra.Component.call(this, Tundra.cComponentTypeMesh);
    this.addAttribute(Tundra.cAttributeTransform, "nodeTransformation", "Transform");
    this.addAttribute(Tundra.cAttributeAssetReference, "meshRef", "Mesh ref");
    this.addAttribute(Tundra.cAttributeAssetReference, "skeletonRef", "Skeleton ref");
    this.addAttribute(Tundra.cAttributeAssetReferenceList, "meshMaterial", "Mesh materials");
    this.addAttribute(Tundra.cAttributeReal, "drawDistance", "Draw distance");
    this.addAttribute(Tundra.cAttributeBool, "castShadows", "Cast shadows", false);
    this.addAttribute(Tundra.cAttributeBool, "useInstancing", "Use instancing", false);
    
    this.assetReady = false;
    
    this.skeleton = null;
    
    this.attributeChanged.add(this.onAttributeChanged.bind(this));

    this.meshAssetReady = new signals.Signal();
    
};

Tundra.EC_Mesh.prototype = new Tundra.Component(Tundra.cComponentTypeMesh);

// AttributeChanged event listener.
Tundra.EC_Mesh.prototype.onAttributeChanged = function ( attr, changeType ) {
    
    if ( attr.id === "nodeTransformation" ) {
        
        this.updateNodeTransform();
        
    }
    
};

Tundra.EC_Mesh.prototype.updateNodeTransform = function ( ) {  };

// Check if placeable parentRef or parentBone has changed and update parent
// child hierachy based on the change.
Tundra.EC_Mesh.prototype.updateParentRef = function () {
    var pEntity;
    var placeable = this.parentEntity.componentByType("Placeable");
    if ( placeable === null )
        return;
    
    // If parent mesh id is set to null detach mesh from bone.
    
    if ( placeable.parentRef === "" ) {
        
        if ( placeable.targetBone != null ) {
            placeable.targetBone.detach( placeable );
        }
        
        placeable.setParentEntity(null);
        return;
        
    } else if ( placeable.parentBone == "" && placeable.targetBone != null) {
        
        placeable.targetBone.detach( placeable );
        
        pEntity = this.parentEntity.parentScene.entityById( placeable.parentRef );
        if (pEntity)
            placeable.setParentEntity( pEntity );
        
        return;
        
    }
    
    // Check if parent entity or mesh asset is ready. If not wait until they are created
    
    pEntity = this.parentEntity.parentScene.entityById( placeable.parentRef );
    
    if ( pEntity === null ) {
        
        this.parentEntity.parentScene.componentAdded.add(this.checkParentEntity, this);
        return;
        
    } else if ( pEntity.mesh !== undefined ) {
        
        pEntity.mesh.meshAssetReady.addOnce(this.updateParentRef, this);
        return;
        
    }
    
    // Check if we need to attach this mesh to bone.
    
    if ( placeable.parentBone === "" ) {
        
        placeable.setParentEntity( pEntity );
        
    } else if ( pEntity.mesh.skeleton !== null ) {
        
        var bone = pEntity.mesh.skeleton.getBone(placeable.parentBone);
        if ( bone !== null) {

            bone.attach( placeable );
            return;

        }
        
    }
    
};

Tundra.EC_Mesh.prototype.checkParentEntity = function( entity, component, chnageType ) {
    
    if (this.placeable !== undefined) {
        
        if (entity.id === this.placeable.parentRef && component instanceof Tundra.EC_Mesh ) {
        
            this.parentEntity.parentScene.componentAdded.remove(this.checkParentEntity, this);
            this.updateParentRef();
            
        }
            
    }
    
};

Tundra.registerComponent(Tundra.cComponentTypeMesh, "Mesh", function(){ return new Tundra.EC_Mesh(); });

Tundra.Skeleton = function() {
    
    this.bones = [];
    
};

// Add new bone to skeleton
/* @param {Bone} new bone.
 */
Tundra.Skeleton.prototype.addBone = function( bone ) {
    
    bone.skeleton = this;
    this.bones.push(bone);
    
};

// Get bone by name
/* @param {string} name bone name
 */
Tundra.Skeleton.prototype.getBone = function ( name ) {
    
    if ( this.rootBone !== undefined )
        return null;

    for ( var i = 0; i < this.bones.length; ++i ) {

        if ( this.bones[i].name === name )
            return this.bones[i];

    }

    return null;

};

// Checks if two skeletons have same hierarchy and their names match up.
/* @param {Skeleton} skelton object
 * @return {bool} return true if skeletons are identical.
 */
Tundra.Skeleton.prototype.isMatch = function( skeleton ) {
    
    if ( skeleton === null ) {
        return false;
    }
    
    if ( this.bones.length === 0 || skeleton.bones.length === 0 || 
         !this.checkBones( this.bones[0], skeleton.bones[0] ) )
        return false;
    
    return true;
    
};

// Checks any attachments are added to skeleton.
/* @return {bool} return true one or more attachments are found from the skeleton.
 */
Tundra.Skeleton.prototype.hasAttachments = function( ) {
    
    for ( var i in this.bones ) {
        
        if ( this.bones[i].attachments.length > 0 )
            return true;
        
    }
    
    return false;
    
};

// Checks if two bones and their children bones match up.
Tundra.Skeleton.prototype.checkBones = function( bone1, bone2 ) {
    
    if ( bone1.children.length !== bone2.children.length || bone1.name !== bone2.name )
        return false;
    
    for ( var i = 0; i < bone1.children.length; ++i ) {
        
        if ( !this.checkBones(bone1.children[i], bone2.children[i]) )
            return false;
        
    }
    
    return true;
    
};
