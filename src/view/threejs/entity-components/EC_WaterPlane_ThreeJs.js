
define([
        "lib/three",
        "lib/three/DDSLoader",
        "core/framework/Tundra",
        "core/math/Transform",
        "entity-components/EC_WaterPlane",
    ], function(THREE, DDSLoader, Tundra, Transform, EC_WaterPlane) {

var EC_WaterPlane_ThreeJs = EC_WaterPlane.$extend(
/** @lends EC_WaterPlane_ThreeJs.prototype */
{
    /**
        WaterPlane component implementation for the three.js render system.

        @ec_implements EC_WaterPlane
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.waterMesh = null;
        this.waterMaterial = null;

        this.waterLoaded = false;
        this.skipLoading = false;

        this.forwardMovement = true;
        this.forwardPosition = true;
    },

    reset : function()
    {
        EC_WaterPlane_ThreeJs.resetWater(this);
    },

    update : function()
    {
        EC_WaterPlane_ThreeJs.updateWater(this);
    },

    attributeChanged : function(index, name, value)
    {
        // position
        if (index === 3)
            EC_WaterPlane_ThreeJs.updateWaterPosition(this);
    },

    __classvars__ :
    {
        implementationName : "three.js",

        uniforms :
        {
            "map"           : { type: "t", value: null },
            "normalMap"     : { type: "t", value: null },
            "normalScale"   : { type: "v2", value: new THREE.Vector2( 1, 1 ) },
            "normalMapPos"  : { type: "f", value: 0.0 },

            "ambientLightColor" : { type: "fv", value: [] },

            "directionalLights" : { value: [] },
            "spotLights" : { value: [] },
            "pointLights" : { value: [] },
            "hemisphereLights" : { value: [] },

            "directionalShadowMap" : { value: [] },
            "directionalShadowMatrix" : { value: [] },
            "spotShadowMap" : { value: [] },
            "spotShadowMatrix" : { value: [] },
            "pointShadowMap" : { value: [] },
            "pointShadowMatrix" : { value: [] },

            "directionalLightDirection" : { type: "fv", value: [] },
            "directionalLightColor" : { type: "fv", value: [] },

            "hemisphereLightDirection" : { type: "fv", value: [] },
            "hemisphereLightSkyColor" : { type: "fv", value: [] },
            "hemisphereLightGroundColor" : { type: "fv", value: [] },

            "pointLightColor" : { type: "fv", value: [] },
            "pointLightPosition" : { type: "fv", value: [] },
            "pointLightDistance" : { type: "fv1", value: [] },

            "spotLightColor" : { type: "fv", value: [] },
            "spotLightPosition" : { type: "fv", value: [] },
            "spotLightDirection" : { type: "fv", value: [] },
            "spotLightDistance" : { type: "fv1", value: [] },
            "spotLightAngleCos" : { type: "fv1", value: [] },
            "spotLightExponent" : { type: "fv1", value: [] }
        },

        vertexShader :
        [
            "attribute vec4 tangent;",

            "varying vec2 vUv;",
            "varying vec3 vWorldPosition;",
            "varying vec3 vLightDirection;",

            "#if NUM_DIR_LIGHTS > 0",
                "uniform vec3 directionalLightDirection[ NUM_DIR_LIGHTS ];",
            "#endif",

            "void main() {",
                "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
                "vWorldPosition = worldPosition.xyz;",
                "#if NUM_DIR_LIGHTS > 0",
                    "vec3 biNormal = cross( normal.xyz, tangent.xyz );",
                    "vec4 lDirection = viewMatrix * vec4( directionalLightDirection[0], 0.0 );",
                    "lDirection.x = max(dot( lDirection.xyz, tangent.xyz ), 0.01);",
                    "lDirection.y = max(dot( lDirection.xyz, biNormal.xyz ), 0.01);",
                    "lDirection.z = max(dot( lDirection.xyz, normal.xyz ), 0.01);",
                    "vLightDirection = normalize( lDirection.xyz );",
                "#endif",
                "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                "vUv = uv;",
            "}"
        ],

        fragmentShader : [
            "uniform sampler2D map;",
            "uniform sampler2D normalMap;",
            "uniform float normalMapPos;",

            "varying vec2 vUv;",
            "varying vec3 vWorldPosition;",
            "varying vec3 vLightDirection;",

            "void main() {",
                "#if NUM_DIR_LIGHTS > 0",
                    //"vec4 normalValue = texture2D( normalMap, (vUv + (vUv * -normalMapPos) + vec2(normalMapPos / 8.0, normalMapPos / 8.0)) * 128.0);",
                    "vec4 normalValue = texture2D( normalMap, (vUv + vec2(-normalMapPos * 0.3, normalMapPos * 0.2)) * 128.0);",
                    "normalValue = normalValue * 1.2;",
                    "gl_FragColor = texture2D( map, (vUv + vec2(-normalMapPos * 0.4, -normalMapPos * 0.2)) * 48.0 ) * dot( normalValue.xyz, vLightDirection );",
                "#else",
                    "gl_FragColor = texture2D( map, vUv * 48.0 );",
                "#endif",
            "}"
        ],

        waterNodeScale    : new THREE.Vector3(1,1,1),
        waterNodeRotation : new THREE.Vector3(-90,0,0),

        resetWater : function(waterComponent)
        {
            if (waterComponent.waterMesh != null)
            {
                if (waterComponent.waterMesh.geometry != null)
                {
                    waterComponent.waterMesh.geometry.dispose();
                    waterComponent.waterMesh.geometry = null;
                }
                Tundra.renderer.scene.remove(waterComponent.waterMesh);
                waterComponent.waterMesh = null;
            }
            if (waterComponent.directionLight != null)
            {
                Tundra.renderer.scene.remove(waterComponent.directionLight);
                waterComponent.directionLight = null;
            }
            if (waterComponent.skyBoxTexture != null)
            {
                waterComponent.skyBoxTexture.dispose();
                waterComponent.skyBoxTexture = null;
            }
            if (waterComponent.waterMaterial != null)
            {
                if (waterComponent.waterMaterial.uniforms['map'].value != null)
                {
                    waterComponent.waterMaterial.uniforms['map'].value.dispose();
                    waterComponent.waterMaterial.uniforms['map'].value = null;
                }
                if (waterComponent.waterMaterial.uniforms['normalMap'].value != null)
                {
                    waterComponent.waterMaterial.uniforms['normalMap'].value.dispose();
                    waterComponent.waterMaterial.uniforms['normalMap'].value = null;
                }

                waterComponent.waterMaterial.dispose();
                waterComponent.waterMaterial = null;
            }

            waterComponent.waterLoaded = false;
            waterComponent.skipLoading = false;
        },

        updateWater : function(waterComponent)
        {
            if (waterComponent.parentEntity == null || waterComponent.parentEntity.parentScene == null)
                return;

            if (waterComponent.waterLoaded)
                return;
            if (waterComponent.skipLoading)
                return;

            waterComponent.skipLoading = EC_WaterPlane_ThreeJs.checkExistingWater(waterComponent);
            if (waterComponent.skipLoading)
            {
                Tundra.client.logWarning("Skipping loading of " + waterComponent.typeName + ", scene already has a loaded water component.", true);
                return;
            }

            if (waterComponent.waterMaterial == null)
            {
                var loader = new THREE.DDSLoader();
                loader.crossOrigin = "anonymous";

                var shader =
                {
                    uniforms        : EC_WaterPlane_ThreeJs.uniforms,
                    vertexShader    : EC_WaterPlane_ThreeJs.vertexShader.join("\n"),
                    fragmentShader  : EC_WaterPlane_ThreeJs.fragmentShader.join("\n")
                };

                var ref = Tundra.asset.resolveAssetRef("webtundra://media/assets/waterplane/waterplane-diffuse-1.dds");
                var diffuse = loader.load(ref, function(texture)
                {
                    if (texture.mipmaps != null && texture.mipmaps.length > 1)
                        texture.minFilter = THREE.NearestMipMapNearestFilter;
                    texture.anisotropy = 4;
                });

                diffuse.magFilter = THREE.LinearFilter;
                diffuse.minFilter = THREE.LinearFilter;
                diffuse.wrapT = THREE.RepeatWrapping;
                diffuse.wrapS = THREE.MirroredRepeatWrapping;

                ref = Tundra.asset.resolveAssetRef("webtundra://media/assets/waterplane/waterplane-normal-1.dds");
                var normal = loader.load(ref, function(texture)
                {
                    if (texture.mipmaps != null && texture.mipmaps.length > 1)
                        texture.minFilter = THREE.NearestMipMapNearestFilter;
                    texture.anisotropy = 4;
                });

                normal.magFilter = THREE.LinearFilter;
                normal.minFilter = THREE.LinearFilter;
                normal.wrapT = THREE.RepeatWrapping;
                normal.wrapS = THREE.RepeatWrapping;

                var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
                uniforms['map'].value = diffuse
                uniforms['normalMap'].value = normal;

                waterComponent.waterMaterial = new THREE.ShaderMaterial({
                    fragmentShader  : shader.fragmentShader,
                    vertexShader    : shader.vertexShader,
                    uniforms        : uniforms
                });
                waterComponent.waterMaterial.lights = true;
            }

            if (waterComponent.waterMesh == null)
            {
                var size = { x : 2000, y : 2000 };
                if (waterComponent.typeName === "EC_WaterPlane")
                {
                    size.x = waterComponent.attributes.xSize.get();
                    size.y = waterComponent.attributes.ySize.get();
                }

                /// @todo Support on the fly size changes. Also rethink this max 2000 size thing, we dont want to stretch the plane too much but we want to allow smaller sizes.
                waterComponent.waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2000, size.x), Math.min(2000, size.y)), waterComponent.waterMaterial);
                waterComponent.waterMesh.name = waterComponent.typeName + "-mesh";
                waterComponent.waterMesh.geometry.computeTangents();

                EC_WaterPlane_ThreeJs.updateWaterPosition(waterComponent);
                Tundra.client.renderer.scene.add(waterComponent.waterMesh);
            }

            waterComponent.waterLoaded = true;

            // Utilize a generic purpouse update by setting the context as the component implementation.
            Tundra.frame.onUpdate(waterComponent, EC_WaterPlane_ThreeJs.onUpdate);
        },

        updateWaterPosition : function(waterComponent)
        {
            if (waterComponent.waterMesh == null)
                return;

            var pos = new THREE.Vector3(0,0,0);
            if (waterComponent.typeName === "EC_MeshmoonWater")
                pos.y = waterComponent.seaLevel;
            else
                pos.copy(waterComponent.position);

            Tundra.renderer.updateSceneNode(waterComponent.waterMesh,
                new Transform(pos, EC_WaterPlane_ThreeJs.waterNodeRotation, EC_WaterPlane_ThreeJs.waterNodeScale));
            waterComponent.waterMesh.matrixAutoUpdate = true;
            waterComponent.forwardPosition = true;
        },

        onUpdate : function(frametime)
        {
            if (this.waterMaterial == null || this.waterMesh == null)
                return;

            // Normal texture movement
            var value = this.waterMaterial.uniforms['normalMapPos'].value;
            if (this.forwardMovement)
                value += frametime / 7000.0;
            else
                value -= frametime / 7000.0;

            if (value > 0.05)
                this.forwardMovement = false;
            else if (value <= 0.0)
                this.forwardMovement = true;
            this.waterMaterial.uniforms['normalMapPos'].value = value;

            // Position
            if (this.forwardPosition)
                this.waterMesh.position.y += frametime / 80.0;
            else
                this.waterMesh.position.y -= frametime / 80.0;

            var seaLevel = (this.typeName === "EC_MeshmoonWater" ? this.seaLevel : this.attributes.position.get().y)

            if (this.waterMesh.position.y > seaLevel + 0.1)
                this.forwardPosition = false;
            else if (this.waterMesh.position.y <= seaLevel)
                this.forwardPosition = true;
        },

        checkExistingWater : function(waterComponent)
        {
            if (waterComponent.parentEntity == null || waterComponent.parentEntity.parentScene == null)
                return false;

            var waterComps = waterComponent.parentEntity.parentScene.components("EC_WaterPlane");
            for (var i = 0; i < waterComps.length; i++)
            {
                if (waterComps[i].waterLoaded === true)
                    return true;
            }
            waterComps = waterComponent.parentEntity.parentScene.components("EC_HydraX");
            for (var i = 0; i < waterComps.length; i++)
            {
                if (waterComps[i].waterLoaded === true)
                    return true;
            }
            return false;
        }
    }
});

return EC_WaterPlane_ThreeJs;

}); // require js
