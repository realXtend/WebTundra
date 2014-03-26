// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeAvatar = 1;

function EC_Avatar() {
    
    Component.call(this, cComponentTypeAvatar);
    this.addAttribute(cAttributeAssetReference, "appearanceRef", "Reference to avatar file");
    
    // Root entity for avatar.
    this.avatar;
    
    this.attributeChanged.add(this.handleAssetRefChange.bind(this));
    
    // Loading asset for the avatar.
    this.assetQuery = {};
    
    this.avatarLoaded = new signals.Signal();
    
    // Child entity ids created by the avatar.
    this.parts = [];
    
};

EC_Avatar.prototype = new Component(cComponentTypeAvatar);

EC_Avatar.prototype.handleAssetRefChange = function ( attr, changeType ) {
    
    if ( attr.id === "appearanceRef" ) {
        
        this.releaseAssets();
        this.requestAsset();
        
    }
    
};

EC_Avatar.prototype.releaseAssets = function () {
    
    var scene = this.parentEntity.parentScene;
    for( var i = 0; i < this.parts.length; ++i ) {

        scene.removeEntity(this.parts[i], AttributeChange.LocalOnly);
        
    }
    this.parts = [];
    
    if ( this.parentEntity.animationController !== undefined )
        this.parentEntity.removeComponent(this.parentEntity.animationController.id, AttributeChange.LocalOnly);
    
    if ( this.parentEntity.mesh !== undefined )
        this.parentEntity.removeComponent(this.parentEntity.mesh.id, AttributeChange.LocalOnly);
    
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
                
                var data = JSON.parse(xmlRequest.responseText);
                if (data !== null) {
                    
                    thisIsThis.setupAppearance(data);
                    
                } else {
                    
                    console.error( "Failed to parse asset data from " + ref );
                    
                }

            } else {
                
                console.error("Failed to load avatar ref \"" + ref + "\"");
                
            }
            
        }
        
    };
    
    xmlRequest.open( "GET", ref, true );
    xmlRequest.send(null);
    
};

EC_Avatar.prototype.setupAppearance = function ( avatarData ) {
    
    // If old avatar exists release it.
    if ( this.parts.length > 0 )
        this.releaseAssets();
    
    var data = avatarData;
    if ( data === undefined ) {
        this.requestAsset();
        return;
    }
    
    /*if (this.parentEntity.name !== undefined)
        this.parentEntity.createComponent(0, cComponentTypeName);
    this.parentEntity.name.name = data.name;*/
    this.parentEntity.name = data.name;
    
    var component;
    component = this.parentEntity.placeable;
    if ( component === undefined )
        component = this.parentEntity.createComponent(0, cComponentTypePlaceable);
    
    this.createGeometry( this.parentEntity, data, true );
    
    if ( data.animations !== undefined )
        component = this.parentEntity.createComponent(0, cComponentTypeAnimation);
    
    if ( data.parts !== undefined ) {
        
        for ( var i = 0; i < data.parts.length; ++i ) {
            
            this.createChild( data.parts[i] );
            
        }
        
    }
    
    // set avatar invisible untill all asset are loaded.
    
    this.parentEntity.placeable.visible = false;
    
};

EC_Avatar.prototype.createChild = function ( child ) {
    
    if ( child.name === undefined || child.geometry === undefined ||
        child.transform === undefined )
        return;
    
    var childEntity = this.parentEntity.createChild(0);
    this.parts.push(childEntity.id);
    
    childEntity.name = child.name;
    
    this.createPlaceable( childEntity, this.parentEntity, child );
    
    component = this.createGeometry( childEntity, child, false );
    
    if ( child.animations !== undefined )
        component = this.parentEntity.createComponent(0, cComponentTypeAnimation);
    
};

EC_Avatar.prototype.createGeometry = function ( entity, data, useNodeTransform ) {

    var component = entity.createComponent(0, cComponentTypeMesh);
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

    var component = entity.createComponent(0, cComponentTypePlaceable);
    
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
        component.parentBone = data.transform.parentBone;

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
         parentMesh.skeleton === null )
        return;
    
    for ( var i in this.parts ) {
        
        entity = this.parentEntity.parentScene.entityById(this.parts[i]);

        if ( entity !== null && entity.mesh !== undefined &&
             parentMesh.skeleton.isMatch( entity.mesh.skeleton ) ) {
            
            parentAnimation.addMesh( entity.mesh );
            
        }
        
    }
    
    this.avatarLoaded.dispatch( this );
    
};

registerComponent(cComponentTypeAvatar, "Avatar", function(){ return new EC_Avatar(); });