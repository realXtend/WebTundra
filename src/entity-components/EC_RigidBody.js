
define(["core/framework/TundraSDK",
        "lib/ammo",
        "lib/three",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/scene/AttributeChange",
        "core/physics/PhysicsWorld"
    ], function(TundraSDK, Ammo, THREE, Scene, IComponent, Attribute, AttributeChange, PhysicsWorld) {

/**
    @class EC_RigidBody
    @extends IComponent
    @constructor
*/
var EC_RigidBody = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property mass (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "mass", 0.0, Attribute.Real);
        /**
            @property shapeType (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "shapeType", EC_RigidBody.ShapeType.Box, Attribute.Int);
        /**
            @property size (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "size", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            @property collisionMeshRef (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "collisionMeshRef", "", Attribute.AssetReference);
        /**
            @property friction (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "friction", 0.5, Attribute.Real);
        /**
            @property linearDamping (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "linearDamping", 0.0, Attribute.Real);
        /**
            @property angularDamping (attribute)
            @type Attribute
        */
        this.declareAttribute(6, "angularDamping", 0.0, Attribute.Real);
        /**
            @property linearFactor (attribute)
            @type Attribute
        */
        this.declareAttribute(7, "linearFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            @property angularFactor (attribute)
            @type Attribute
        */
        this.declareAttribute(8, "angularFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            @property linearVelocity (attribute)
            @type Attribute
        */
        this.declareAttribute(9, "linearVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3);
        /**
            @property angularVelocity (attribute)
            @type Attribute
        */
        this.declareAttribute(10, "angularVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3);
        /**
            @property kinematic (attribute)
            @type Attribute
        */
        this.declareAttribute(11, "kinematic", false, Attribute.Bool);
        /**
            @property phantom (attribute)
            @type Attribute
        */
        this.declareAttribute(12, "phantom", false, Attribute.Bool);
        /**
            @property drawDebug (attribute)
            @type Attribute
        */
        this.declareAttribute(13, "drawDebug", false, Attribute.Bool);
        /**
            @property collisionLayer (attribute)
            @type Attribute
        */
        this.declareAttribute(14, "collisionLayer", -1, Attribute.Int);
        /**
            @property collisionMask (attribute)
            @type Attribute
        */
        this.declareAttribute(15, "collisionMask", -1, Attribute.Int);
        /**
            @property rollingFriction (attribute)
            @type Attribute
        */
        this.declareAttribute(16, "rollingFriction", 0.5, Attribute.Real);
        /**
            @property useGravity (attribute)
            @type Attribute
        */
        this.declareAttribute(17, "useGravity", true, Attribute.Bool);
        
        this.collisionShape_ = null;
        this.rigidbody_ = null;
        
        // TODO! use btMotionState subclass if possible
        this.updateId_ = TundraSDK.framework.frame.onUpdate(this, this.onFrame_);
        
        this.ignoreTransformChange_ = false;
        this.parentChangedEvent_ = null;
    },
    
    reset : function()
    {
        TundraSDK.framework.events.remove("EC_Rigidbody." + this.parentEntity.id + ".PhysicsCollision");
        TundraSDK.framework.events.unsubscribe(this.updateId_.channel, this.updateId_.id);
        this.removeCollisionShape();
        this.removeBody();
    },
    
    __classvars__ : {
        ShapeType : {
            Box:0,
            Sphere:1,
            Cylinder:2,
            Capsule:3,
            TriMesh:4,
            HeightField:5,
            ConvexHull:6,
            Cone:7
        },
        CollisionFlags : { 
            STATIC_OBJECT : 1, 
            KINEMATIC_OBJECT : 2, 
            NO_CONTACT_RESPONSE : 4, 
            CUSTOM_MATERIAL_CALLBACK : 8, 
            CHARACTER_OBJECT : 16, 
            DISABLE_VISUALIZE_OBJECT : 32, 
            DISABLE_SPU_COLLISION_PROCESSING : 64 
        },
        ForceThresholdSq : 0.0005 * 0.0005,
        ImpulseThresholdSq : 0.0005 * 0.0005,
        TorqueThresholdSq : 0.0005 * 0.0005
    },
    
    attributeChanged : function(index, name, value)
    {
        //console.log("Attribute '" + name +  "' changed to " + value);
        switch(index)
        {
            case 0: // Mass
                this.createBody();
                break;
            case 1: // ShapeType
                this.createBody();
                break;
            case 2: // Size
                this.updateScale();
                break;    
            case 3: // CollisionMeshRef
                this.log.warn("Missing implementation of '" + name + "' attribute.");
                break;
            case 4: // Friction
                this.rigidbody_.setFriction(friction);
                break;
            case 5: // LinearDamping
                this.createBody();
                break;
            case 6: // AngularDamping
                this.createBody();
                break;
            case 7: // LinearFactor
                this.log.warn("Missing implementation of '" + name + "' attribute.");
                break;
            case 8: // AngularFactor
                this.log.warn("Missing implementation of '" + name + "' attribute.");
                break;
            case 9: // LinearVelocity
                var v = new Ammo.btVector3(value.x, value.y, value.z);
                this.rigidbody_.setLinearVelocity(v);
                Ammo.destroy(v);
                v = null;
                break;
            case 10: // AngularVelocity
                var v = new Ammo.btVector3(value.x, value.y, value.z);
                this.rigidbody_.setAngularVelocity(v);
                Ammo.destroy(v);
                v = null;
                break;
            case 11: // Kinematic
                this.createBody();
                break;
            case 12: // Phantom
                this.createBody();
                break;
            case 13: // DrawDebug
                this.createBody();
                break;
            case 14: // CollisionLayer
                this.createBody();
                break;
            case 15: // CollisionMask
                this.createBody();
                break;
            case 16: // RollingFriction
                this.rigidbody_.setRollingFriction(value);
                break;
            case 17: // UseGravity
                this.log.warn("Missing implementation of '" + name + "' attribute.");
                break;
        }
    },
    
    /**
        Force the body to activate (wake up)

        @method activate
    */
    activate : function()
    {
        if (this.rigidbody_ === undefined ||
            this.rigidbody_ === null)
            this.rigidbody_.activate();
    },
    
    setParent : function(entity)
    {
        this.$super(entity);
        
        if (this.rigidbody_ === null)
            this.createBody();
        
        if (this.parentChangedEvent_ !== null)
            TundraSDK.framework.events.unsubscribe(this.parentChangedEvent_.channel,
                                                   this.parentChangedEvent_.id);
        
        if (this.parentEntity !== undefined && this.parentEntity !== null)
            this.parentChangedEvent_ = this.parentEntity.placeable.onAttributeChanged(this, this.onPlaceableUpdated);
    },
    
    /**
        Apply a force to the body.

        @method applyForce
        @param {Float3} force vector
        @param {Float3} position
    */
    applyForce : function(force, position)
    {
        if (this.rigidbody_ === null ||
            force.lengthSq() < EC_RigidBody.ForceThresholdSq)
            return;
        
        this.activate();
        var f = new Ammo.btVector3(force.x, force.y, force.z);
        if (typeof position === "number" &&
            position.length() > 0.0001)
        {
            var p = new Ammo.btVector3(position.x, position.y, position.z);
            this.rigidbody_.applyForce(f, p);
            Ammo.destroy(p);
            p = null;
        }
        else
        {
            this.rigidbody_.applyCentralForce(f);
        }
        Ammo.destroy(f);
        f = null;
    },
    
    /**
        Apply a torque to the body.

        @method applyTorgue
        @param {Float3} torgue
    */
    applyTorgue : function(torgue)
    {
        //var  = new THREE.Vector3(force);
        if (this.rigidbody_ === null ||
            torgue.lengthSq() < EC_RigidBody.TorqueThresholdSq)
            return;
        
        this.activate();
        var f = new Ammo.btVector3(torgue.x, torgue.y, torgue.z);
        this.rigidbody_.applyTorque(f);
        Ammo.destroy(f);
        f = null;
    },
    
    /**
        Apply an impulse to the body

        @method applyImpulse
        @param {Float3} impulse
        @param {Float3} position
    */
    applyImpulse : function(impulse, position)
    {
        if (this.rigidbody_ === null ||
            impulse.lengthSq() < EC_RigidBody.ImpulseThresholdSq)
            return;
        
        this.activate();
        var f = new Ammo.btVector3(impulse.x, impulse.y, impulse.z);
        if (typeof position === "number" &&
            position.length() > 0.0001)
        {
            var p = new Ammo.btVector3(position.x, position.y, position.z);
            this.rigidbody_.applyImpulse(f, p);
            Ammo.destroy(p);
            p = null;
        }
        else
        {
            this.rigidbody_.applyCentralImpulse(f);
        }
        Ammo.destroy(f);
        f = null;
    },
    
    /**
        Apply a torque impulse to the body

        @method applyTorgueImpulse
        @param {Float3} torgueImpulse
    */
    applyTorgueImpulse : function(torgueImpulse)
    {
        //var  = new THREE.Vector3(force);
        if (this.rigidbody_ === null ||
            torgueImpulse.lengthSq() < EC_RigidBody.TorqueThresholdSq)
            return;
        
        this.activate();
        var f = new Ammo.btVector3(torgueImpulse.x, torgueImpulse.y, torgueImpulse.z);
        this.rigidbody_.applyTorqueImpulse(f);
        Ammo.destroy(f);
        f = null;
    },
    
    onPlaceableUpdated : function(entity, component, attributeIndex, attributeName, attributeValue)
    {
        if (this.rigidbody_ === undefined ||
            this.rigidbody_ === null ||
            attributeIndex !== 0)
            return;
        
        var pos = this.parentEntity.placeable.position();
        this.setRigidbodyPosition(pos.x, pos.y, pos.z);
    },
    
    /**
        Returns true if the currently used shape is a primitive shape (box et al.), false otherwise.

        @method isPrimitiveShape
        @return {Bool}
    */
    isPrimitiveShape : function()
    {
        switch(this.attributes.shapeType.get())
        {
            case EC_RigidBody.ShapeType.TriMesh:
            case EC_RigidBody.ShapeType.HeightField:
            case EC_RigidBody.ShapeType.ConvexHull:
                return false;
                break;
            default:
                return true;
        }
    },
    
    /**
        Create the body. No-op if the scene is not associated with a physics world.
    */
    createBody : function()
    {
        if (this.parentEntity.placeable === undefined ||
            this.parentEntity.placeable === null)
            return;
        
        this.createCollisionShape();
        this.removeBody();
        
        // Read component's attribute valeus
        var mass = this.attributes.mass.get();
        var pos = this.parentEntity.placeable.position();
        var linDamping = this.attributes.linearDamping.get();
        var angDamping = this.attributes.angularDamping.get();
        var collisionLayer = this.attributes.collisionLayer.get();
        var collisionMask =  this.attributes.collisionMask.get();
        
        var isKinematic = this.attributes.kinematic.get();
        var isPhantom = this.attributes.phantom.get();
        var drawDebug = this.attributes.drawDebug.get();
        var isDynamic = mass > 0.0;
        
        var startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        var position = new Ammo.btVector3(pos.x, pos.y, pos.z);
        startTransform.setOrigin(position);
        
        var localInertia = new Ammo.btVector3(0.0, 0.0, 0.0);
        if (isDynamic)
            this.collisionShape_.calculateLocalInertia(mass, localInertia);
        
        var myMotionState = new Ammo.btDefaultMotionState(startTransform);
        
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass,
                                                          myMotionState,
                                                          this.collisionShape_,
                                                          localInertia);
        rbInfo.set_m_linearDamping(linDamping);
        rbInfo.set_m_angularDamping(angDamping);
        
        this.rigidbody_ = new Ammo.btRigidBody(rbInfo);
        
        // Read collision flags
        var collisionFlags = 0;
        if (!isDynamic)
            collisionFlags |= EC_RigidBody.CollisionFlags.STATIC_OBJECT;
        if (isKinematic)
            collisionFlags |= EC_RigidBody.CollisionFlags.KINEMATIC_OBJECT;
        if (isPhantom)
            collisionFlags |= EC_RigidBody.CollisionFlags.NO_CONTACT_RESPONSE;
        if (!drawDebug)
            collisionFlags |= EC_RigidBody.CollisionFlags.DISABLE_VISUALIZE_OBJECT;
        this.rigidbody_.setCollisionFlags(collisionFlags);
        
        if (collisionLayer > -1 && collisionMask > -1)
        {
            TundraSDK.framework.physicsWorld.addRigidBody(this,
                                                          collisionLayer,
                                                          collisionMask);
        }
        else
            TundraSDK.framework.physicsWorld.addRigidBody(this);
        
        Ammo.destroy(rbInfo);
        Ammo.destroy(localInertia);
        Ammo.destroy(startTransform);
        Ammo.destroy(position);
        
        rbInfo = null;
        localInertia = null;
        startTransform = null;
        position = null;
    },
    
    /**
         Destroy the body
    */
    removeBody : function()
    {
        if (this.rigidbody_ === undefined ||
            this.rigidbody_ === null)
            return;
        
        TundraSDK.framework.physicsWorld.removeRigidBody(this);
        Ammo.destroy(this.rigidbody_);
        this.rigidbody_ = null;
    },
    
    /**
        Create the collision shape.
    */
    createCollisionShape : function()
    {
        this.removeCollisionShape();
        
        var shape = this.attributes.shapeType.get();
        var size = this.attributes.size.get();
        
        if (shape === EC_RigidBody.ShapeType.Box)
        {
            var s = new Ammo.btVector3(1.0, 1.0, 1.0);
            this.collisionShape_ = new Ammo.btBoxShape(s);
            Ammo.destroy(s);
            s = null;
        }
        else if (shape === EC_RigidBody.ShapeType.Sphere)
            this.collisionShape_ = new Ammo.btSphereShape(size.x * 0.5);
        else if (shape === EC_RigidBody.ShapeType.Cylinder)
        {
            var s = new Ammo.btVector3(1.0, 1.0, 1.0);
            this.collisionShape_ = new Ammo.btCylinderShape(new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5));
            Ammo.destroy(s);
            s = null;
        }
        else if (shape === EC_RigidBody.ShapeType.Capsule)
            this.collisionShape_ = new Ammo.btCapsuleShape(size.x * 0.5, size.y * 0.5);
        /*else if (shape === EC_RigidBody.ShapeType.TriMesh)
            this.collisionShape_ = new Ammo.btBoxShape(btSize);
        else if (shape === EC_RigidBody.ShapeType.HeightField)
            this.collisionShape_ = new Ammo.btBoxShape(btSize);
        else if (shape === EC_RigidBody.ShapeType.ConvexHull)
            this.collisionShape_ = new Ammo.btBoxShape(btSize);*/
        else if (shape === EC_RigidBody.ShapeType.Cone)
            this.collisionShape_ = new Ammo.btConeShape(size.x * 0.5, size.y);
        
        this.updateScale();
        return this.collisionShape_;
    },
    
    /**
        Remove the collision shape.
    */
    removeCollisionShape : function() {
        if (this.collisionShape_ === undefined ||
            this.collisionShape_ === null)
            return;
        
        Ammo.destroy(this.collisionShape_);
        this.collisionShape_ = null;
    },
    
    onFrame_ : function()
    {
        this.updateTransformPosition();
    },
    
    updateTransformPosition : function()
    {
        if (this.ignoreTransformChange_ ||
            this.rigidbody_ === undefined ||
            this.rigidbody_ === null ||
            this.parentEntity.placeable === undefined ||
            this.parentEntity.placeable === null)
            return;
        
        this.ignoreTransformChange_ = true;
        
        var transform = new Ammo.btTransform();
        this.rigidbody_.getMotionState().getWorldTransform(transform);
        var origin = transform.getOrigin();
        
        // TODO remove THREE Quaternion when possible
        var quat = new THREE.Quaternion();
        var rot = transform.getRotation();
        quat.set(rot.x(), rot.y(), rot.z(), rot.w());
        
        var t = this.parentEntity.placeable.transform;
        t.setPosition(origin.x(), origin.y(), origin.z());
        t.setRotation(quat);
        this.parentEntity.placeable.transform = t;
        
        Ammo.destroy(transform);
        transform = null;
        
        this.ignoreTransformChange_ = false;
    },
    
    setRigidbodyPosition : function(x, y, z)
    {
        if (this.ignoreTransformChange_ ||
            this.rigidbody_ === undefined ||
            this.rigidbody_ === null)
            return;
        
        var worldTrans = new Ammo.btTransform();
        this.rigidbody_.getMotionState().getWorldTransform(worldTrans);
        worldTrans.setOrigin(new Ammo.btVector3(x, y, z));
        this.rigidbody_.getMotionState().setWorldTransform(worldTrans);
        this.rigidbody_.activate();
                
        Ammo.destroy(worldTrans);
        worldTrans = null;
    },
    
    updateScale : function()
    {
        if (this.collisionShape_ === undefined ||
            this.collisionShape_ === null ||
            this.parentEntity.placeable === undefined ||
            this.parentEntity.placeable === null)
            return;
        
        var sizeVec = this.size;
        var scale = this.parentEntity.placeable.transform.scale;
        // Sanitate the size
        if (sizeVec.x < 0.0)
            sizeVec.x = 0.0;
        if (sizeVec.y < 0.0)
            sizeVec.y = 0.0;
        if (sizeVec.z < 0.0)
            sizeVec.z = 0.0;
        
        var newSize = new Ammo.btVector3();
        if (this.shapeType === EC_RigidBody.ConvexHull ||
            this.shapeType === EC_RigidBody.TriMesh)
            newSize.setValue(scale.x, scale.y, scale.z);
        else
            newSize.setValue(sizeVec.x * scale.x, sizeVec.y * scale.y, sizeVec.z * scale.z);
        this.collisionShape_.setLocalScaling(newSize);
        
        Ammo.destroy(newSize);
        newSize = null;
    },
    
    /**
        Registers a callback for physics collision.

        @example
            TundraSDK.framework.scene.onPhysicsCollision(null, function(entity, position, normal,
                                                                        distance, impulse, newCollision)
            {
                console.log("on collision: " + entity.id);
            });

        @method onPhysicsCollision
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onPhysicsCollision : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("EC_Rigidbody." + this.parentEntity.id + ".PhysicsCollision", context, callback);
    },
    
    emitPhysicsCollision : function(entity, position, normal, distance, impulse, newCollision)
    {
        if (this.parentEntity === null)
            return;
        
        TundraSDK.framework.events.send("EC_Rigidbody." + this.parentEntity.id + ".PhysicsCollision",
                                        entity,
                                        position,
                                        normal,
                                        distance,
                                        impulse,
                                        newCollision);
    }
});

Scene.registerComponent(23, "EC_RigidBody", EC_RigidBody);

return EC_RigidBody;

}); // require js
