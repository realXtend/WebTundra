// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeRigidBody = 23;

function EC_RigidBody() {
    Component.call(this, cComponentTypeRigidBody);
    this.addAttribute(cAttributeReal, "mass", "Mass", 0.0);
    this.addAttribute(cAttributeInt, "shapeType", "Shape type");
    this.addAttribute(cAttributeFloat3, "size", "Size");
    this.addAttribute(cAttributeAssetReference, "collisionMeshRef", "Collision mesh ref");
    this.addAttribute(cAttributeReal, "friction", "Friction", 0.5);
    this.addAttribute(cAttributeReal, "restitution", "Restitution", 0.0);
    this.addAttribute(cAttributeReal, "linearDamping", "Linear damping", 0.0);
    this.addAttribute(cAttributeReal, "angularDamping", "Angular damping", 0.0);
    this.addAttribute(cAttributeFloat3, "linearFactor", "Linear factor");
    this.addAttribute(cAttributeFloat3, "angularFactor", "Angular factor");
    this.addAttribute(cAttributeBool, "phantom", "Phantom", false);
    this.addAttribute(cAttributeBool, "kinematic", "Kinematic", false);
    this.addAttribute(cAttributeBool, "drawDebug", "Draw Debug", false);
    this.addAttribute(cAttributeFloat3, "linearVelocity", "Linear velocity");
    this.addAttribute(cAttributeFloat3, "angularVelocity", "Angular velocity");
    this.addAttribute(cAttributeInt, "collisionLayer", "Collision Layer", -1);
    this.addAttribute(cAttributeInt, "collisionMask", "Collision Mask", -1);
    this.addAttribute(cAttributeReal, "rollingFriction", "Rolling Friction", 0.5)
    this.addAttribute(cAttributeBool, "useGravity", "Use gravity", true);
}

EC_RigidBody.prototype = new Component(cComponentTypeRigidBody);

registerComponent(cComponentTypeRigidBody, "RigidBody", function(){ return new EC_RigidBody(); });
