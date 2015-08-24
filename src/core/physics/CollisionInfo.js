
define(["lib/classy",
        "lib/three"
    ], function(Class, THREE) {

/**
    Info object that is returned when collision happens between two rigidbodies.
    @class CollisionInfo
    @constructor
    
    @param {Entity|Null} bodyA
    @param {Entity|Null} bodyB
    @param {THREE.Vector3} position
    @param {THREE.Vector3} normal
    @param {Number} distance
    @param {Number} impulse
    @param {boolean} newCollision
*/
var CollisionInfo = Class.$extend(
{
    __init__ : function()
    {
        this.bodyA = null;
        this.bodyB = null;
        this.position = new THREE.Vector3();
        this.normal = new THREE.Vector3();
        this.distance = 0.0;
        this.impulse = 0.0;
        this.newCollision = false;
    },
    
    getBodyA : function()
    {
        return this.bodyA;
    },
    
    getBodyB : function()
    {
        return this.bodyB;
    },
    
    getPosition : function()
    {
        return this.position;
    },
    
    getNormal : function()
    {
        return this.normal;
    },
    
    getDistance : function()
    {
        return this.distance;
    },
    
    getImpulse : function()
    {
        return this.impulse;
    },
    
    isNewCollision : function()
    {
        return this.newCollision;
    }
});

return CollisionInfo;

}); // require js
