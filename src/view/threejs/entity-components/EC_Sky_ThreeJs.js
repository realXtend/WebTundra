
define([
        "lib/three",
        "core/framework/Tundra",
        "core/scene/AttributeChange",
        "core/math/Transform",
        "entity-components/EC_Sky"
    ], function(THREE, Tundra, AttributeChange, Transform, EC_Sky) {

/**
    Sky component implementation for the three.js render system.

    @class EC_Sky_ThreeJs
    @extends EC_Sky
    @constructor
*/
var EC_Sky_ThreeJs = EC_Sky.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.skyBoxMesh = null;
        this.skyBoxMaterial = null;
        this.skyBoxTexture = null;

        this.directionLight = null;

        this.skyLoaded = false;
        this.skipLoading = false;

        this.texturesRequested = false;
        this.texturesLoaded = false;
        this.textures = [];
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset : function()
    {
        if (this.skyBoxMesh != null)
        {
            if (this.skyBoxMesh.geometry != null)
            {
                this.skyBoxMesh.geometry.dispose();
                this.skyBoxMesh.geometry = null;
            }
            Tundra.renderer.scene.remove(this.skyBoxMesh);
            this.skyBoxMesh = null;
        }
        if (this.directionLight != null)
        {
            Tundra.renderer.scene.remove(this.directionLight);
            this.directionLight = null;
        }
        if (this.skyBoxTexture != null)
        {
            this.skyBoxTexture.dispose();
            this.skyBoxTexture = null;
        }
        if (this.skyBoxMaterial != null)
        {
            for (var i = 0; i < this.skyBoxMaterial.materials.length; i++)
                this.skyBoxMaterial.materials[i].dispose();
            this.skyBoxMaterial.materials = [];
            this.skyBoxMaterial = null;
        }

        this.envLightChecked = false;

        this.skyLoaded = false;
        this.skipLoading = false;

        this.texturesRequested = false;
        this.texturesLoaded = false;
        this.textures = [];

        if (this.frameUpdateSubscription !== undefined)
        {
            Tundra.events.unsubscribe(this.frameUpdateSubscription);
            this.frameUpdateSubscription = undefined;
        }
    },

    setParent : function(entity)
    {
        this.$super(entity);
        this.update();
    },

    checkExistingSky : function()
    {
        if (this.parentEntity == null || this.parentEntity.parentScene == null)
            return false;

        var skyComps = this.parentEntity.parentScene.components("Sky");
        for (var i = 0; i < skyComps.length; i++)
        {
            if (skyComps[i].skyLoaded === true)
                return true;
        }
        skyComps = this.parentEntity.parentScene.components("SkyX");
        for (var i = 0; i < skyComps.length; i++)
        {
            if (skyComps[i].skyLoaded === true)
                return true;
        }
        return false;
    },

    update : function()
    {
        if (this.parentEntity == null || this.parentEntity.parentScene == null)
            return;

        if (this.skyLoaded)
            return;
        if (this.skipLoading)
            return;

        this.skipLoading = this.checkExistingSky();
        if (this.skipLoading)
        {
            console.log("Skipping loading of " + this.typeName + ", scene already has a sky component");
            return;
        }

        // If there is no EnvironmentLight in the scene. Add it.
        if (!this.envLightChecked)
        {
            Tundra.frame.delayedExecute(1.0, this, function() {
                if (this.parentScene == null)
                    return;
                var envLights = this.parentScene.entitiesWithComponent("EnvironmentLight");
                if (envLights.length === 0)
                {
                    var comp = this.parentEntity.createComponent("EnvironmentLight", "EC_Sky Created Light", AttributeChange.LocalOnly);
                    if (comp != null)
                    {
                        comp.brightness = 0.5;
                        comp.sunDirection = new THREE.Vector3(-0.5, -1.0, -0.5);
                    }
                }
            });
            this.envLightChecked = true;
        }

        // Currently we use a hardcoded skybox, request textures
        if (!this.texturesRequested)
        {
            var urlPrefix = "http://meshmoon.data.s3.amazonaws.com/asset-library/skybox/default/rex_sky_";
            var textureRefs =
            [
                urlPrefix + "right.dds",
                urlPrefix + "left.dds",
                urlPrefix + "bot.dds",
                urlPrefix + "top.dds",
                urlPrefix + "front.dds",
                urlPrefix + "back.dds"
            ];

            for (var i=0; i<textureRefs.length; ++i)
            {
                var transfer = Tundra.asset.requestAsset(textureRefs[i]);
                if (transfer != null)
                    transfer.onCompleted(this, this.onSkyTextureLoaded, i);
            }
            this.texturesRequested = true;
        }

        if (!this.texturesLoaded)
            return;

        if (this.frameUpdateSubscription === undefined)
            this.frameUpdateSubscription = Tundra.frame.onPreRender(this, this.onPreRender);

        if (this.skyBoxMaterial == null)
        {
            var threeMaterials = [];
            for (var i = 0; i < this.textures.length; ++i)
            {
                var texture = this.textures[i].texture;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.needsUpdate = true;

                threeMaterials.push(new THREE.MeshBasicMaterial({
                    map  : texture,
                    side : THREE.BackSide,
                    depthWrite : false
                }));
            }

            this.skyBoxMaterial = new THREE.MeshFaceMaterial(threeMaterials);
        }

        if (this.skyBoxMesh == null)
        {
            this.skyBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(2500, 2500, 2500, 1, 1, 1), this.skyBoxMaterial);
            this.skyBoxMesh.scale.set(2,2,2);
            this.skyBoxMesh.renderOrder = -100000;
            this.skyBoxMesh.quaternion.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
            this.skyBoxMesh.name = this.typeName + "-mesh";
            Tundra.renderer.scene.add(this.skyBoxMesh);
        }

        this.skyLoaded = true;

        // Look for water in the scene and update its material as we just added a directional light to the scene. This will modify the appearance a bit.
        var waterComps = this.parentEntity.parentScene.components("WaterPlane");
        for (var i = 0; i < waterComps.length; i++)
        {
            if (waterComps[i].waterLoaded === true && waterComps[i].waterMaterial != null)
                waterComps[i].waterMaterial.needsUpdate = true;
        }
        waterComps = this.parentEntity.parentScene.components("HydraX");
        for (var i = 0; i < waterComps.length; i++)
        {
            if (waterComps[i].waterLoaded === true && waterComps[i].waterMaterial != null)
                waterComps[i].waterMaterial.needsUpdate = true;
        }
    },

    onSkyTextureLoaded : function(asset, index)
    {
        this.textures[index] = asset;

        // Check if all cube textures have now been loaded
        for (var i = 0; i < 6; i++)
            if (this.textures[i] === undefined || this.textures[i] === null)
                return;

        // Textures are here, load the sky.
        this.texturesLoaded = true;
        this.update();
    },

    onPreRender : function()
    {
        if (this.skyBoxMesh != null)
        {
            var cameraEnt = Tundra.renderer.activeCameraEntity();
            var focusPos = (cameraEnt && cameraEnt.placeable ? cameraEnt.placeable.worldPosition() : undefined);
            if (focusPos)
            {
                this.skyBoxMesh.position.x = focusPos.x;
                this.skyBoxMesh.position.y = focusPos.y;
                this.skyBoxMesh.position.z = focusPos.z;

                this.skyBoxMesh.updateMatrixWorld();
            }
        }
    }
});

return EC_Sky_ThreeJs;

}); // require js
