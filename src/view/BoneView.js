// For conditions of distribution and use, see copyright notice in LICENSE

Bone.prototype.setPosition = function ( position ) {

    this.threeBone.position.x = position.x;
    this.threeBone.position.y = position.y;
    this.threeBone.position.z = position.z;
    this.threeBone.matrixWorldNeedsUpdate = true;

};

Bone.prototype.getPosition = function () {
    
    var vector = {x:0, y:0, z:0};
    vector.x = this.threeBone.position.x;
    vector.y = this.threeBone.position.y;
    vector.z = this.threeBone.position.z;
    return vector;
    
}

Bone.prototype.setRotation = function ( euler ) {

    this.threeBone.rotation.x = euler.x;
    this.threeBone.rotation.y = euler.y;
    this.threeBone.rotation.z = euler.z;
    this.threeBone.matrixWorldNeedsUpdate = true;

};

Bone.prototype.getRotation = function () {
    
    var vector = {x:0, y:0, z:0};
    vector.x = this.threeBone.rotation.x;
    vector.y = this.threeBone.rotation.y;
    vector.z = this.threeBone.rotation.z;
    return vector;
    
}

Bone.prototype.setScale = function ( scale ) {

    this.threeBone.scale.x = scale.x;
    this.threeBone.scale.y = scale.y;
    this.threeBone.scale.z = scale.z;
    this.threeBone.matrixWorldNeedsUpdate = true;

};

Bone.prototype.getScale = function () {
    
    var vector = {x:0, y:0, z:0};
    vector.x = this.threeBone.scale.x;
    vector.y = this.threeBone.scale.y;
    vector.z = this.threeBone.scale.z;
    return vector;
    
}