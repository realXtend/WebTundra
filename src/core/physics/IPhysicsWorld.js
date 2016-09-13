
define(["lib/classy",
        "lib/three",
        "core/physics/PhysicsRaycastResult",
        "core/physics/CollisionInfo",
        "core/framework/Tundra",
        "core/framework/TundraLogging"
    ], function(Class, THREE, PhysicsRaycastResult, CollisionInfo, Tundra, TundraLogging) {

var IPhysicsWorld = Class.$extend(
/** @lends IPhysicsWorld.prototype */
{
    /**
        Interface class for physics world.

        @constructs
    */
    __init__ : function()
    {
        /**
            Physics update period (= length of each simulation step.)
            @var {Number}
        */
        this.physicsUpdatePeriod = 1.0 / 60.0;

        /**
            Max number of sub steps per simulation step
            @var {Number}
        */
        this.maxSubSteps = 6;

        /**
            Enable physical world step simulation
            @var {boolean}
        */
        this.runPhysics = true;

        /**
            Use variable timestep if enabled, and if frame timestep exceeds the single physics simulation substep
            @var {boolean}
        */
        this.useVariableTimestep = false;

        /**
            Collisions that occurred during the previous frame.
            @var {Array.<any>}
        */
        this.previousCollisions = [];
    },

    simulate: function(frametime)
    {
        TundraLogging.getLogger("IPhysicsWorld").warn("simulate(frametime) not implemented.");
    },

    /**
        Process collision from an internal sub-step

        @param {Number} subStepTime
    */
    processPostTick : function(subStepTime)
    {
        TundraLogging.getLogger("IPhysicsWorld").warn("processPostTick(subStepTime) not implemented.");
    },

    /**
        Registers a callback for physics collision.

        * @example
        * Tundra.physicsWorld.onPhysicsCollision(null, function(info)
        * {
        *     console.log("on collision: " + info.bodyA.id + " " + info.bodyB.id);
        * });

        @subscribes
    */
    onPhysicsCollision : function(context, callback)
    {
        return Tundra.events.subscribe("PhysicsWorld.PhysicsCollision", context, callback);
    },

    /**
        Registers a callback for post simulate.

        @subscribes
    */
    onAboutToUpdate : function(context, callback)
    {
        return Tundra.events.subscribe("PhysicsWorld.AboutToUpdate", context, callback);
    },

    /**
        Set physics update period (= length of each simulation step.) By default 1/60th of a second.

        @param updatePeriod
    */
    setUpdatePeriod: function(updatePeriod)
    {
        // Allow max 1000 fps
        if (updatePeriod <= 0.001)
            updatePeriod = 0.001;
        this.physicsUpdatePeriod = updatePeriod;
    },

    /**
        Set maximum physics substeps to perform on a single frame. Once this maximum is reached, time will appear to slow down if framerate is too low.

        @param {number} steps Maximum physics substeps
    */
    setMaxSubSteps: function(steps)
    {
        if (steps > 0)
            this.maxSubSteps = steps;
    },

    /**
        Enable/disable physics simulationsetRunning

        @param {boolean} enable
    */
    setRunning: function(enable)
    {
        this.runPhysics_ = enable;
    },

    /**
        Return whether simulation is on

        @return {boolean}
    */
    isRunning: function()
    {
        return this.runPhysics_;
    },

    /**
        Raycast to the world. Returns only a single (the closest) result.

        * @example
        * var origin = new THREE.Vector3(0.0, 10.0, 0.0);
        * var dir = new THREE.Vector3(0.0, -1.0, 0.0);
        * var dist = 100;
        * var result = Tundra.physicsWorld.raycast(origin, dir, dist);
        * if (result) {
        *     console.log(result.entity.name);
        * }

        @param {THREE.Vector3} origin World origin position
        @param {THREE.Vector3} direction Direction to raycast to. Will be normalized automatically
        @param {Number} maxDistance Length of ray
        @param {Number} collisionGroup Collision layer. Default has all bits set.
        @param {Number} collisionMask Collision mask. Default has all bits set.
        @return {PhysicsRaycastResult|null} - PhysicsRaycastResult object or null
    */
    raycast: function(origin, direction, maxDistance, collisionGroup, collisionMask)
    {
        TundraLogging.getLogger("IPhysicsWorld").warn("raycast(origin, direction, maxDistance, collisionGroup, collisionMask) not implemented.");
    }
});

return IPhysicsWorld;

}); // require js
