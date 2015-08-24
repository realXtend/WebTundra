
define(["lib/classy",
        "lib/three"
    ], function(Class, THREE) {

/**
    PhysicsWorld raycast result object
    @class PhysicsRaycastResult
    @constructor
*/
var PhysicsRaycastResult = Class.$extend(
{
    __init__ : function(entity, pos, normal, distance)
    {
        this.entity = entity === undefined ? null : entity;
        this.pos = pos instanceof THREE.Vector3 ? pos : new THREE.Vector3();
        this.normal = normal instanceof THREE.Vector3 ? normal : new THREE.Vector3();
        this.distance = typeof distance !== 'number' ? 0.0 : distance;
    },
    
    getEntity : function()
    {
        return this.entity;
    },
    
    getPosition : function()
    {
        return this.pos;
    },
    
    getNormal : function()
    {
        return this.normal;
    },
    
    getDistance : function()
    {
        return this.distance;
    }
});

return PhysicsRaycastResult;

}); // require js
