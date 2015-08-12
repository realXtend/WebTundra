
define(["core/framework/TundraSDK",
        "lib/ammo",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/physics/PhysicsWorld"
    ], function(TundraSDK, Ammo, Scene, IComponent, Attribute, PhysicsWorld) {

/**
    This base implementation does not do anything. It declared the static attribute structure of EC_RigidBody
    in the Tundra protocol.

    Physics implementations need to provide this components functionality, preferably by extending this object.

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
        
        this.btCollisionshape_ = null;
        this.btRigidbody = null;
        
        TundraSDK.framework.events.subscribe("IComponent.ParentEntitySet",
                                             this,
                                             this.connectToEntity);
    },
    
    __classvars__: {
        ShapeType: {
            Box:0,
            Sphere:1,
            Cylinder:2,
            Capsule:3,
            TriMesh:4,
            HeightField:5,
            ConvexHull:6,
            Cone:7
        }
    },
    
    connectToEntity: function()
    {
        //TundraSDK.framework.events.subscribe("Scene.AttributeChanged." + this.parentEntity.id.toString() + "." + this.id.toString(), context, callback);
        this.createBody();
    },
    
    updatePosRotFromPlaceable : function()
    {
        
    },
    
    active: function()
    {
        
    },
    
    attributeChanged: function(index, name, value)
    {
        switch(index)
        {
            case 0: // Mass
                break;
            case 1: // ShapeType
                this.createCollisionShape();
                break;
            case 2: // Size
                if (this.isPrimitiveShape())
                    this.createCollisionShape();
                break;    
            case 3: // CollisionMeshRef
                break;
            case 4: // Friction
                break;
            case 5: // LinearDamping
                break;
            case 6: // AngularDamping
                break;
            case 7: // LinearFactor
                break;
            case 8: // AngularFactor
                break;
            case 9: // LinearVelocity
                break;
            case 10: // AngularVelocity
                break;
            case 11: // Kinematic
                break;    
            case 12: // Phantom
                break;
            case 13: // DrawDebug
                break;
            case 14: // CollisionLayer
                break;
            case 15: // CollisionMask
                break;
            case 16: // RollingFriction
                break;
            case 17: // UseGravity
                break;
        }
    },
    
    isPrimitiveShape : function() {
        switch(this.attributes.shapeType.get())
        {
            case EC_RigidBody.ShapeType.TriMesh:
            case EC_RigidBody.ShapeType.HeightField:
            case EC_RigidBody.ShapeType.ConvexHull:
                return false;
                break;
            default:
                return true
        }
    },
    
    createBody : function() {
        
        if (this.parentEntity.placeable === "undefined" ||
            this.parentEntity.placeable === null)
            return;
        
        this.createCollisionShape();
        
        var mass = this.attributes.mass.get();
        var startTransform = new Ammo.btTransform();        
        var pos = this.parentEntity.placeable.position();
        
        var localInertia = new Ammo.btVector3(pos.x, pos.y, pos.z);
        startTransform.setIdentity();
        
        if (mass > 0.0)
            this.btCollisionshape_.calculateLocalInertia(mass, localInertia);
        
        var myMotionState = new Ammo.btDefaultMotionState(startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass,
                                                          myMotionState,
                                                          this.btCollisionshape_,
                                                          localInertia);
        this.btRigidbody = new Ammo.btRigidBody(rbInfo);
        
        TundraSDK.framework.physicsWorld.world.addRigidBody(this.btRigidbody);
    },
    
    removeBody : function() {
        
    },
    
    createCollisionShape : function(){
        
        this.removeCollisionShape();
        
        var shape = this.attributes.shapeType.get();
        var size = this.attributes.size.get();
        
        if (shape === EC_RigidBody.ShapeType.Box)
            this.btCollisionshape_ = new Ammo.btBoxShape(new Ammo.btVector3(size.x, size.y, size.z));
        else if (shape === EC_RigidBody.ShapeType.Sphere)
            this.btCollisionshape_ = new Ammo.btSphereShape(size.x * 0.5);
        else if (shape === EC_RigidBody.ShapeType.Cylinder)
            this.btCollisionshape_ = new Ammo.btCylinderShape(new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5));
        else if (shape === EC_RigidBody.ShapeType.Capsule)
            this.btCollisionshape_ = new Ammo.btCapsuleShape(size.x * 0.5, size.y * 0.5);
        /*else if (shape === EC_RigidBody.ShapeType.TriMesh)
            this.btCollisionshape_ = new Ammo.btBoxShape(btSize);
        else if (shape === EC_RigidBody.ShapeType.HeightField)
            this.btCollisionshape_ = new Ammo.btBoxShape(btSize);
        else if (shape === EC_RigidBody.ShapeType.ConvexHull)
            this.btCollisionshape_ = new Ammo.btBoxShape(btSize);*/
        else if (shape === EC_RigidBody.ShapeType.Cone)
            this.btCollisionshape_ = new Ammo.btConeShape(size.x * 0.5, size.y);;
    },
    
    removeCollisionShape : function() {
        //if (this.btCollisionshape !== null)
        //    Ammo.destroy(this.btCollisionshape);
    }
});

Scene.registerComponent(23, "EC_RigidBody", EC_RigidBody);

return EC_RigidBody;

}); // require js
