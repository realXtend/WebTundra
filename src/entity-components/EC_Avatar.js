
define([
        "core/framework/Tundra",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(Tundra, Scene, IComponent, Attribute) {

var EC_Avatar = IComponent.$extend(
/** @lends EC_Avatar.prototype */
{
    /**
        EC_Avatar component

        @constructs
        @private
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.declareAttribute(0, "appearanceRef", "", Attribute.AssetReference);

        this.useAvatarAsset = true;

        var appearanceRef = Tundra.asset.resolveAssetRef("webtundra://media/assets/avatar/jack.avatar");
        this.defaultAppearanceRef = appearanceRef;
        this.avatarAssets = {};
        this.avatarAssets[appearanceRef] =
        {
            mesh : Tundra.asset.resolveAssetRef("webtundra://media/assets/avatar/jack.mesh"),
            skeleton : Tundra.asset.resolveAssetRef("webtundra://media/assets/avatar/jack.skeleton"),
            materials : [ Tundra.asset.resolveAssetRef("webtundra://media/assets/avatar/jack_body.material"), Tundra.asset.resolveAssetRef("webtundra://media/assets/avatar/jack_face.material") ]
        };

        this.resetState();
    },

    __classvars__ :
    {
        TypeId   : 1,
        TypeName : "Avatar",

        MeshComponentName : "EC_Avatar_Generated_Mesh"
    },

    reset : function()
    {
        /// @todo remove EC_Mesh we created?
        this.resetState();
    },

    resetState : function()
    {
        this.currentAppearanceRef = "";

        this.avatarRequested = false;
        this.attachementsRequested = false;

        this.avatarApplied = false;
        this.avatarDescAsset = null;

        if (this.parentEntity != null)
            this.parentEntity.removeComponentByName("Mesh", EC_Avatar.MeshComponentName);
    },

    attributeChanged : function(index, name, value)
    {
        // appearanceRef
        if (index === 0)
            this.update();
    },

    getAvatarData : function()
    {
        return this.avatarAssets[this.attributes.appearanceRef.get()];
    },

    getDefaultAvatarData : function()
    {
        return this.avatarAssets[this.defaultAppearanceRef];
    },

    getAvatarRotation : function()
    {
        var avatarData = this.getAvatarData();
        return (avatarData != null && avatarData.rotation != null ? avatarData.rotation : 0);
    },

    onAvatarDescLoaded : function(avatarDescAsset)
    {
        this.avatarDescAsset = avatarDescAsset.cloneInstance();
        this.update();
    },

    onAvatarAttachementLoaded : function(success, attachement)
    {
        for (var ai = 0; ai < this.avatarDescAsset.attachements.length; ai++)
            if (!this.avatarDescAsset.attachements[ai].isLoaded())
                return;
        this.update();
    },

    update : function()
    {
        var appearanceRef = this.attributes.appearanceRef.get();
        if (appearanceRef === "" || this.currentAppearanceRef === appearanceRef)
            return;
        if (this.currentAppearanceRef !== "" && this.currentAppearanceRef !== appearanceRef)
            this.resetState();
        if (this.avatarApplied)
            return;

        if (this.useAvatarAsset)
        {
            // Request asset description
            if (!this.avatarRequested)
            {
                this.avatarRequested = true;
                var transfer = Tundra.asset.requestAsset(appearanceRef, "RealXtendAvatarDescription");
                if (transfer != null)
                    transfer.onCompleted(this, this.onAvatarDescLoaded);
                return;
            }
            if (this.avatarDescAsset == null)
                return;

            // Request attachements
            if (!this.attachementsRequested)
            {
                this.attachementsRequested = true;
                if (this.avatarDescAsset.attachements.length > 0)
                {
                    for (var ai = 0; ai < this.avatarDescAsset.attachements.length; ai++)
                        this.avatarDescAsset.attachements[ai].requestAssets(this, this.onAvatarAttachementLoaded);
                    return;
                }
            }
        }

        var assets = (this.useAvatarAsset ? this.avatarDescAsset !== undefined && this.avatarDescAsset.assets : this.getAvatarData());
        if (assets == null)
        {
            this.log.warn("Avatar '" + this.attributes.appearanceRef.get() + "' not supported, using default.");
            assets = this.getDefaultAvatarData();
        }

        // Remove old
        this.parentEntity.removeComponentByName("Mesh", EC_Avatar.MeshComponentName);

        // Create
        var mesh = this.parentEntity.createLocalComponent("Mesh", EC_Avatar.MeshComponentName);
        mesh.replicated = false;
        mesh.local = true;
        mesh.temporary = true;

        mesh.meshRef = assets.mesh;
        mesh.skeletonRef = assets.skeleton;
        mesh.materialRefs = assets.materials;
        mesh.castShadows = true;

        // @todo This is a hack. Should be set from the av desc transform/offset!
        var t = mesh.nodeTransformation;
        t.pos.y = -0.86;
        t.rot.y = 0; //(this.avatarDescAsset.rotation != null ? this.avatarDescAsset.rotation : 0);
        mesh.nodeTransformation = t;

        // Inform Mesh about attachements
        // @todo Figure out if we want to pass out instance of attachemrnts or clone them to EC_Mesh
        // This can get tricky if the state is shared but for passing a ref should be fine.
        if (this.avatarDescAsset != null && this.avatarDescAsset.attachements.length > 0)
            mesh.setAttachements(this.avatarDescAsset.attachements);

        // Mark done, no exceptions
        this.avatarApplied = true;
        this.currentAppearanceRef = appearanceRef;

        // Update mesh manually
        mesh.update();
    }
});

Scene.registerComponent(EC_Avatar);

return EC_Avatar;

}); // require js
