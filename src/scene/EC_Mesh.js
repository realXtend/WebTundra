// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeMesh = 17;

// TODO add support for multiple attachments.
function Bone ( name, parent ) {
    
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

Bone.prototype.attach = function ( mesh ) {
    
    if ( mesh instanceof EC_Mesh === false && !mesh.assetReady )
        debugger;
    
    if (mesh.parentBone !== null)
        mesh.parentBone.detach(mesh);
        
    mesh.parentBone = this;
    
    this.attachments.push( mesh.parentEntity.id );
    
};

Bone.prototype.detach = function ( mesh ) {

    if ( mesh instanceof EC_Mesh === false && !mesh.assetReady )
        debugger;
    
    mesh.parentBone = null;
    
    for ( var i = 0; i < this.attachments.length; ++i ) {
        
        if ( this.attachments[i] === mesh.parentEntity.id )
            this.attachments.splice( i, 0 );
        
    }

};

function Skeleton () {
    
    this.bones = [];
    
}

// Get bone by name
/* @param {string} name bone name
 */
Skeleton.prototype.getBone = function ( name ) {
    
    if ( this.rootBone !== undefined )
        return null;

    for ( var i = 0; i < this.bones.length; ++i ) {

        if ( this.bones[i].name === name )
            return this.bones[i];

    }

    return null;

};

Skeleton.prototype.isMatch = function( skeleton ) {
    
    if ( skeleton === null ) {
        return false;
    }
    
    if ( this.bones.length === 0 || skeleton.bones.length === 0 || 
         !this.checkBones( this.bones[0], skeleton.bones[0] ) )
        return false;
    
    return true;
    
};

Skeleton.prototype.hasAttachments = function( ) {
    
    for ( var i in this.bones ) {
        
        if ( this.bones[i].attachments.length > 0 )
            return true;
        
    }
    
    return false;
    
};

Skeleton.prototype.checkBones = function( bone1, bone2 ) {
    
    if ( bone1.children.length !== bone2.children.length || bone1.name !== bone2.name )
        return false;
    
    for ( var i = 0; i < bone1.children.length; ++i ) {
        
        if ( !this.checkBones(bone1.children[i], bone2.children[i]) )
            return false;
        
    }
    
    return true;
    
};

Skeleton.prototype.addBone = function( bone ) {
    
    bone.skeleton = this;
    this.bones.push(bone);
    
};

function EC_Mesh() {
    
    Component.call(this, cComponentTypeMesh);
    this.addAttribute(cAttributeTransform, "nodeTransformation", "Transform");
    this.addAttribute(cAttributeAssetReference, "meshRef", "Mesh ref");
    this.addAttribute(cAttributeAssetReference, "skeletonRef", "Skeleton ref");
    this.addAttribute(cAttributeAssetReferenceList, "meshMaterial", "Mesh materials");
    this.addAttribute(cAttributeReal, "drawDistance", "Draw distance");
    this.addAttribute(cAttributeBool, "castShadows", "Cast shadows", false);
    this.addAttribute(cAttributeBool, "useInstancing", "Use instancing", false);
    
    this.assetReady = false;
    
    this.skeleton = null;
    
    // Bone that this mesh is attached to.
    
    this.parentBone = null;
    
    this.attributeChanged.add(this.onAttributeChanged.bind(this));

    this.meshAssetReady = new signals.Signal();
    
}

EC_Mesh.prototype = new Component(cComponentTypeMesh);

// AttributeChanged event listener.
EC_Mesh.prototype.onAttributeChanged = function ( attr, changeType ) {
    
    if ( attr.id === "nodeTransformation" ) {
        
        this.updateNodeTransform();
        
    }
    
};

EC_Mesh.prototype.updateNodeTransform = function ( ) {  };

// Check if placeable parentRef or skeletonRef has changed and update parent
// child hierachy based on the change.
// TODO! Code fails to attach mesh to bone when parent mesh asset isn't loaded.
EC_Mesh.prototype.updateParentRef = function () {
    
    var placeable = this.parentEntity.componentByType("Placeable");
    if ( placeable === null )
        return;
    
    // If parent mesh id is set to null detach mesh from bone.
    
    if ( placeable.parentRef === "" && placeable.targetEntity !== null ) {
        
        if ( this.parentBone !== null ) {
            this.parentBone.detach(this);
        }
        
        placeable.setParentEntity(null);
        return;
        
    }
    
    // Check if parent mesh is loaded, if not wait for asset ready signal.
    
    //var parentMesh = this.parentEntity.componentByType( "Mesh" );
    var pEntity = this.parentEntity.parentScene.entityById( placeable.parentRef );
    
    if ( pEntity === null ) {
        
        // TODO Listen when new entities are added
        return;
        
    } else if ( pEntity.mesh === undefined ) {
        
        pEntity.mesh.attributeChanged.addOnce(this.updateParentRef, this);
        return;
        
    }
    
    // Check if we need to attach this mesh to bone.
    
    var boneRef = placeable.skeletonRef;
    if ( pEntity.mesh.skeleton !== null && boneRef !== "" )
    {
        
        var bone = pEntity.mesh.skeleton.getBone(boneRef);
        if ( bone !== null) {

            bone.attach(this);
            return;

        }
        
    }
    
};

registerComponent(cComponentTypeMesh, "Mesh", function(){ return new EC_Mesh(); });
