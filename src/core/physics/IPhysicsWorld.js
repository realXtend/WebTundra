
define(["lib/classy",
        "lib/three",
        "core/physics/PhysicsRaycastResult",
        "core/physics/CollisionInfo",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(Class, THREE, PhysicsRaycastResult, CollisionInfo, TundraSDK, TundraLogging) {

/**
    Interface class for physics world.
    
    @class IPhysicsWorld
    @constructor
*/
var IPhysicsWorld = Class.$extend(
{
    __init__ : function()
    {        
        /**
            Physics update period (= length of each simulation step.)
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
            @property runPhysics
            @type Bool
        */
        this.runPhysics = true;
        
        /**
            Use variable timestep if enabled, and if frame timestep exceeds the single physics simulation substep
            @property useVariableTimestep
            @type Bool
        */
        this.useVariableTimestep = false;
        
        /**
            Collisions that occurred during the previous frame.
            @property previousCollisions
            @type Array
        */
        this.previousCollisions = [];
    },
    
    simulate: function(frametime)
    {
        TundraLogging.getLogger("IPhysicsWorld").warn("simulate(frametime) not implemented.");
    },
    
    /**
        Process collision from an internal sub-step (Bullet post-tick callback)

        @method processPostTick
        @param {Number} subStepTime
    */
    processPostTick : function(subStepTime)
    {
        TundraLogging.getLogger("IPhysicsWorld").warn("processPostTick(subStepTime) not implemented.");
    },
    
    /**
        Registers a callback for physics collision.

        @example
            TundraSDK.framework.scene.onPhysicsCollision(null, function(info)
            {
                console.log("on collision: " + info.bodyA.id + " " + info.bodyB.id);
            });

        @method onPhysicsCollision
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onPhysicsCollision : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("PhysicsWorld.PhysicsCollision", context, callback);
    },
    
    /**
        Registers a callback for post simulate.

        @method onAboutToUpdate
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAboutToUpdate : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("PhysicsWorld.AboutToUpdate", context, callback);
    },
    
    /**
        Set physics update period (= length of each simulation step.) By default 1/60th of a second.

        @method setUpdatePeriod
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

        @method setMaxSubSteps
        @param steps Maximum physics substeps
    */
    setMaxSubSteps: function(steps)
    {
        if (steps > 0)
            this.maxSubSteps = steps;
    },
    
    /**
        Enable/disable physics simulationsetRunning

        @method setRunning
        @param enable
    */
    setRunning: function(enable)
    {
        this.runPhysics_ = enable;
    },
    
    /**
        Return whether simulation is on

        @method setRunning
        @return boolean
    */
    isRunning: function()
    {
        return this.runPhysics_;
    },
    
    /** Raycast to the world. Returns only a single (the closest) result.
    
        @method raycast
        @param origin World origin position
        @param direction Direction to raycast to. Will be normalized automatically
        @param maxDistance Length of ray
        @param collisionGroup Collision layer. Default has all bits set.
        @param collisionMask Collision mask. Default has all bits set.
        @return result PhysicsRaycastResult object */
    raycast: function(origin, direction, maxDistance, collisionGroup, collisionMask)
    {
        TundraLogging.getLogger("IPhysicsWorld").warn("raycast(origin, direction, maxDistance, collisionGroup, collisionMask) not implemented.");
    }
});

return IPhysicsWorld;

}); // require js
