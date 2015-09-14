
define(["lib/classy",
        "lib/three"
    ], function(Class, THREE) {

/**
    Info object that is returned when collision happens between two rigidbodies.
    @class CollisionInfo
    @constructor
    
    @param {Entity} bodyA
    @param {Entity} bodyB
    @param {THREE.Vector3} position
    @param {THREE.Vector3} normal
    @param {Number} distance
    @param {Number} impulse Note! not implemented
    @param {boolean} newCollision
*/
var CollisionInfo = Class.$extend(
{
    __init__ : function(bodyA, bodyB, position, normal, distance, impulse, newCollsion)
    {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.position = position;
        this.normal = normal;
        this.distance = distance;
        this.impulse = impulse;
        this.newCollision = newCollsion;
    }
});

return CollisionInfo;

}); // require js
