// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeAvatar = 1;

function EC_Avatar() {
    
    Component.call(this, cComponentTypeAvatar);
    this.addAttribute(cAttributeAssetReference, "appearanceRef", "Reference to avatar file");
    
    // Root entity for avatar.
    this.avatar;
    
    this.avatarObject;
    this.attributeChanged.add(this.handleAssetRefChange.bind(this));
    
    this.assetQuery = {};
    
    this.avatarLoaded = new signals.Signal();
    
    // Child entity ids created by the avatar.
    this.parts = [];
    
    this.previousRef = "";
    
};

EC_Avatar.prototype = new Component(cComponentTypeAvatar);

EC_Avatar.prototype.handleAssetRefChange = function ( attr, changeType ) {
    
    if ( attr.id === "appearanceRef" ) {
        
        if ( this.previousRef !== this.appearanceRef.ref ) {
            this.releaseAssets();
            this.requestAsset();
            this.previousRef = this.appearanceRef.ref;
        }
        
    }
    
};

EC_Avatar.prototype.releaseAssets = function () {
    
    if ( this.parentEntity.animationController !== undefined )
        this.parentEntity.removeComponent(this.parentEntity.animationController.id, AttributeChange.LocalOnly);
    
    if ( this.parentEntity.mesh !== undefined )
        this.parentEntity.removeComponent(this.parentEntity.mesh.id, AttributeChange.LocalOnly);
    
    var scene = this.parentEntity.parentScene;
    for( var i = 0; i < this.parts.length; ++i ) {

        scene.removeEntity(this.parts[i], AttributeChange.LocalOnly);
        
    }
    this.parts = [];
    
};

EC_Avatar.prototype.requestAsset = function () {
    
    if (this.appearanceRef.ref === "")
        return;
    
    var ref = this.appearanceRef.ref;
    
    var xmlRequest = new XMLHttpRequest();
    var thisIsThis = this;
    
    xmlRequest.onreadystatechange = function () {

		if ( xmlRequest.readyState === xmlRequest.DONE ) {
            
            if ( xmlRequest.status === 200 || xmlRequest.status === 0 ) {
                
                thisIsThis.avatarObject = JSON.parse(xmlRequest.responseText);
                if (thisIsThis.avatarObject !== null) {
                    
                    thisIsThis.setupAppearance();
                    
                }

            } else {
                
                console.error("Failed to load avatar ref \"" + ref + "\"");
                
            }
            
        }
        
    };
    
    xmlRequest.open( "GET", ref, true );
    xmlRequest.send(null);
    
};

EC_Avatar.prototype.setupAppearance = function () {
    
    var avatarData = this.avatarObject;
    if ( avatarData === undefined ) {
        this.requestAsset();
        return;
    }
    
    
    if (this.parentEntity.name !== undefined) {
        this.parentEntity.createComponent(0, cComponentTypeName, "", AttributeChange.LocalOnly);
    }
    this.parentEntity.name.name = avatarData.name;
    
    var component;
    component = this.parentEntity.placeable;
    if ( component === undefined )
        component = this.parentEntity.createComponent(0, cComponentTypePlaceable, "", AttributeChange.LocalOnly);
    
    this.createGeometry( this.parentEntity, avatarData, true );
    
    if ( avatarData.animations !== undefined && avatarData.animations.length ) {
        
        component = this.parentEntity.createComponent(0, cComponentTypeAnimation, "", AttributeChange.LocalOnly);
        
    }
    
    if ( avatarData.parts !== undefined ) {
        
        for ( var i = 0; i < avatarData.parts.length; ++i ) {
            
            this.createChild( avatarData.parts[i] );
            
        }
        
    }
    
    // set avatar invisible untill all asset are loaded.
    
    this.parentEntity.placeable.visible = false;
    
};

EC_Avatar.prototype.createChild = function ( child ) {
    
    if ( child.name === undefined || child.geometry === undefined ||
        child.transform === undefined )
        return;
    
    var childEntity = this.parentEntity.parentScene.createEntity(0, AttributeChange.LocalOnly);
    this.parts.push(childEntity.id);
    
    var component = childEntity.createComponent(0, cComponentTypeName, "", AttributeChange.LocalOnly);
    component.name = child.name;
    
    this.createPlaceable( childEntity, this.parentEntity, child );
    
    component = this.createGeometry( childEntity, child, false );
    
    //this.parentEntity.animationController.addMesh(component);
    
};

