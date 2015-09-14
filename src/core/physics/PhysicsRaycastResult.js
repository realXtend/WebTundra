
define(["lib/classy",
        "lib/three"
    ], function(Class, THREE) {

/**
    PhysicsWorld raycast result object
    @class PhysicsRaycastResult
    @constructor
    
    @param {Entity} entity
    @param {THREE.Vector3} pos
    @param {THREE.Vector3} normal
    @param {Number} distance
*/
var PhysicsRaycastResult = Class.$extend(
{
    __init__ : function(entity, pos, normal, distance)
    {
        this.entity = entity;
        this.pos = pos;
        this.normal = normal;
        this.distance = distance;
    }
});

return PhysicsRaycastResult;

}); // require js
