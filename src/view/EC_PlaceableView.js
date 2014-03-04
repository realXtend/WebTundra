ThreeView.prototype.ComponentAdded = function ( entity, component ) {
    
    component.setParentEntity = placeable_SetParentEntity;
    
    component.updateTransform = placeable_UpdateTransform;

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
    //var endPos = new THREE.Vector3(trans.pos.x, trans.pos.y, trans.pos.z);
    //copyXyz(trans.pos, endPos);
    threeGroup.position = new THREE.Vector3(trans.pos.x, trans.pos.y, trans.pos.z);

    // rotation
    //var endRot = new THREE.Quaternion();
    var euler = new THREE.Euler(THREE.Math.degToRad(trans.rot.x), THREE.Math.degToRad(trans.rot.y), THREE.Math.degToRad(trans.rot.z), 'ZYX');
    
    //euler.order = 'XYZ';
    //tundraToThreeEuler(trans.rot, euler);
    //endRot.setFromEuler(euler, true);
    threeGroup.rotation = euler;

    // scale
    //var endScale = new THREE.Vector3(trans.scale.x, trans.scale.y, trans.scale.z);
    //copyXyz(trans.scale, endScale);
    threeGroup.scale = new THREE.Vector3(trans.scale.x, trans.scale.y, trans.scale.z);;
    
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