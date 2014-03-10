// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeAvatar = 1;

function EC_Avatar() {
    
    Component.call(this, cComponentTypeAvatar);
    this.addAttribute(cAttributeAssetReference, "appearanceRef", "Reference to avatar file");
    
    // Root entity for avatar.
    this.avatar;
    
    this.avatarObject;
    this.attributeChanged.add(this.HandleAssetRefChange.bind(this));
    
    this.onAvatarLoaded = new signals.Signal();
    
};

EC_Avatar.prototype = new Component(cComponentTypeAvatar);

EC_Avatar.prototype.HandleAssetRefChange = function ( attr, changeType ) {
    
    if ( attr.id === "appearanceRef" ) {
        
        this.requestAsset();
        
    }
    
};

EC_Avatar.prototype.requestAsset = function () {
    
    if (this.appearanceRef === undefined)
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
    
    var avatar = this.avatarObject;
    if ( avatar === undefined ) {
        this.requestAsset();
        return;
    }
    
    this.parts = [];
    
    /*this.parentEntity.triggerAction = function ( name, params, execType ) {
        
        Entity.prototype.triggerAction.call( this, name, params, execType );
        //this.prototype.triggerAction( this, name, params, execType );
    
        var child;
        for ( var i = 0; i < this.avatar.parts.length; ++i ) {
            
            child = this.parentScene.entityById(this.avatar.parts[i]);
            if (child !== null) {
                
                child.triggerAction(this, name, params, execType);
                
            }
            
        }
        
    };*/
    
    if (this.parentEntity.name !== undefined) {
        var component = this.parentEntity.createComponent(0, cComponentTypeName, "", AttributeChange.LocalOnly);
        component.name = avatar.name;
    }
    
    component = this.parentEntity.placeable;
    if ( component === undefined )
       component = this.parentEntity.createComponent(0, cComponentTypePlaceable, "", AttributeChange.LocalOnly);
    
    component = this.parentEntity.createComponent(0, cComponentTypeMesh, "", AttributeChange.LocalOnly);
    var meshRef = component.meshRef;
    meshRef.ref = avatar.geometry;
    component.meshRef = meshRef;
    
    var newTrans = component.nodeTransformation;

    newTrans.pos.x = avatar.transform.pos[0];
    newTrans.pos.y = avatar.transform.pos[1];
    newTrans.pos.z = avatar.transform.pos[2];

    newTrans.rot.x = avatar.transform.rot[0];
    newTrans.rot.y = avatar.transform.rot[1];
    newTrans.rot.z = avatar.transform.rot[2];

    newTrans.scale.x = avatar.transform.scale[0];
    newTrans.scale.y = avatar.transform.scale[1];
    newTrans.scale.z = avatar.transform.scale[2];

    component.nodeTransformation = newTrans;
    
    if ( avatar.animations !== undefined && avatar.animations.length ) {
        
        component = this.parentEntity.createComponent(0, cComponentTypeAnimation, "", AttributeChange.LocalOnly);
        
    }
    
    // TODO add materials
    
    if ( avatar.parts !== undefined ) {
        
        for ( var i = 0; i < avatar.parts.length; ++i ) {
            
            this.createChild( avatar.parts[i] );
            
        }
        
    }
    
};

EC_Avatar.prototype.createChild = function ( child ) {
    
    if ( child.name === undefined || child.geometry === undefined ||
        child.transform === undefined )
        return;
    
    var childEntity = this.parentEntity.parentScene.createEntity(0, AttributeChange.LocalOnly);
    this.parts.push(childEntity.id);
    
    var component = childEntity.createComponent(0, cComponentTypeName, "", AttributeChange.LocalOnly);
    component.name = child.name;
    
    component = childEntity.createComponent(0, cComponentTypePlaceable, "", AttributeChange.LocalOnly);
    var newTrans = component.transform;

    newTrans.pos.x = child.transform.pos[0];
    newTrans.pos.y = child.transform.pos[1];
    newTrans.pos.z = child.transform.pos[2];

    newTrans.rot.x = child.transform.rot[0];
    newTrans.rot.y = child.transform.rot[1];
    newTrans.rot.z = child.transform.rot[2];

    newTrans.scale.x = child.transform.scale[0];
    newTrans.scale.y = child.transform.scale[1];
    newTrans.scale.z = child.transform.scale[2];

    component.transform = newTrans;
    component.parentRef = this.parentEntity.id;
    if ( child.transform.parentBone !== undefined ) {
        component.skeletonRef = child.transform.parentBone;
    }
    
    component = childEntity.createComponent(0, cComponentTypeMesh, "", AttributeChange.LocalOnly);
    var meshRef = component.meshRef;
    meshRef.ref = child.geometry;
    component.meshRef = meshRef;
    
    this.parentEntity.animationController.addMesh(component);
    
    //component = childEntity.createComponent(0, cComponentTypeAnimation, "", AttributeChange.LocalOnly);
    
    // TODO add materials
    
};

/*EC_Avatar.prototype.UpdateTransform = function ( transform, parent ) {
    
    var newTrans = component.transform;

    newTrans.pos.x = transform.pos[0];
    newTrans.pos.y = transform.pos[1];
    newTrans.pos.z = transform.pos[2];

    newTrans.rot.x = transform.rot[0];
    newTrans.rot.y = transform.rot[1];
    newTrans.rot.z = transform.rot[2];

    newTrans.scale.x = transform.scale[0];
    newTrans.scale.y = transform.scale[1];
    newTrans.scale.z = transform.scale[2];

    component.transform = newTrans;
    
    if ( parent !== undefined ) {
        
        component.parentRef = parent.id;
        if ( child.transform.parent !== undefined )
            component.skeletonRef = child.transform.parent;
        
    }
    
}*/

registerComponent(cComponentTypeAvatar, "Avatar", function(){ return new EC_Avatar(); });