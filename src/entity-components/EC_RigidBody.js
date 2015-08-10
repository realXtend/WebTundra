
define(["core/framework/TundraSDK",
        "lib/ammo",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(TundraSDK, Ammo, Scene, IComponent, Attribute) {

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
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "mass", 0.0, Attribute.Real);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "shapeType", 0 /*Add box*/, Attribute.Int);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "size", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            @property meshRef (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "collisionMeshRef", "", Attribute.AssetReference);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "friction", 0.5, Attribute.Real);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(5, "linearDamping", 0.0, Attribute.Real);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(6, "angularDamping", 0.0, Attribute.Real);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(7, "linearFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(8, "angularFactor", new THREE.Vector3(1.0, 1.0, 1.0), Attribute.Float3);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(9, "linearVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(10, "angularVelocity", new THREE.Vector3(0.0, 0.0, 0.0), Attribute.Float3);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(11, "kinematic", false, Attribute.Bool);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(12, "phantom", false, Attribute.Bool);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(13, "drawDebug", false, Attribute.Bool);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(14, "collisionLayer", -1, Attribute.Int);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(15, "collisionMask", -1, Attribute.Int);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(16, "rollingFriction", 0.5, Attribute.Real);
        /**
            @property range (attribute)
            @type Attribute
        */
        this.declareAttribute(17, "useGravity", true, Attribute.Bool);
    },
    
    update : function()
    {
    },
    
    attributeChanged: function(index, name, value)
    {
        switch(index)
        {
            case 0: // Mass
                break;
        }
    },
            
    setMass: function(mass)
    {
        
    }
});

Scene.registerComponent(23, "EC_RigidBody", EC_RigidBody);

return EC_RigidBody;

}); // require js
