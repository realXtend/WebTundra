
define([
        "lib/classy",
        "lib/ammo",
        "lib/three",
        "core/physics/PhysicsRaycastResult",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(Class, Ammo, THREE, PhysicsRaycastResult, TundraSDK, TundraLogging) {

/**
    PhysicsWorld that resides in a {{#crossLink "core/scene/Scene"}}{{/crossLink}}.
    @class PhysicsWorld
    @constructor
*/
var PhysicsWorld = Class.$extend(
{
    __init__ : function()
    {
        this.log = TundraLogging.getLogger("Physics");
        
        /**
            Bullet Collision Configuration
            @property collisionConfiguration
            @type Ammo.btDefaultCollisionConfiguration
        */
        this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        
        /**
            Bullet Collision Dispatcher
            @property collisionDispatcher
            @type Ammo.btCollisionDispatcher
        */
        this.collisionDispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);

        /**
            Bullet broadphase
            @property broadphase
            @type Ammo.btDbvtBroadphase
        */
        this.broadphase = new Ammo.btDbvtBroadphase();
        
        /**
            Bullet Solver
            @property solver
            @type Ammo.btSequentialImpulseConstraintSolver
        */
        this.solver = new Ammo.btSequentialImpulseConstraintSolver();
        
        /**
            Bullet World
            @property world
            @type Ammo.btDiscreteDynamicsWorld
        */
        this.world = new Ammo.btDiscreteDynamicsWorld(this.collisionDispatcher,
                                                      this.broadphase,
                                                      this.solver,
                                                      this.collisionConfiguration);
        
        /**
            Physics update period
            @property physicsUpdatePeriod
            @type Number
        */
        this.physicsUpdatePeriod = 1.0 / 60.0;
        
        /**
            Max number of sub steps per simulation step
            @property maxSubSteps
            @type Number
        */
        this.maxSubSteps = 6;
        
       /**
            Enable physical world step simulation
            @property runPhysics_
            @type Bool
        */
        this.runPhysics_ = true;
        
        this.setGravity(0.0, -10.0, 0.0);
    },

    __classvars__ :
    {
        
    },
    
    postInitialize: function() {
        TundraSDK.framework.frame.onUpdate(this, this.simulate);
    },
    
    setGravity: function(x, y ,z) {
        this.world.setGravity(new Ammo.btVector3(x, y, z));
    },
    
    setUpdatePeriod: function(updatePeriod) {
        // Allow max 1000 fps
        if (updatePeriod <= 0.001)
            updatePeriod = 0.001;
        this.physicsUpdatePeriod = updatePeriod;
    },
    
    setMaxSubSteps: function(steps) {
        if (steps > 0)
            this.maxSubSteps = steps;
    },
    
    simulate: function(frametime) {
        if (!this.runPhysics_ ||
            this.world === null)
            return;
        
        // TODO signal about to update event
        var clampTimeStep = frametime;
        if (clampTimeStep > 0.1)
            clampTimeStep = 0.1;
        
        this.world.stepSimulation(clampTimeStep, 0, clampTimeStep);
    },
    
    raycast: function(origin, direction, maxDistance, collisionGroup, collisionMask) {
        var result = null;
        
        var nDir = new THREE.Vector3(direction.x, direction.y, direction.z);
        nDir.normalize();
        var from = new Ammo.btVector3(origin.x, origin.y, origin.z);
        var to = new Ammo.btVector3(origin.x + nDir.x * maxDistance,
                                    origin.y + nDir.y * maxDistance,
                                    origin.z + nDir.z * maxDistance);
        console.log("from: " + from.x() + " " + from.y() + " " + from.z());
        console.log("to: " + to.x() + " " + to.y() + " " + to.z());
        
        var rayCallback = new Ammo.ClosestRayResultCallback(from, to);
        if (typeof collisionGroup === 'number')
            rayCallback.set_m_collisionFilterGroup(collisionGroup);
        if (typeof collisionMask === 'number')
            rayCallback.set_m_collisionFilterMask(collisionMask);
        
        this.world.rayTest(rayCallback.get_m_rayFromWorld(),
                           rayCallback.get_m_rayToWorld(),
                           rayCallback);
                   
        if (rayCallback.hasHit())
        {
            result = new PhysicsRaycastResult();
            var p = rayCallback.get_m_hitPointWorld();
            var n = rayCallback.get_m_hitNormalWorld();
            result.pos = new THREE.Vector3(p.x(), p.y(), p.z());
            result.normal = new THREE.Vector3(n.x(), n.y(), n.z());
            result.distance = new THREE.Vector3(result.pos.x - origin.x,
                                                result.pos.y - origin.y,
                                                result.pos.z - origin.z).length();
            result.entity = rayCallback.get_m_collisionObject().userPointer.parentEntity;
        }
        
        Ammo.destroy(from);
        Ammo.destroy(to);
        to = null, from = null, nDir = null;
        
        return result;
    },
    
    reset: function() {
        
    }
});

return PhysicsWorld;

}); // require js
