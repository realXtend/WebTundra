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
