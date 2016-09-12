
define(["core/framework/Tundra",
        "lib/three",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute",
        "core/scene/AttributeChange"
    ], function(Tundra, THREE, Scene, IComponent, Attribute, AttributeChange) {

var EC_RigidBody = IComponent.$extend(
/** @lends EC_RigidBody.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {number} mass 0.0
        */
        this.declareAttribute(0, "mass", 0.0, Attribute.Real, "Mass");
        /**
            @ec_attribute {EC_RigidBody.Type} shapeType EC_RigidBody.Type.Box
        */
        this.declareAttribute(1, "shapeType", EC_RigidBody.ShapeType.Box, Attribute.Int, "Shape type");
        /**
            @ec_attribute {THREE.Vector3} size THREE.Vector3(1.0, 1.0, 1.0)
        */
        this.declareAttribute(2, "size", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3, "Size");
        /**
            @ec_attribute {string} collisionMeshRef ""
        */
        this.declareAttribute(3, "collisionMeshRef", "", Attribute.AssetReference, "Collision mesh ref");
        /**
            @ec_attribute {number} friction 0.5
        */
        this.declareAttribute(4, "friction", 0.5, Attribute.Real, "Friction");
        /**
            @ec_attribute {number} restitution 0.0
        */
        this.declareAttribute(5, "restitution", 0.0, Attribute.Real, "Restitution");
        /**
            @ec_attribute {number} linearDamping 0.0
        */
        this.declareAttribute(6, "linearDamping", 0.0, Attribute.Real, "Linear damping");
        /**
            @ec_attribute {number} angularDamping 0.0
        */
        this.declareAttribute(7, "angularDamping", 0.0, Attribute.Real, "Angular damping");
        /**
            @ec_attribute {THREE.Vector3} linearFactor THREE.Vector3(1.0, 1.0, 1.0)
        */
        this.declareAttribute(8, "linearFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3, "Linear factor");
        /**
            @ec_attribute {THREE.Vector3} angularFactor THREE.Vector3(1.0, 1.0, 1.0)
        */
        this.declareAttribute(9, "angularFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3, "Angular factor");
        /**
            @ec_attribute {boolean} kinematic false
        */
        this.declareAttribute(10, "kinematic", false, Attribute.Bool, "Kinematic");
        /**
            @ec_attribute {boolean} phantom false
        */
        this.declareAttribute(11, "phantom", false, Attribute.Bool, "Phantom");
        /**
            @ec_attribute {boolean} drawDebug false
        */
        this.declareAttribute(12, "drawDebug", false, Attribute.Bool, "Draw debug");
        /**
            @ec_attribute {THREE.Vector3} linearVelocity THREE.Vector3(0.0, 0.0, 0.0)
        */
        this.declareAttribute(13, "linearVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3, "Linear velocity");
        /**
            @ec_attribute {THREE.Vector3} angularVelocity THREE.Vector3(0.0, 0.0, 0.0)
        */
        this.declareAttribute(14, "angularVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3, "Angular velocity");
        /**
            @ec_attribute {number} collisionLayer -1
        */
        this.declareAttribute(15, "collisionLayer", -1, Attribute.Int, "Collision layer");
        /**
            @ec_attribute {number} collisionMask -1
        */
        this.declareAttribute(16, "collisionMask", -1, Attribute.Int, "Collision mask");
        /**
            @ec_attribute {number} rollingFriction 0.5
        */
        this.declareAttribute(17, "rollingFriction", 0.5, Attribute.Real);
        /**
            @ec_attribute {boolean} useGravity true
        */
        this.declareAttribute(18, "useGravity", true, Attribute.Bool);
    },

    __classvars__ :
    {
        TypeId : 23,
        TypeName: "RigidBody",

        /**
            @static
            @memberof EC_RigidBody
            @readonly
            @enum {number}
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
            @static
            @memberof EC_RigidBody
            @readonly
            @enum {number}
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
            @static
            @memberof EC_RigidBody
            @readonly
            @default 0.0005 * 0.0005
        */
        ForceThresholdSq : 0.0005 * 0.0005,

        /**
            @static
            @memberof EC_RigidBody
            @readonly
            @default 0.0005 * 0.0005
        */
        ImpulseThresholdSq : 0.0005 * 0.0005,

        /**
            @static
            @memberof EC_RigidBody
            @readonly
            @default 0.0005 * 0.0005
        */
        TorqueThresholdSq : 0.0005 * 0.0005
    }
});

return EC_RigidBody;

}); // require js
