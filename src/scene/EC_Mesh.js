// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeMesh = 17;

// TODO add support for multiple attachments.
function Bone ( name, parent ) {
    
    this.name = name;
    this.parent = parent;
    this.children = new Array();
    
    // List of attached meshes in this bone.
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
    
    if ( mesh instanceof EC_Mesh === false && mesh.threeMesh !== undefined )
        debugger;
    
    if (mesh.parentBone !== null)
        mesh.parentBone.detach(mesh);
        
    mesh.parentBone = this;
    
};

Bone.prototype.detach = function ( mesh ) {
    
    if ( mesh instanceof EC_Mesh === false && mesh.threeMesh !== undefined )
        debugger;
    
    mesh.parentBone = null;
    
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
    this.bones = new Array();
    
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

// Get bone by name
/* @param {string} name bone name
 */
EC_Mesh.prototype.getBone = function ( name ) {
    
    if ( this.rootBone !== undefined )
        return null;

    for ( var i = 0; i < this.bones.length; ++i ) {

        if ( this.bones[i].name === name )
            return this.bones[i];

    }

    return null;

};

// Check if mesh has a skeleton defined.
/* @return return true if mesh is holding a skeleton.
 */
EC_Mesh.prototype.hasSkeleton = function () {
    
    return this.bones.length > 0;
    
};

// Check if placeable parentRef or skeletonRef has changed and update parent
// child hierachy based on the change.
EC_Mesh.prototype.updateParentRef = function () {
    
    var placeable = this.parentEntity.componentByType("Placeable");
    if ( placeable === null )
        return;
    
    // Note! this parent isn't same as component.parentEntity
    // If parent mesh id is set to null detach mesh form bone.
    
    var parentEntity = placeable.getParentEntity();
    if ( parentEntity === null ) {
        
        if (this.parentBone !== null) {
            this.parentBone.detach(this);
            placeable.setParentEntity(null);
            console.log("Detach mesh");
        }
        return;
        
    }
    
    // Check if parent mesh is loaded, if not wait for asset ready signal.
    
    var parentMesh = parentEntity.componentByType( "Mesh" );
    if ( parentMesh === null ) {
        
        return;
        
    } else if ( !parentMesh.assetReady ) {
     
        parentMesh.attributeChanged.addOnce(this.parentMeshAssetReady, this);
        
        return;
        
    }
    
    // Check if we need to attach this mesh to bone.
    
    var boneRef = placeable.skeletonRef;
    if ( parentMesh.hasSkeleton() &&  boneRef !== "" )
    {
        
        var bone = parentMesh.getBone(boneRef);
        if ( bone !== null) {

            bone.attach(this);
            return;
        
        }
        
    }
};

EC_Mesh.prototype.parentMeshAssetReady = function() {
    
    this.updateParentRef();
    
};

registerComponent(cComponentTypeMesh, "Mesh", function(){ return new EC_Mesh(); });
