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
    threeGroup.position = new THREE.Vector3(trans.pos.x, trans.pos.y, trans.pos.z);

    // rotation
    var euler = new THREE.Euler(THREE.Math.degToRad(trans.rot.x), THREE.Math.degToRad(trans.rot.y), THREE.Math.degToRad(trans.rot.z), 'ZYX');
    threeGroup.rotation = euler;

    // scale
    threeGroup.scale = new THREE.Vector3(trans.scale.x, trans.scale.y, trans.scale.z);
    
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