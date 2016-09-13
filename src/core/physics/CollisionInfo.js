
define(["lib/classy",
        "lib/three"
    ], function(Class, THREE) {

var CollisionInfo = Class.$extend(
/** @lends CollisionInfo.prototype */
{
    /**
        Info object that is returned when collision happens between two rigidbodies.

        @constructs

        @param {EC_RigidBody} bodyA
        @param {EC_RigidBody} bodyB
        @param {THREE.Vector3} position
        @param {THREE.Vector3} normal
        @param {Number} distance
        @param {Number} impulse Note! not implemented
        @param {boolean} newCollision
    */
    __init__ : function(bodyA, bodyB, position, normal, distance, impulse, newCollsion)
    {
        this.bodyA = bodyA ? bodyA : null;
        this.bodyB = bodyB ? bodyB : null;
        this.position = position ? position : new THREE.Vector3();
        this.normal = normal ? normal : new THREE.Vector3();
        this.distance = distance ? distance : 0.0;
        this.impulse = impulse ? impulse : 0.0;
        this.newCollision = newCollsion ? newCollsion : false;
    }
});

return CollisionInfo;

}); // require js
