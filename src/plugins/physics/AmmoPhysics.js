define(["lib/classy",
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "core/framework/TundraLogging",
        "core/scene/Scene",
        "plugins/physics/PhysicsWorld_Ammo",
        "plugins/physics/EC_RigidBody_Ammo"
    ], function(Class, Tundra, ITundraPlugin, TundraLogging, Scene, PhysicsWorld_Ammo, EC_RigidBody_Ammo) {
/**
    This plugin provides client side ammo physics.

    @class AmmoPhysics
    @extends ITundraPlugin
    @constructor
*/
var AmmoPhysics = ITundraPlugin.$extend(
{
    __init__ : function(targetScene)
    {
        this.$super("AmmoPhysics");
    },
    
    initialize: function()
    {
        Tundra.physicsWorld = new PhysicsWorld_Ammo();
        Tundra.physicsWorld.postInitialize();
        Scene.registerComponent(23, "EC_RigidBody", EC_RigidBody_Ammo);
    },
    
    uninitialize: function()
    {
        Tundra.physicsWorld.reset();
        Tundra.physicsWorld = null;
    }
});

Tundra.registerPlugin(new AmmoPhysics());
return AmmoPhysics;

}); // require js
