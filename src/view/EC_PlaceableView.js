// For conditions of distribution and use, see copyright notice in LICENSE

ThreeView.prototype.PlaceableIntialize = function ( entity, component ) {
    
    component.setParentEntity = placeable_SetParentEntity;
    
    component.updateTransform = placeable_UpdateTransform;
    
    component.setVisible = placeable_setVisible;
    
    component.setPosition = placeable_setPosition;
    component.setPositionVector = function( vector3 ) {
        component.setPosition( vector3.x, vector3.y, vector3.z );
    };
    
    var parent = component.parentEntity.parentScene.entityById(this.parentRef);
    if (parent !== null)
        component.setParentEntity( parent );

};

// TODO! Optimize this by using cache for position, rotation and scale objects.
var placeable_UpdateTransform = function() {
    
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

var placeable_SetParentEntity = function ( entity ) {

    // Remove from old parent.

    if ( this.parentEntity.threeGroup.parent !== undefined ) {

         this.parentEntity.threeGroup.parent.remove(this.parentEntity.threeGroup);

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

var placeable_setVisible = function ( visible ) {
    
    this.parentEntity.threeGroup.traverse( function ( object ) { object.visible = visible; } );

};

var placeable_setPosition = function ( x, y, z ) {
    
    var transform = this.transform;
    transform.pos.x = x;
    transform.pos.y = y;
    transform.pos.z = z;
    this.transform = transform;
    
}
EC_Placeable.prototype.setParentEntity = function ( entity ) {};