
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
            Mass of the body. Set to 0 to have a static (immovable) object
            @property mass (attribute)
            @type Attribute
            @default 0.0
        */
        this.declareAttribute(0, "mass", 0.0, Attribute.Real);
        /**
            Shape type, see ShapeType.
            @property shapeType
            @type Attribute
            @default ShapeType.Box
        */
        this.declareAttribute(1, "shapeType", EC_RigidBody.ShapeType.Box, Attribute.Int);
        /**
            Size (scaling) of the shape.
            Size.z is applicable only for box, and size.y is not applicable for sphere. For non-box shapes x == radius and y == height.
            Shape is further scaled by Placeable scale.
            @property size
            @type Attribute
            @default THREE.Vector3(1.0, 1.0, 1.0)
        */
        this.declareAttribute(2, "size", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            Collision mesh asset reference, only effective if shapeType is Shape_TriMesh.
            @property collisionMeshRef
            @type Attribute
            @default ""
        */
        this.declareAttribute(3, "collisionMeshRef", "", Attribute.AssetReference);
        /**
            Friction coefficient between 0.0 - 1.0.
            @property friction
            @type Attribute
            @default 0.5
        */
        this.declareAttribute(4, "friction", 0.5, Attribute.Real);
        /**
            Linear damping coefficient of the object (makes it lose velocity even when no force acts on it).
            @property linearDamping
            @type Attribute
            @default 0.0
        */
        this.declareAttribute(5, "linearDamping", 0.0, Attribute.Real);
        /**
            Angular damping coefficient of the object (makes it lose angular velocity even when no force acts on it)
            @property angularDamping
            @type Attribute
            @default 0.0
        */
        this.declareAttribute(6, "angularDamping", 0.0, Attribute.Real);
        /**
            Linear factor. Specifies the axes on which forces can act on the object, making it move.
            @property linearFactor
            @type Attribute
            @default THREE.Vector3(1.0, 1.0, 1.0)
        */
        this.declareAttribute(7, "linearFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            Angular factor. Defines in which dimensions the object can rotate
            @property angularFactor
            @type Attribute
            @default THREE.Vector3(1.0, 1.0, 1.0)
        */
        this.declareAttribute(8, "angularFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            Linear velocity
            @property linearVelocity
            @type Attribute
            @default THREE.Vector3(0.0, 0.0, 0.0)
        */
        this.declareAttribute(9, "linearVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3);
        /**
            Specifies the axes on which torques can act on the object, making it rotate.
            @property angularVelocity
            @type Attribute
            @default THREE.Vector3(0.0, 0.0, 0.0)
        */
        this.declareAttribute(10, "angularVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3);
        /**
            Kinematic flag. If true, forces don't affect the object, but it may push other objects around.
            @property kinematic
            @type Attribute
            @default false
        */
        this.declareAttribute(11, "kinematic", false, Attribute.Bool);
        /**
            Phantom flag. If true, contact response is disabled, ie. there is no collision interaction between this object and others
            @property phantom
            @type Attribute
            @default false
        */
        this.declareAttribute(12, "phantom", false, Attribute.Bool);
        /**
            DrawDebug flag. If true, collision shape will be visualized when physics debug drawing is enabled.
            @property drawDebug
            @type Attribute
            @default false
        */
        this.declareAttribute(13, "drawDebug", false, Attribute.Bool);
        /**
            The collision layer bitmask of this rigidbody. Several bits can be set. 0 is default (all bits set)
            @property collisionLayer
            @type Attribute
            @default -1
        */
        this.declareAttribute(14, "collisionLayer", -1, Attribute.Int);
        /**
            Tells with which collision layers this rigidbody collides with (a bitmask). 0 is default (all bits set)
            @property collisionMask
            @type Attribute
            @default -1
        */
        this.declareAttribute(15, "collisionMask", -1, Attribute.Int);
        /**
            Rolling friction coefficient between 0.0 - 1.0.
            @property rollingFriction
            @type Attribute
            @default 0.5
        */
        this.declareAttribute(16, "rollingFriction", 0.5, Attribute.Real);
        /**
            Gravity enable. If true (default), the physics world gravity affects the object.
            @property useGravity
            @type Attribute
            @default true
        */
        this.declareAttribute(17, "useGravity", true, Attribute.Bool);
        
        // TODO! use btMotionState subclass if possible
        this.updateId_ = TundraSDK.framework.frame.onUpdate(this, this.onFrame_);
        this.ignoreTransformChange_ = false;
        this.parentChangedEvent_ = null;
        
        this.collisionShape_ = null;
        this.rigidbody_ = null;
    },
    
    reset : function()
    {
        TundraSDK.framework.events.remove("EC_Rigidbody." + this.parentEntity.id + ".PhysicsCollision");
        TundraSDK.framework.events.unsubscribe(this.updateId_.channel, this.updateId_.id);
        this.removeCollisionShape();
        this.removeBody();
    },
    
    __classvars__ : {
        /**
            @property ShapeType
            @static
            @type Object
            @param {Number} Box [value=0]
            @param {Number} Sphere [value=1]
            @param {Number} Cylinder [value=2]
            @param {Number} Capsule [value=3]
            @param {Number} TriMesh [value=4] Not supported
            @param {Number} HeightField [value=5] Not supported
            @param {Number} ConvexHull [value=6] Not supported
            @param {Number} Cone [value=7]
        */
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
        
        /**
            @property CollisionFlags
            @static
            @type Object
            @param {Number} STATIC_OBJECT [value=1]
            @param {Number} KINEMATIC_OBJECT [value=2]
            @param {Number} NO_CONTACT_RESPONSE [value=4]
            @param {Number} CUSTOM_MATERIAL_CALLBACK [value=8]
            @param {Number} CHARACTER_OBJECT [value=16]
            @param {Number} DISABLE_VISUALIZE_OBJECT [value=32]
            @param {Number} DISABLE_SPU_COLLISION_PROCESSING [value=64]
        */
        CollisionFlags : { 
            STATIC_OBJECT : 1, 
            KINEMATIC_OBJECT : 2,
            NO_CONTACT_RESPONSE : 4,
            CUSTOM_MATERIAL_CALLBACK : 8,
            CHARACTER_OBJECT : 16,
            DISABLE_VISUALIZE_OBJECT : 32, 
            DISABLE_SPU_COLLISION_PROCESSING : 64 
        },
        
        /**
            @property ForceThresholdSq
            @static
            @type Number
        */
        ForceThresholdSq : 0.0005 * 0.0005,
        
        /**
            @property ImpulseThresholdSq
            @static
            @type Number
        */
        ImpulseThresholdSq : 0.0005 * 0.0005,
        
        /**
            @property TorqueThresholdSq
            @static
            @type Number
        */
        TorqueThresholdSq : 0.0005 * 0.0005
    },
    
    attributeChanged : function(index, name, value)
    {
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
        @param {THREE.Vector3} force vector
        @param {THREE.Vector3} position
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
        @param {THREE.Vector3} torgue
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
        @param {THREE.Vector3} impulse
        @param {THREE.Vector3} position
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
        @param {THREE.Vector3} torgueImpulse
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
        
        this.setRigidbodyPosition(this.parentEntity.placeable.position());
    },
    
    /**
        Returns true if the currently used shape is a primitive shape (box et al.), false otherwise.

        @method isPrimitiveShape
        @return {boolean}
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
        
        @method createBody
    */
    createBody : function()
    {
        if (this.parentEntity.placeable === undefined ||
            this.parentEntity.placeable === null)
            return;
        
        // Realase the old body
        this.createCollisionShape();
        this.removeBody();
        
        // Read component's attribute valeus
        var mass = this.attributes.mass.get();
        var linDamping = this.attributes.linearDamping.get();
        var angDamping = this.attributes.angularDamping.get();
        var collisionLayer = this.attributes.collisionLayer.get();
        var collisionMask =  this.attributes.collisionMask.get();
        
        var isKinematic = this.attributes.kinematic.get();
        var isPhantom = this.attributes.phantom.get();
        var drawDebug = this.attributes.drawDebug.get();
        var isDynamic = mass > 0.0;
        
        // Read placeables position and rotation
        var pos = this.parentEntity.placeable.position();
        var rot = this.parentEntity.placeable.attributes.transform.get().orientation();
        var transform = new Ammo.btTransform();
        var position = new Ammo.btVector3(pos.x, pos.y, pos.z);
        var quat = new Ammo.btQuaternion(rot.x, rot.y, rot.z, rot.w);
        transform.setOrigin(position);
        transform.setRotation(quat);
        
        var localInertia = new Ammo.btVector3(0.0, 0.0, 0.0);
        if (isDynamic)
            this.collisionShape_.calculateLocalInertia(mass, localInertia);
        
        var myMotionState = new Ammo.btDefaultMotionState(transform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass,
                                                          myMotionState,
                                                          this.collisionShape_,
                                                          localInertia);
        rbInfo.set_m_linearDamping(linDamping);
        rbInfo.set_m_angularDamping(angDamping);
        
        this.rigidbody_ = new Ammo.btRigidBody(rbInfo);
        
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
        Ammo.destroy(transform);
        Ammo.destroy(position);
        Ammo.destroy(quat);
        
        rbInfo = null;
        localInertia = null;
        transform = null;
        position = null;
        quat = null;
    },
    
    /**
        Destroy the body
        
        @method removeBody
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
        Create the collision shape
        
        @method createCollisionShape
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
        else if (shape === EC_RigidBody.ShapeType.TriMesh)
            this.log.warn("TriMesh collsion shape is not suppoerted");
        else if (shape === EC_RigidBody.ShapeType.HeightField)
            this.log.warn("HeightField collsion shape is not suppoerted");
        else if (shape === EC_RigidBody.ShapeType.ConvexHull)
            this.log.warn("ConvexHull collsion shape is not suppoerted");
        else if (shape === EC_RigidBody.ShapeType.Cone)
            this.collisionShape_ = new Ammo.btConeShape(size.x * 0.5, size.y);
        
        this.updateScale();
        return this.collisionShape_;
    },
    
    /**
        Remove the collision shape.
        
        @method removeCollisionShape
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
    
    /**
        Change rigidbody position in physics world.
        
        @method setRigidbodyPosition
        @param {THREE.Vector3} position
    */
    setRigidbodyPosition : function(position)
    {
        if (this.ignoreTransformChange_ ||
            this.rigidbody_ === undefined ||
            this.rigidbody_ === null)
            return;
        
        var worldTrans = new Ammo.btTransform();
        this.rigidbody_.getMotionState().getWorldTransform(worldTrans);
        worldTrans.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
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
