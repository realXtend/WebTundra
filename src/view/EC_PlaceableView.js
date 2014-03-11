ThreeView.prototype.PlaceableIntialize = function ( entity, component ) {
    
    component.setParentEntity = placeable_SetParentEntity;
    
    component.updateTransform = placeable_UpdateTransform;
    
    component.setVisible = placeable_setVisible;

    var parent = component.getParentEntity();
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

    if ( this.parentEntity.threeGroup.parent !== undefined )
        this.parentEntity.threeGroup.parent.remove(this.parentEntity.threeGroup);

    if (entity === undefined || entity === null) {

        this.parentEntity.parentScene.threeScene.add(this.parentEntity.threeGroup);
        this.updateTransform();
        return;
        
    }

    if ( entity.threeGroup !== null ) {

        entity.threeGroup.add(this.parentEntity.threeGroup);

    }

};

var placeable_setVisible = function ( visible ) {
    
    this.parentEntity.threeGroup.traverse( function ( object ) { object.visible = visible; } );

};