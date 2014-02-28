ThreeView.prototype.ComponentAdded = function ( entity, component ) {
    
    component.setParentEntity = placeable_SetParentEntity;
    
    component.updateTransform = placeable_UpdateTransform;

    var parent = component.getParentEntity();
    if (parent !== null)
        component.setParentEntity( parent );

};

/*ThreeView.prototype.connectToPlaceable = function(threeObject, placeable) {
    if (placeable.debug)
        console.log("connect o3d " + threeObject.id + " to placeable - pl x " + placeable.transform.pos.x + " o3d x " + threeObject.position.x + " o3d parent x " + threeObject.parent.position.x);

    //NOTE: this depends on component handling being done here before the componentReady signal fires
    var thisIsThis = this;
    placeable.parentRefReady.add(function() {
        var parent = thisIsThis.parentForPlaceable(placeable);
        //NOTE: assumes first call -- add removing from prev parent to support live changes! XXX
        parent.add(threeObject);
        if (placeable.debug)
            console.log("parent ref set - o3d id=" + threeObject.id + " added to parent " + parent.id);
        placeable.updateTransform();
        //thisIsThis.updateFromTransform(threeObject, placeable);
        placeable.attributeChanged.add(function(attr, changeType) {
            thisIsThis.updateFromTransform(threeObject, placeable); //Todo: pass attr to know when parentRef changed
        });
    });
    
    placeable.updateTransform();
};

ThreeView.prototype.parentForPlaceable = function(placeable) {
    
    console.log("parentForPlaceable");
    var parent;
    if (placeable.parentRef) {
        var parentOb = this.o3dByEntityId[placeable.parentRef];
        if (!parentOb) {
            console.log("ThreeView parentForPlaceable ERROR: adding object but parent not there yet -- even though this is called only after the parent was reported being there in the EC scene data. Falling back to add to scene.");
            parent = this.scene;
        } else {
            parent = parentOb;
        }
    } else {
        parent = this.scene;
    }

    return parent;
};*/

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
    
    var parent = threeGroup;
    while (parent.parent !== undefined) {
        
        parent = parent.parent;
        
    }
    
    threeGroup.matrixWorldNeedsUpdate = true;
    //this.updateMatrixWorld(true);
    
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

    var placeable = entity.componentByType( "Placeable" );
    if ( entity.threeGroup !== null ) {

        entity.threeGroup.add(this.parentEntity.threeGroup);

    }

};