
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
        
        this.previousCollisions = [];
        
        this.setGravity(0.0, -10.0, 0.0);
        
        this.ptrToRigidbodyMap = {};
        
        this.processPostTickEventId_ = null;
        this.frameUpdateEventId_ = null;
        
        TundraSDK.framework.client.onConnected(this, this.onConnected);
    },

    __classvars__ :
    {
        CollisionSignal : function() {
            this.bodyA = null;
            this.bodyB = null;
            this.position = new THREE.Vector3();
            this.normal = new THREE.Vector3();
            this.distance = 0.0;
            this.impulse = 0.0;
            this.newCollision = false;
        },
        
        ObjectPair : function(k1, k2)
        {
            this.key1 = k1;
            this.key2 = k2;
            
            this.equals = function(p)
            {
                return p instanceof PhysicsWorld.ObjectPair &&
                       this.key1 === p.key1 && this.key2 === p.key2;
            };
        }
    },
    
    onConnected : function()
    {
        this.processPostTickEventId_ = TundraSDK.framework.frame.onUpdate(this, this.processPostTick);
        this.frameUpdateEventId_ = TundraSDK.framework.events.subscribe("PhysicsWorld.Update", this, this.simulate);
    },
    
    addRigidBody : function(rigidbody)
    {
        var body = rigidbody.rigidbody_;
        this.ptrToRigidbodyMap[body.ptr] = rigidbody;
        this.world.addRigidBody(body);
    },
    
    removeRigidBody : function(rigidbody)
    {
        var body = rigidbody.rigidbody_;
        delete this.ptrToRigidbodyMap[body.ptr];
        this.world.removeRigidBody(body);
    },
    
    postInitialize: function()
    {
        
    },
    
    /// Step the physics world. May trigger several internal simulation substeps, according to the deltatime given.
    simulate: function(frametime)
    {
        if (!this.runPhysics)
            return;
        
        TundraSDK.framework.events.send("PhysicsWorld.AboutToUpdate", frametime);
        
        if (this.useVariableTimestep && frametime > this.physicsUpdatePeriod)
        {
            var clampTimeStep = frametime;
            if (clampTimeStep > 0.1)
                clampTimeStep = 0.1;
            this.world.stepSimulation(clampTimeStep, 0, clampTimeStep);
        }
        else
            this.world.stepSimulation(frametime, this.maxSubSteps, this.physicsUpdatePeriod);
    },
    
    /// Process collision from an internal sub-step (Bullet post-tick callback)
    processPostTick : function(subStepTime)
    {
        // Check contacts and send collision signals for them
        var numManifolds = this.collisionDispatcher.getNumManifolds();
        var currentCollisions = [];
        var collisions = [];
        
        // Collect all collision signals to a list before emitting any of them, in case a collision
        // handler changes physics state before the loop below is over (which would lead into catastrophic
        // consequences)
        for(var i = 0; i < numManifolds; ++i)
        {   
            var contactManifold = this.collisionDispatcher.getManifoldByIndexInternal(i);
            var numContacts = contactManifold.getNumContacts();
            if (numContacts === 0)
                continue;

            var objectA = contactManifold.getBody0();
            var objectB = contactManifold.getBody1();

            // Get reigidbody object from user pointer.
            var bodyA = this.ptrToRigidbodyMap[objectA.ptr];
            var bodyB = this.ptrToRigidbodyMap[objectB.ptr];

            if ( bodyA === undefined || bodyA === null ||
                 bodyB === undefined || bodyB === null )
            {
                this.log.error("Inconsistent Bullet physics scene state! An object exists in the physics scene which does not have an associated EC_RigidBody!");
                continue;
            }

            var entityA = bodyA.parentEntity;
            var entityB = bodyB.parentEntity;
            if (entityA === undefined || entityA === null ||
                entityB === undefined || entityB === null)
            {
                LogError("Inconsistent Bullet physics scene state! A parentless EC_RigidBody exists in the physics scene!");
                continue;
            }

            var objectPair = null;
            if (entityA.id < entityB.id)
                objectPair = new PhysicsWorld.ObjectPair(entityA, entityB);
            else
                objectPair = new PhysicsWorld.ObjectPair(entityB, entityA);

            // Check that at least one of the bodies is active
            if (!objectA.isActive() && !objectB.isActive())
                continue;

            var newCollision = true;
            for(var j = 0; j < this.previousCollisions.length; ++j)
            {
                if (this.previousCollisions[j].equals(objectPair))
                    newCollision = false;
            }

            for(var k = 0; k < numContacts; ++k)
            {
                var point = contactManifold.getContactPoint(k);

                var s = new PhysicsWorld.CollisionSignal();
                s.bodyA = bodyA;
                s.bodyB = bodyB;
                var v = point.get_m_positionWorldOnB();
                s.position = new THREE.Vector3(v.x(), v.y(), v.z());
                v = point.get_m_normalWorldOnB();
                s.normal = new THREE.Vector3(v.x(), v.y(), v.z());
                s.distance = point.getDistance();
                //s.impulse = point.get_m_appliedImpulse();
                s.newCollision = newCollision;
                collisions.push(s);

                // Report newCollision = true only for the first contact, in case there are several contacts, and application does some logic depending on it
                // (for example play a sound -> avoid multiple sounds being played)
                newCollision = false;
            }
            currentCollisions.push(objectPair);
        }
        
        // Now fire all collision signals.
        var c = null;
        for(var i = 0; i < collisions.length; ++i)
        {
            c = collisions[i];
            if (!c.newCollision)
                continue;
            var entA = c.bodyA.parentEntity;
            var entB = c.bodyB.parentEntity;
            
            TundraSDK.framework.events.send("PhysicsWorld.PhysicsCollision",
                                            entA, entB, c.position,
                                            c.normal, c.distance, c.impulse,
                                            c.newCollision);
            
            c.bodyA.emitPhysicsCollision(entA, entB, c.position, c.normal,
                                         c.distance, c.impulse, c.newCollision);
            
            c.bodyB.emitPhysicsCollision(entB, entA, c.position, c.normal,
                                         c.distance, c.impulse, c.newCollision);
        }

        this.previousCollisions = currentCollisions;
        
        TundraSDK.framework.events.send("PhysicsWorld.Update", subStepTime);
    },
    
    /**
        Registers a callback for physics collision.

        @example
            TundraSDK.framework.scene.onPhysicsCollision(null, function(entityA, entityB,
                                                                        position, normal,
                                                                        distance, impulse, newCollision)
            {
                console.log("on collision: " + entityA.id + " " + entityB.id);
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
    
    setGravity: function(x, y ,z)
    {
        this.world.setGravity(new Ammo.btVector3(x, y, z));
    },
    
    gravity: function()
    {
        return this.world.getGravity();
    },
    
    setUpdatePeriod: function(updatePeriod)
    {
        // Allow max 1000 fps
        if (updatePeriod <= 0.001)
            updatePeriod = 0.001;
        this.physicsUpdatePeriod = updatePeriod;
    },
    
    setMaxSubSteps: function(steps)
    {
        if (steps > 0)
            this.maxSubSteps = steps;
    },
    
    /// Enable/disable physics simulation
    setRunning: function(enable)
    {
        this.runPhysics_ = enable;
    },
    
    /// Return whether simulation is on
    isRunning: function()
    {
        return this.runPhysics_;
    },
    
    /// Raycast to the world. Returns only a single (the closest) result.
    /** @param origin World origin position
        @param direction Direction to raycast to. Will be normalized automatically
        @param maxDistance Length of ray
        @param collisionGroup Collision layer. Default has all bits set.
        @param collisionMask Collision mask. Default has all bits set.
        @return result PhysicsRaycastResult structure */
    raycast: function(origin, direction, maxDistance, collisionGroup, collisionMask)
    {
        var result = null;
        
        var nDir = new THREE.Vector3(direction.x, direction.y, direction.z);
        nDir.normalize();
        var from = new Ammo.btVector3(origin.x, origin.y, origin.z);
        var to = new Ammo.btVector3(origin.x + nDir.x * maxDistance,
                                    origin.y + nDir.y * maxDistance,
                                    origin.z + nDir.z * maxDistance);
        
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
            result.entity = this.ptrToRigidbodyMap[rayCallback.get_m_collisionObject().ptr].parentEntity;
        }
        
        Ammo.destroy(from);
        Ammo.destroy(to);
        to = null, from = null, nDir = null;
        
        return result;
    },
    
    /// Performs collision query for OBB.
    /** @param obb Oriented bounding box to test
        @param collisionGroup Collision layer of the OBB. Default has all bits set.
        @param collisionMask Collision mask of the OBB. Default has all bits set.
        @return Array of entities with EC_RigidBody component intersecting the OBB */
    ObbCollisionQuery : function(obb, collisionGroup, collisionMask)
    {
        result = [];
        
        
        //var box = new Ammo.btBoxShape();
        
        return result;
    },
    
    reset: function()
    {
        if (this.processPostTickEventId_ !== null)
        {
            TundraSDK.framework.events.unsubscribe(this.processPostTickEventId_.channel,
                                                   this.processPostTickEventId_.id);
            this.processPostTickEventId_ = null;
        }
        
        if (this.frameUpdateEventId_ !== null)
        {
            TundraSDK.framework.events.unsubscribe(this.frameUpdateEventId_.channel,
                                                   this.frameUpdateEventId_.id);
            this.frameUpdateEventId_ = null;
        }
        
        this.ptrToRigidbodyMap = {}; 
    }
});

return PhysicsWorld;

}); // require js
