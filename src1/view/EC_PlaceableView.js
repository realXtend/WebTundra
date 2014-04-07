// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.ThreeView.prototype.PlaceableIntialize = function ( entity, component ) {
    
    component.setParentEntity = Tundra.placeable_SetParentEntity;
    
    component.updateTransform = Tundra.placeable_UpdateTransform;
    
    component.setVisible = Tundra.placeable_setVisible;
    
    component.setPosition = Tundra.placeable_setPosition;
    component.setPositionVector = function( vector3 ) {
        component.setPosition( vector3.x, vector3.y, vector3.z );
    };
    
    var parent = component.parentEntity.parentScene.entityById(this.parentRef);
    if (parent !== null)
        component.setParentEntity( parent );

};

// TODO! Optimize this by using cache for position, rotation and scale objects.
Tundra.placeable_UpdateTransform = function() {
    
    var threeGroup = this.parentEntity.threeGroup;
    if (threeGroup === undefined)
        return;
    
    var trans = this.transform;
    
    // position
    threeGroup.position.x = trans.pos.x;
    threeGroup.position.y = trans.pos.y;
    threeGroup.position.z = trans.pos.z;

    // rotation
    threeGroup.rotation.x = THREE.Math.degToRad(trans.rot.x);
    threeGroup.rotation.y = THREE.Math.degToRad(trans.rot.y);
    threeGroup.rotation.z = THREE.Math.degToRad(trans.rot.z);

    // scale
    threeGroup.scale.x = trans.scale.x;
    threeGroup.scale.y = trans.scale.y;
    threeGroup.scale.z = trans.scale.z;
    
};

Tundra.placeable_SetParentEntity = function ( entity ) {

    // Remove from old parent.

    if ( this.parentEntity.threeGroup !== undefined && this.parentEntity.threeGroup.parent !== undefined ) {

         this.parentEntity.threeGroup.parent.remove(this.parentEntity.threeGroup);

    } else {
        console.warn("Parent of the threeGroup is not removed! (Issue #41)");
    }

    // If entity is set to null we add this object as child of scene.

    if ( entity === null ) {

        this.parentEntity.parentScene.threeScene.add(this.parentEntity.threeGroup);
        return;
        
    }

    if ( entity.threeGroup !== null ) {

        entity.threeGroup.add(this.parentEntity.threeGroup);

    }

};

Tundra.placeable_setVisible = function ( visible ) {
    
    if (this.parentEntity.threeGroup) {
        this.parentEntity.threeGroup.traverse(function(object) {
            object.visible = visible;
        });
    } else {
        console.warn("Object is not set to visible. (Issue #41)");
    }
};

Tundra.placeable_setPosition = function ( x, y, z ) {
    
    var transform = this.transform;
    transform.pos.x = x;
    transform.pos.y = y;
    transform.pos.z = z;
    this.transform = transform;
    
};
Tundra.EC_Placeable.prototype.setParentEntity = function ( entity ) {};