EC_Avatar.prototype.createGeometry = function ( entity, data, useNodeTransform ) {

    var component = entity.createComponent(0, cComponentTypeMesh, "", AttributeChange.LocalOnly);
    var meshRef = component.meshRef;
    meshRef.ref = data.geometry;
    component.meshRef = meshRef;
    
    this.assetQuery[entity.id + ":" + component.id] = false;
    
    component.meshAssetReady.addOnce( function( mesh ) {
        if (this.assetQuery[mesh.parentEntity.id + ":" + mesh.id] !== undefined)
            this.assetQuery[mesh.parentEntity.id + ":" + mesh.id] = true;
        this.checkAvatarAssets();
    }, this );
    
    if (data.materials !== undefined) {
        
        // Add material support;
        
    }
    
    if ( useNodeTransform === true ) {
        
        var newTrans = component.nodeTransformation;

        newTrans.pos.x = data.transform.pos[0];
        newTrans.pos.y = data.transform.pos[1];
        newTrans.pos.z = data.transform.pos[2];

        newTrans.rot.x = data.transform.rot[0];
        newTrans.rot.y = data.transform.rot[1];
        newTrans.rot.z = data.transform.rot[2];

        newTrans.scale.x = data.transform.scale[0];
        newTrans.scale.y = data.transform.scale[1];
        newTrans.scale.z = data.transform.scale[2];

        component.nodeTransformation = newTrans;
        
    }
    
    return component;

};

EC_Avatar.prototype.createPlaceable = function ( entity, parent, data ) {

    var component = entity.createComponent(0, cComponentTypePlaceable, "", AttributeChange.LocalOnly);
    
    var newTrans = component.transform;

    newTrans.pos.x = data.transform.pos[0];
    newTrans.pos.y = data.transform.pos[1];
    newTrans.pos.z = data.transform.pos[2];

    newTrans.rot.x = data.transform.rot[0];
    newTrans.rot.y = data.transform.rot[1];
    newTrans.rot.z = data.transform.rot[2];

    newTrans.scale.x = data.transform.scale[0];
    newTrans.scale.y = data.transform.scale[1];
    newTrans.scale.z = data.transform.scale[2];

    component.transform = newTrans;
    if ( parent !== undefined && parent !== null )
        component.parentRef = parent.id;
    
    if ( data.transform.parentBone !== undefined )
        component.skeletonRef = data.transform.parentBone;

};


EC_Avatar.prototype.checkAvatarAssets = function() {
    
    for (var i in this.assetQuery)
    {
        
        if ( this.assetQuery[i] === false )
            return;
        
    }
    
    this.parentEntity.placeable.visible = true;
    
    // Check if we need to add child mesh to AnimationController.
    // Only add meshes that have same skeleton as parent mesh.
    
    var entity;
    var parentMesh = this.parentEntity.mesh;
    var parentAnimation = this.parentEntity.animationController;
    
    if ( parentMesh === undefined || parentAnimation === undefined ||
         !parentMesh.hasSkeleton() )
        return;
    
    for ( var i in this.parts ) {
        
        entity = this.parentEntity.parentScene.entityById(this.parts[i]);

        if ( entity !== null && entity.mesh !== undefined &&
             skeletonMatch( parentMesh, entity.mesh ) ) {
            
            parentAnimation.addMesh( entity.mesh );
            
        }
        
    }
    
};

function skeletonMatch( mesh1, mesh2 ) {
    
    if ( !mesh1.hasSkeleton() || !mesh2.hasSkeleton() ) {
        return false;
    }
    
    if ( !checkBones( mesh1.bones[0], mesh2.bones[0] ) )
        return false;
    
    return true;
    
};

function checkBones( bone1, bone2 ) {
    
    if ( bone1.children.length !== bone2.children.length || bone1.name !== bone2.name )
        return false;
    
    for ( var i = 0; i < bone1.children.length; ++i ) {
        
        if ( !checkBones(bone1.children[i], bone2.children[i]) )
            return false;
        
    }
    
    return true;
}

registerComponent(cComponentTypeAvatar, "Avatar", function(){ return new EC_Avatar(); });