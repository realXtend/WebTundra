
define([
        "lib/classy",
        "lib/ammo",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(Class, Ammo, TundraSDK, TundraLogging) {

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
        
        this.runPhysics_ = true;
        
        //TundraSDK.framework.frame.onUpdate(this, this.simulate);
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
        if (!this.runPhysics_)
            return;
        
        // TODO signal about to update event
        var clampTimeStep = frametime;
        if (clampTimeStep > 0.1)
            clampTimeStep = 0.1;
        
        this.world.stepSimulation(clampTimeStep, 0, clampTimeStep);
    },
    
    raycast: function(origin, direction, maxDistance, collisionGroup) {
        // TODO add implementation
        return null;
    },
    
    reset: function() {
        
    }
});

return PhysicsWorld;

}); // require js
