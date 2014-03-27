"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
// For conditions of distribution and use, see copyright notice in LICENSE

if (Tundra === undefined)
    var Tundra = {};

if (true) {
    // transitioning to namespace
    Tundra.EC_Mesh = EC_Mesh;
}

Tundra.Bone = function ( name, parent ) {
    
    this.name = name;
    
    this.parent = parent;
    
    // Child bones
    this.children = new Array();
    
    // List of attachments objects added to this bone.
    this.attachments = new Array();
    
    if ( this.parent !== undefined && this.parent !== null ) {
        
        var parentChildren = this.parent.children;
        var alreadyAdded = false;
        
        for (var i = 0; i < parentChildren; i++) {
            
            if (parentChildren[i] === this)
                alreadyAdded = true;
            
        }
        
        if ( !alreadyAdded )
            this.parent.children.push(this);
        
    }
    
}

Tundra.Bone.prototype.attach = function ( mesh ) {
    
    if ( mesh instanceof Tundra.EC_Mesh === false && !mesh.assetReady )
        debugger;
    
    if (mesh.parentBone !== null)
        mesh.parentBone.detach(mesh);
        
    mesh.parentBone = this;
    
    this.attachments.push( mesh.parentEntity.id );
    
};

Tundra.Bone.prototype.detach = function ( mesh ) {

    if ( mesh instanceof Tundra.EC_Mesh === false && !mesh.assetReady )
        debugger;
    
    mesh.parentBone = null;
    
    for ( var i = 0; i < this.attachments.length; ++i ) {
        
        if ( this.attachments[i] === mesh.parentEntity.id )
            this.attachments.splice( i, 0 );
        
    }

};

/// Enable/Disable animation from given bone.
Tundra.Bone.prototype.enableAnimation = function ( enable, recursive ) {
    
    recursive = recursive === undefined ? false : recursive;
    if (recursive === true) {
        
        for (var i = 0; i < this.children.length; i++) {

            this.children[i].enableAnimation( enable, recursive );

        }
        
    }
    
};

/// Set local position
Tundra.Bone.prototype.setPosition = function ( position ) {};

/// Get local position
Tundra.Bone.prototype.getPosition = function () {};

/// Set local rotation
Tundra.Bone.prototype.setRotation = function ( euler ) {};

/// Get local rotation
Tundra.Bone.prototype.getRotation = function () {};

/// Set local scale
Tundra.Bone.prototype.setScale = function ( scale ) {};

/// get local scale.
Tundra.Bone.prototype.getScale = function () {};

if (true) {
    // transitioning to namespace
    var Bone = Tundra.Bone;
}
