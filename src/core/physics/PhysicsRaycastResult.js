
define(["lib/classy",
        "lib/three"
    ], function(Class, THREE) {

/**
    PhysicsWorld raycast result object
    @class PhysicsRaycastResult
    @constructor
    
    @param {Entity} entity
    @param {THREE.Vector3} position
    @param {THREE.Vector3} normal
    @param {Number} distance
*/
var PhysicsRaycastResult = Class.$extend(
{
    __init__ : function(entity, position, normal, distance)
    {
        this.entity = entity ? entity : null;
        this.pos = position ? position : new THREE.Vector3();
        this.normal = normal ? normal : new THREE.Vector3();
        this.distance = distance ? distance : new THREE.Vector3();
    }
});

return PhysicsRaycastResult;

}); // require js
