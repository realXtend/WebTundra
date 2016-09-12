
define(["core/framework/Tundra",
        "lib/ammo",
        "lib/three",
        "core/scene/Scene",
        "core/scene/Attribute",
        "core/scene/AttributeChange",
        "core/physics/CollisionInfo",
        "entity-components/EC_RigidBody"
    ], function(Tundra, Ammo, THREE, Scene, Attribute, AttributeChange, CollisionInfo, EC_RigidBody) {

/**
    @class EC_RigidBody_Ammo
    @extends EC_RigidBody
    @constructor
*/
var EC_RigidBody_Ammo = EC_RigidBody.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @todo If possible use btMotionState for simulation updates,
            instead of directly polling changes from ammo rigidbody.
        */
        this.updateId_ = Tundra.frame.onUpdate(this, this.update);

        this.ignoreTransformChange_ = false;
        this.parentChangedEvent_ = null;

        this.collisionShapeAmmo = null;
        this.rigidAmmo = null;

        this.pendingMeshAsset_ = false; // Is EC_Mesh assets loaded
        this.dirty_ = false; // If dirty create new isntance of rigidbody
    },

    __classvars__ :
    {
        Implementation : "ammo.js",
    },

    reset : function()
    {
        Tundra.events.remove("EC_Rigidbody." + this.parentEntity.id + ".PhysicsCollision");
        Tundra.events.unsubscribe(this.updateId_.channel, this.updateId_.id);
        this.removeCollisionShape();
        this.removeBody();
    },

    attributeChanged : function(index, name, value)
    {
        switch(index)
        {
            case 0: // Mass
                this.dirty_ = true;
                break;
            case 1: // ShapeType
                this.dirty_ = true;
                break;
            case 2: // Size
                this.dirty_ = true;
                break;
            case 3: // CollisionMeshRef
                //this.log.warn("Missing implementation of '" + name + "' attribute.");
                break;
            case 4: // Friction
                this.rigidAmmo.setFriction(value);
                break;
            case 5: // Restitution
                this.rigidAmmo.setRestitution(value);
                break;
            case 6: // LinearDamping
                this.dirty_ = true;
                break;
            case 7: // AngularDamping
                this.dirty_ = true;
                break;
            case 8: // LinearFactor
                if (this.rigidAmmo)
                {
                    var v = new Ammo.btVector3(value.x, value.y, value.z);
                    this.rigidAmmo.setLinearFactor(v);
                    Ammo.destroy(v);
                    v = null;
                }
                break;
            case 9: // AngularFactor
                if (this.rigidAmmo)
                {
                    var v = new Ammo.btVector3(value.x, value.y, value.z);
                    this.rigidAmmo.setAngularFactor(v);
                    Ammo.destroy(v);
                    v = null;
                }
                break;
            case 10: // Kinematic
                this.dirty_ = true;
                break;
            case 11: // Phantom
                this.dirty_ = true;
                break;
            case 12: // DrawDebug
                //this.log.warn("Missing implementation of '" + name + "' attribute.");
                break;
            case 13: // LinearVelocity
                if (!this.ignoreTransformChange_ && this.rigidAmmo)
                {
                    var v = new Ammo.btVector3(value.x, value.y, value.z);
                    this.rigidAmmo.setLinearVelocity(v);
                    Ammo.destroy(v);
                    v = null;
                }
                break;
            case 14: // AngularVelocity
                if (!this.ignoreTransformChange_ && this.rigidAmmo)
                {
                    var v = new Ammo.btVector3(value.x * Math.PI / 180, value.y * Math.PI / 180, value.z * Math.PI / 180);
                    this.rigidAmmo.setAngularVelocity(v);
                    Ammo.destroy(v);
                    v = null;
                }
                break;
            case 15: // CollisionLayer
                this.dirty_ = true;
                break;
            case 16: // CollisionMask
                this.dirty_ = true;
                break;
            case 17: // RollingFriction
                if (this.rigidAmmo)
                    this.rigidAmmo.setRollingFriction(value);
                break;
            case 18: // UseGravity
                //this.log.warn("Missing implementation of '" + name + "' attribute.");
                break;
        }
    },

    /**
        Check whether body is active

        @method isActive
    */
    isActive : function()
    {
        if (this.rigidAmmo !== null)
            return this.rigidAmmo.isActive();
        return false;
    },

    /**
        Check whether body mass is more than zero and collision shape is not TriMesh

        @method isDynamicBody
        @return {boolean}
    */
    isDynamicBody : function()
    {
        return this.attributes.mass.get() > 0.0 &&
               this.attributes.shapeType.get() !== EC_RigidBody.ShapeType.TriMesh;
    },

    /**
        Force the body to activate (wake up)

        @method activate
    */
    activate : function()
    {
        if (this.rigidAmmo !== null)
            this.rigidAmmo.activate(true);
    },

    setParent : function(entity)
    {
        this.$super(entity);

        if (this.rigidAmmo === null)
            this.createBody();

        if (this.parentChangedEvent_ !== null)
            Tundra.events.unsubscribe(this.parentChangedEvent_.channel,
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
        if (this.rigidAmmo === null ||
            force.lengthSq() < EC_RigidBody.ForceThresholdSq)
            return;

        this.activate();
        var f = new Ammo.btVector3(force.x, force.y, force.z);
        if (typeof position === "number" &&
            position.length() > 0.0001)
        {
            var p = new Ammo.btVector3(position.x, position.y, position.z);
            this.rigidAmmo.applyForce(f, p);
            Ammo.destroy(p);
            p = null;
        }
        else
        {
            this.rigidAmmo.applyCentralForce(f);
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
        if (this.rigidAmmo === null ||
            torgue.lengthSq() < EC_RigidBody.TorqueThresholdSq)
            return;

        this.activate();
        var f = new Ammo.btVector3(torgue.x, torgue.y, torgue.z);
        this.rigidAmmo.applyTorque(f);
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
        if (this.rigidAmmo === null ||
            impulse.lengthSq() < EC_RigidBody.ImpulseThresholdSq)
            return;

        this.activate();
        var f = new Ammo.btVector3(impulse.x, impulse.y, impulse.z);
        if (typeof position === "number" &&
            position.length() > 0.0001)
        {
            var p = new Ammo.btVector3(position.x, position.y, position.z);
            this.rigidAmmo.applyImpulse(f, p);
            Ammo.destroy(p);
            p = null;
        }
        else
        {
            this.rigidAmmo.applyCentralImpulse(f);
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
        if (this.rigidAmmo === null ||
            torgueImpulse.lengthSq() < EC_RigidBody.TorqueThresholdSq)
            return;

        this.activate();
        var f = new Ammo.btVector3(torgueImpulse.x, torgueImpulse.y, torgueImpulse.z);
        this.rigidAmmo.applyTorqueImpulse(f);
        Ammo.destroy(f);
        f = null;
    },

    onPlaceableUpdated : function(entity, component, attributeIndex, attributeName, attributeValue)
    {
        if (this.rigidAmmo === undefined ||
            this.rigidAmmo === null ||
            attributeIndex !== 0)
            return;

        this.setRigidbodyTransform(this.parentEntity.placeable.worldPosition(), this.parentEntity.placeable.worldOrientation());
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

        this.dirty_ = false;

        // Realase the old body
        this.removeCollisionShape();
        this.removeBody();

        this.createCollisionShape();
        if (this.collisionShapeAmmo === null)
            return;

        // Read component's attribute values
        var mass           = this.attributes.mass.get();
        var linDamping     = this.attributes.linearDamping.get();
        var angDamping     = this.attributes.angularDamping.get();
        var collisionLayer = this.attributes.collisionLayer.get();
        var collisionMask  = this.attributes.collisionMask.get();
        var friction       = this.attributes.friction.get();
        var linVel         = this.attributes.linearVelocity.get();
        var angVel         = this.attributes.angularVelocity.get();
        var rolFri         = this.attributes.rollingFriction.get();
        var linFactor      = this.attributes.linearFactor.get();
        var angFactor      = this.attributes.angularFactor.get();

        var isKinematic    = this.attributes.kinematic.get();
        var isPhantom      = this.attributes.phantom.get();
        var drawDebug      = this.attributes.drawDebug.get();

        var isDynamicBody = this.isDynamicBody();

        // Read placeables position and rotation
        var pos = this.parentEntity.placeable.worldPosition();
        var rot = this.parentEntity.placeable.worldOrientation();
        var transform = new Ammo.btTransform();
        var position = new Ammo.btVector3(pos.x, pos.y, pos.z);
        var quat = new Ammo.btQuaternion(rot.x, rot.y, rot.z, rot.w);
        transform.setOrigin(position);
        transform.setRotation(quat);


        var localInertia = new Ammo.btVector3(0.0, 0.0, 0.0);
        if (isDynamicBody)
            this.collisionShapeAmmo.calculateLocalInertia(mass, localInertia);

        var myMotionState = new Ammo.btDefaultMotionState(transform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass,
                                                          myMotionState,
                                                          this.collisionShapeAmmo,
                                                          localInertia);
        rbInfo.set_m_linearDamping(linDamping);
        rbInfo.set_m_angularDamping(angDamping);

        this.rigidAmmo = new Ammo.btRigidBody(rbInfo);

        var collisionFlags = 0;
        if (!isDynamicBody)
            collisionFlags |= EC_RigidBody.CollisionFlags.STATIC_OBJECT;
        if (isKinematic)
            collisionFlags |= EC_RigidBody.CollisionFlags.KINEMATIC_OBJECT;
        if (isPhantom)
            collisionFlags |= EC_RigidBody.CollisionFlags.NO_CONTACT_RESPONSE;
        if (!drawDebug)
            collisionFlags |= EC_RigidBody.CollisionFlags.DISABLE_VISUALIZE_OBJECT;
        this.rigidAmmo.setCollisionFlags(collisionFlags);

        if (collisionLayer > -1 && collisionMask > -1)
        {
            Tundra.physicsWorld.addRigidBody(this,
                                                          collisionLayer,
                                                          collisionMask);
        }
        else
            Tundra.physicsWorld.addRigidBody(this);

        // Push attribute values to rigidbody.
        this.rigidAmmo.setFriction(friction);
        if (!isNaN(rolFri))
            this.rigidAmmo.setRollingFriction(rolFri);

        var v = new Ammo.btVector3(linVel.x, linVel.y, linVel.z);
        this.rigidAmmo.setLinearVelocity(v);

        angVel.multiplyScalar(Math.PI / 180);
        v.setValue(angVel.x, angVel.y, angVel.z);
        this.rigidAmmo.setAngularVelocity(v);

        v.setValue(linFactor.x, linFactor.y, linFactor.z);
        this.rigidAmmo.setLinearFactor(v);

        v.setValue(angFactor.x, angFactor.y, angFactor.z);
        this.rigidAmmo.setAngularFactor(v);

        Ammo.destroy(v);
        v = null;

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

        this.pendingMeshAsset_ = false;
    },

    /**
        Destroy the body

        @method removeBody
    */
    removeBody : function()
    {
        if (this.rigidAmmo === undefined ||
            this.rigidAmmo === null)
            return;

        Tundra.physicsWorld.removeRigidBody(this);
        Ammo.destroy(this.rigidAmmo);
        this.rigidAmmo = null;

        this.pendingMeshAsset_ = false;
    },

    /**
        Create the collision shape

        @method createCollisionShape
        @return Ammo.btCollisionShape
    */
    createCollisionShape : function()
    {
        var shape = this.attributes.shapeType.get();
        var size = this.attributes.size.get();

        // Sanitate the size
        if (size.x < 0.0)
            size.x = 0.0;
        if (size.y < 0.0)
            size.y = 0.0;
        if (size.z < 0.0)
            size.z = 0.0;

        if (shape === EC_RigidBody.ShapeType.Box)
        {
            var s = new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
            this.collisionShapeAmmo = new Ammo.btBoxShape(s);
            Ammo.destroy(s);
            s = null;
        }
        else if (shape === EC_RigidBody.ShapeType.Sphere)
            this.collisionShapeAmmo = new Ammo.btSphereShape(size.x * 0.5);
        else if (shape === EC_RigidBody.ShapeType.Cylinder)
        {
            var s = new Ammo.btVector3(size.x * 0.5, size.x * 0.5, size.x * 0.5);
            this.collisionShapeAmmo = new Ammo.btCylinderShape(s);
            Ammo.destroy(s);
            s = null;
        }
        else if (shape === EC_RigidBody.ShapeType.Capsule)
            this.collisionShapeAmmo = new Ammo.btCapsuleShape(size.x * 0.5, size.y * 0.5);
        else if (shape === EC_RigidBody.ShapeType.TriMesh)
        {
            this.collisionShapeAmmo = this._createTriangleMeshCollider();
            if (this.collisionShapeAmmo === null)
                this.pendingMeshAsset_ = true;
        }
        else if (shape === EC_RigidBody.ShapeType.HeightField)
            this.log.warn("HeightField collsion shape is not supported");
        else if (shape === EC_RigidBody.ShapeType.ConvexHull)
            this.log.warn("ConvexHull collsion shape is not supported");
        else if (shape === EC_RigidBody.ShapeType.Cone)
            this.collisionShapeAmmo = new Ammo.btConeShape(size.x * 0.5, size.y);

        this.updateScale();
    },

    updateScale : function()
    {
        if (this.collisionShapeAmmo === null ||
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
        this.collisionShapeAmmo.setLocalScaling(newSize);

        Ammo.destroy(newSize);
        newSize = null;
    },

    _createTriangleMeshCollider: function()
    {
        if ( !this.hasParentEntity() ||
             this.parentEntity.mesh == null ||
             this.parentEntity.mesh.meshAsset == null )
            return null;

        triangleMesh = new Ammo.btTriangleMesh();
        var threeMesh = this.parentEntity.mesh.meshAsset.getSubmesh(0);
        var vertices = threeMesh.geometry.vertices;
        var faces = threeMesh.geometry.faces;

        var btVer = [];
        var v = null;
        for(var i = 0; i < vertices.length; ++i)
        {
            v = vertices[i];
            btVer.push(new Ammo.btVector3(v.x, v.y, v.z));
        }

        var face = null;
        for(var i = 0; i < faces.length; ++i)
        {
            face = faces[i];
            if ( face instanceof THREE.Face3 )
            {
                triangleMesh.addTriangle(btVer[face.a], btVer[face.b], btVer[face.c]);
            }
            else if ( face instanceof THREE.Face4 )
            {
                triangleMesh.addTriangle(btVer[face.a], btVer[face.b], btVer[face.c]);
                triangleMesh.addTriangle(btVer[face.b], btVer[face.c], btVer[face.d]);
            }
        }

        var collisionShape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);

        for(var i = 0; i < btVer.length; ++i)
            Ammo.destroy(btVer[i]);
        btVer = null;

        return collisionShape;
    },

    /**
        Remove the collision shape.

        @method removeCollisionShape
    */
    removeCollisionShape : function() {
        if (this.collisionShapeAmmo === undefined ||
            this.collisionShapeAmmo === null)
            return;

        Ammo.destroy(this.collisionShapeAmmo);
        this.collisionShapeAmmo = null;
    },

    update : function()
    {
        this.updateTransformPosition();

        if (this.dirty_)
            this.createBody();

        if (this.pendingMeshAsset_)
        {
            var shape = this.attributes.shapeType.get();
            if ( shape === EC_RigidBody.ShapeType.TriMesh &&
                 this.rigidAmmo === null )
            {
                this.createBody();
            }
        }
    },

    updateTransformPosition : function()
    {
        if (this.ignoreTransformChange_ ||
            this.rigidAmmo === null ||
            this.parentEntity.placeable === undefined ||
            this.parentEntity.placeable === null ||
            !this.isActive())
            return;

        this.ignoreTransformChange_ = true;

        var transform = new Ammo.btTransform();
        this.rigidAmmo.getMotionState().getWorldTransform(transform);
        var origin = transform.getOrigin();

        var quat = new THREE.Quaternion();
        var rot = transform.getRotation();
        quat.set(rot.x(), rot.y(), rot.z(), rot.w());

        var t = this.parentEntity.placeable.transform;
        t.setPosition(origin.x(), origin.y(), origin.z());
        t.setRotation(quat);
        this.parentEntity.placeable.transform = t;

        Ammo.destroy(transform);
        transform = null;

        if (this.rigidAmmo !== null)
        {
            // set linear- and angularVelocities attribute values.
            var linearVel = this.rigidAmmo.getLinearVelocity();
            var value = new THREE.Vector3(linearVel.x(), linearVel.y(), linearVel.z());
            if (!this.attributes.linearVelocity.get().equals(value))
                this.attributes.linearVelocity.set(value);

            var angularVel = this.rigidAmmo.getAngularVelocity();
            var radToDeg = 180 / Math.PI;
            value = new THREE.Vector3(angularVel.x() * radToDeg,
                                      angularVel.y() * radToDeg,
                                      angularVel.z() * radToDeg);
            if (!this.attributes.angularVelocity.get().equals(value))
                this.attributes.angularVelocity.set(value);
        }

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
            this.rigidAmmo === undefined ||
            this.rigidAmmo === null)
            return;

        var worldTrans = new Ammo.btTransform();
        this.rigidAmmo.getWorldTransform(worldTrans);
        var o = new Ammo.btVector3(position.x, position.y, position.z)
        worldTrans.setOrigin(o);
        this.rigidAmmo.setWorldTransform(worldTrans);
        this.rigidAmmo.updateInertiaTensor();
        this.rigidAmmo.activate(false);
        Ammo.destroy(o);
        Ammo.destroy(worldTrans);
        worldTrans = null;
    },

    /**
        Change rigidbody position and rotation in physics world.

        @method setRigidbodyTransform
        @param {THREE.Vector3} position
        @param {THREE.Quaternion} rotation
    */
    setRigidbodyTransform : function(position, rotation)
    {
        if (this.ignoreTransformChange_ ||
            this.rigidAmmo === undefined ||
            this.rigidAmmo === null)
            return;

        var worldTrans = new Ammo.btTransform();
        this.rigidAmmo.getWorldTransform(worldTrans);
        var o = new Ammo.btVector3(position.x, position.y, position.z);
        var r = new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w);
        worldTrans.setOrigin(o);
        worldTrans.setRotation(r);
        this.rigidAmmo.setWorldTransform(worldTrans);
        this.rigidAmmo.updateInertiaTensor();
        this.rigidAmmo.activate(false);
        Ammo.destroy(o);
        Ammo.destroy(r);
        Ammo.destroy(worldTrans);
        worldTrans = null;
    },


    /**
        Registers a callback for physics collision.

        * @example
        * Tundra.scene.onPhysicsCollision(null, function(self, other, position, normal,
        *                                                             distance, impulse, newCollision)
        * {
        *     console.log("on collision: " + self.name);
        * });

        @subscribes
    */
    onPhysicsCollision : function(context, callback)
    {
        return Tundra.events.subscribe("EC_Rigidbody." + this.parentEntity.id + ".PhysicsCollision", context, callback);
    },

    emitPhysicsCollision : function(entity, position, normal, distance, impulse, newCollision)
    {
        if (this.parentEntity === null)
            return;

        Tundra.events.send("EC_Rigidbody." + this.parentEntity.id + ".PhysicsCollision",
                                        this.parentEntity,
                                        entity,
                                        position,
                                        normal,
                                        distance,
                                        impulse,
                                        newCollision);
    }
});

return EC_RigidBody_Ammo;

}); // require js
