// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeMesh = 17;

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
    
    //this.attributeChanged.add(this.checkParentRef.bind(this));

    this.meshAssetReady = new signals.Signal();
    
}

EC_Mesh.prototype = new Component(cComponentTypeMesh);

EC_Mesh.prototype.getBone = function ( name ) {
    
    if ( this.rootBone !== undefined )
        return null;

    for ( var i = 0; i < this.bones.length; ++i ) {

        if ( this.bones[i].name === name )
            return this.bones[i];

    }

    return null;

};

EC_Mesh.prototype.hasSkeleton = function () {
    
    return this.bones.length > 0;
    
};

EC_Mesh.prototype.updateParentRef = function () {
    
    var placeable = this.parentEntity.componentByType("Placeable");
    if ( placeable === null )
        return;
    
    // Note! this parent isn't same as component.parentEntity
    
    var parentEntity = placeable.getParentEntity();
    if ( parentEntity === null ) {
        
        if (this.parentBone !== null) {
            this.parentBone.detach(this);
            placeable.setParentEntity(null);
        }
        return;
        
    }
    
    // Check if parent mesh is loaded
    
    var parentMesh = parentEntity.componentByType( "Mesh" );
    if ( parentMesh === null || !parentMesh.assetReady ) {
     
        parentMesh.attributeChanged.remove(this.parentMeshAssetReady);
        parentMesh.attributeChanged.add(this.parentMeshAssetReady);
        /*if (!parentMesh.meshAssetReady.has(this, this.parentMeshAssetReady)) {
            parentMesh.meshAssetReady.add(this, this.parentMeshAssetReady);
        }*/
        
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
