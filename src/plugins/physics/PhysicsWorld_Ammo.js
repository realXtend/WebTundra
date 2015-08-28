
define(["lib/classy",
        "lib/ammo",
        "lib/three",
        "core/physics/IPhysicsWorld",
        "core/physics/PhysicsRaycastResult",
        "core/physics/CollisionInfo",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(Class, Ammo, THREE, IPhysicsWorld, PhysicsRaycastResult, CollisionInfo, TundraSDK, TundraLogging) {

/**
    A physics world implementation of Ammo.
    
    @class PhysicsWorld
    @constructor
*/
var PhysicsWorld_Ammo = IPhysicsWorld.$extend(
{
    __init__ : function()
    {
        this.$super();
        
        this.log = TundraLogging.getLogger("PhysicsWorldAmmo");
        
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
            Collisions that occurred during the previous frame.
            @property previousCollisions
            @type Array
        */
        this.previousCollisions = [];
        
        /**
            ptrToRigidbodyMap will keep track what Ammo.Rigidbody belongs to what EC_RigidBody object.
            @property ptrToRigidbodyMap_
            @type Array
        */
        this.ptrToRigidbodyMap_ = {};
        
        this.processPostTickEventId_ = null;
        this.frameUpdateEventId_ = null;
        
        TundraSDK.framework.client.onConnected(this, this.onConnected);
        
        this.setGravity(0.0, -10.0, 0.0);
    },

    __classvars__ :
    {
        /**
            @property ObjectPair Key value pair
            @type Function
            @param k1
            @param k2
        */
        ObjectPair : function(k1, k2)
        {
            this.key1 = k1;
            this.key2 = k2;
            
            this.equals = function(p)
            {
                return p instanceof PhysicsWorld_Ammo.ObjectPair &&
                       this.key1 === p.key1 && this.key2 === p.key2;
            };
        }
    },
    
    /**
        Called after TundraClient has connected to Tundra server.

        @method onConnected
    */
    onConnected : function()
    {
        if (this.processPostTickEventId_ === null)
        {
            this.processPostTickEventId_ = TundraSDK.framework.frame.onUpdate(this, this.processPostTick);
            this.frameUpdateEventId_ = TundraSDK.framework.events.subscribe("PhysicsWorld.Update", this, this.simulate);
        }
    },
    
    /**
        Add Ammo.Rigidbody to physical world.

        @method addRigidBody
        @param {EC_RigidBody} rigidbody
        @param {Int|null} layer
        @param {Int|null} mask
    */
    addRigidBody : function(rigidbody, layer, mask)
    {
        var body = rigidbody.rigidbody_;
        this.ptrToRigidbodyMap_[body.ptr] = rigidbody;
        if (typeof layer === "number" && typeof mask === "number")
            this.world.addRigidBody(body, layer, mask);
        else
            this.world.addRigidBody(body);
    },
    
    /**
        Remove Ammo.Rigidbody from physical world.

        @method removeRigidBody
        @param {EC_RigidBody} rigidbody
    */
    removeRigidBody : function(rigidbody)
    {
        var body = rigidbody.rigidbody_;
        delete this.ptrToRigidbodyMap_[body.ptr];
        this.world.removeRigidBody(body);
    },
    
    /**
        Called after all modules are loaded and all APIs have been post initialized.

        @method postInitialize
    */
    postInitialize: function()
    {
        if (this.processPostTickEventId_ === null)
        {
            this.processPostTickEventId_ = TundraSDK.framework.frame.onUpdate(this, this.processPostTick);
            this.frameUpdateEventId_ = TundraSDK.framework.events.subscribe("PhysicsWorld.Update", this, this.simulate);
        }
    },
    
    /**
        Step the physics world. May trigger several internal simulation substeps, according to the deltatime given.

        @method simulate
        @param {Number} frametime
    */
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
        {
            this.world.stepSimulation(frametime, this.maxSubSteps, this.physicsUpdatePeriod);
        }
    },
    
    /**
        Process collision from an internal sub-step (Bullet post-tick callback)

        @method processPostTick
        @param {Number} subStepTime
    */
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

            // Get rigidbody object from map
            var bodyA = this.ptrToRigidbodyMap_[objectA.ptr];
            var bodyB = this.ptrToRigidbodyMap_[objectB.ptr];

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
                objectPair = new PhysicsWorld_Ammo.ObjectPair(entityA, entityB);
            else
                objectPair = new PhysicsWorld_Ammo.ObjectPair(entityB, entityA);

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

                var info = new CollisionInfo();
                info.bodyA = bodyA;
                info.bodyB = bodyB;
                var v = point.get_m_positionWorldOnB();
                info.position = new THREE.Vector3(v.x(), v.y(), v.z());
                v = point.get_m_normalWorldOnB();
                info.normal = new THREE.Vector3(v.x(), v.y(), v.z());
                info.distance = point.getDistance();
                //s.impulse = point.getAppliedImpulse();
                info.newCollision = newCollision;
                collisions.push(info);

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
            // For performance reasons only trigger new collisions.
            c = collisions[i];
            
            if (!c.newCollision)
                continue;
            
            if (entityB === null || entityA === null)
                continue;
            
            TundraSDK.framework.events.send("PhysicsWorld.PhysicsCollision", info);
            c.bodyA.emitPhysicsCollision(entityB, info.position, info.normal,
                                         info.distance, info.impulse, info.newCollision);
            c.bodyB.emitPhysicsCollision(entityA, info.position, info.normal,
                                         info.distance, info.impulse, info.newCollision);
        }

        this.previousCollisions = currentCollisions;
        
        TundraSDK.framework.events.send("PhysicsWorld.Update", subStepTime);
    },
    
    /**
        Set physics world gravity.

        @method setGravity
        @param {Number} x
        @param {Number} y
        @param {Number} z
    */
    setGravity: function(x, y ,z)
    {
        this.world.setGravity(new Ammo.btVector3(x, y, z));
    },
    
    /**
        Get physics world gravity.

        @method gravity
        @return {THREE.Vector3} physics world gravity
    */
    gravity: function()
    {
        var gravity = this.world.getGravity();
        return new THREE.Vector3(gravity.x(), gravity.y(), gravity.z());
    },
    
    /** Raycast to the world. Returns only a single (the closest) result.
    
        @method raycast
        @param origin World origin position
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
            result.entity = this.ptrToRigidbodyMap_[rayCallback.get_m_collisionObject().ptr].parentEntity;
        }
        
        Ammo.destroy(from);
        Ammo.destroy(to);
        to = null, from = null, nDir = null;
        
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
        
        this.ptrToRigidbodyMap_ = {}; 
    }
});

return PhysicsWorld_Ammo;

}); // require js
