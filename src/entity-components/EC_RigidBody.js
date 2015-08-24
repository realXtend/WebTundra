
define(["core/framework/TundraSDK",
        "lib/ammo",
        "lib/three",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/scene/AttributeChange"
    ], function(TundraSDK, Ammo, THREE, Scene, IComponent, Attribute, AttributeChange) {

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
    }
});

return EC_RigidBody;

}); // require js
