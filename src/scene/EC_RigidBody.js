// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeRigidBody = 23;

Tundra.EC_RigidBody = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeRigidBody);
    this.addAttribute(Tundra.cAttributeReal, "mass", "Mass", 0.0);
    this.addAttribute(Tundra.cAttributeInt, "shapeType", "Shape type");
    this.addAttribute(Tundra.cAttributeFloat3, "size", "Size");
    this.addAttribute(Tundra.cAttributeAssetReference, "collisionMeshRef", "Collision mesh ref");
    this.addAttribute(Tundra.cAttributeReal, "friction", "Friction", 0.5);
    this.addAttribute(Tundra.cAttributeReal, "restitution", "Restitution", 0.0);
    this.addAttribute(Tundra.cAttributeReal, "linearDamping", "Linear damping", 0.0);
    this.addAttribute(Tundra.cAttributeReal, "angularDamping", "Angular damping", 0.0);
    this.addAttribute(Tundra.cAttributeFloat3, "linearFactor", "Linear factor");
    this.addAttribute(Tundra.cAttributeFloat3, "angularFactor", "Angular factor");
    this.addAttribute(Tundra.cAttributeBool, "kinematic", "Kinematic", false);
    this.addAttribute(Tundra.cAttributeBool, "phantom", "Phantom", false);
    this.addAttribute(Tundra.cAttributeBool, "drawDebug", "Draw Debug", false);
    this.addAttribute(Tundra.cAttributeFloat3, "linearVelocity", "Linear velocity");
    this.addAttribute(Tundra.cAttributeFloat3, "angularVelocity", "Angular velocity");
    this.addAttribute(Tundra.cAttributeInt, "collisionLayer", "Collision Layer", -1);
    this.addAttribute(Tundra.cAttributeInt, "collisionMask", "Collision Mask", -1);
    this.addAttribute(Tundra.cAttributeReal, "rollingFriction", "Rolling Friction", 0.5);
    this.addAttribute(Tundra.cAttributeBool, "useGravity", "Use gravity", true);
};

Tundra.EC_RigidBody.prototype = new Tundra.Component(Tundra.cComponentTypeRigidBody);

Tundra.registerComponent(Tundra.cComponentTypeRigidBody, "RigidBody", function(){ return new Tundra.EC_RigidBody(); });
