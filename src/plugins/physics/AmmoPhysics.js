define(["lib/classy",
        "core/framework/TundraSDK",
        "core/framework/ITundraPlugin",
        "core/framework/TundraLogging",
        "core/scene/Scene",
        "plugins/physics/PhysicsWorld_Ammo",
        "plugins/physics/EC_RigidBody_Ammo"
    ], function(Class, TundraSDK, ITundraPlugin, TundraLogging, Scene, PhysicsWorld_Ammo, EC_RigidBody_Ammo) {
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
        
        this.log = TundraLogging.getLogger("AmmoPhysics");
    },
    
    initialize: function()
    {
        TundraSDK.framework.physicsWorld = new PhysicsWorld_Ammo();
        TundraSDK.framework.physicsWorld.postInitialize();
        Scene.registerComponent(23, "EC_RigidBody", EC_RigidBody_Ammo);
    },
    
    uninitialize: function()
    {
        TundraSDK.framework.physicsWorld.reset();
        TundraSDK.framework.physicsWorld = null;
    }
});

TundraSDK.registerPlugin(new AmmoPhysics());
return AmmoPhysics;

}); // require js
