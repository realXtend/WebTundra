
define([
        "lib/classy",
        "lib/three",
        "core/framework/Tundra",
        "core/framework/CoreStringUtils",
        "core/asset/IAsset",
        "plugins/ogre-plugin/asset/TextureAsset",
        "plugins/ogre-plugin/ogre/OgreMaterial"
    ], function(Class, THREE, Tundra, CoreStringUtils, IAsset, TextureAsset, OgreMaterial) {

/**
    Represents a Ogre rendering engine material asset. This asset is processed and Three.js rendering engine material is generated. Also handled requesting found depedency textures from AssetAPI.
    @class OgreMaterialAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var OgreMaterialAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "OgreMaterialAsset");

        /**
            Instance of Three.Material (to be exact one of its implementations) or null if not loaded.
            @property material
            @type null|Three.Material
        */
        this.material = null;
        /**
            Ogre material
            @property ogreMaterial
            @type null|OgreMaterial
        */
        this.ogreMaterial = null;
        // No doc.
        this.textureRequests = [];
    },

    __classvars__ :
    {
        DebugMaterial : new THREE.MeshBasicMaterial({ color : new THREE.Color().setRGB(0.2,0.2,0.2) }),

        sceneBlendFactorFromString : function(str)
        {
            if (str === "one")
                return THREE.OneFactor;
            else if (str === "zero")
                return THREE.ZeroFactor;
            else if (str === "dest_colour")
                return THREE.DstColorFactor;
            else if (str === "src_colour")
                return THREE.SrcColorFactor;
            else if (str === "one_minus_dest_colour")
                return THREE.OneMinusDstColorFactor;
            else if (str === "one_minus_src_colour")
                return THREE.OneMinusSrcColorFactor;
            else if (str === "dest_alpha")
                return THREE.DstAlphaFactor;
            else if (str === "src_alpha")
                return THREE.SrcAlphaFactor;
            else if (str === "one_minus_dest_alpha")
                return THREE.OneMinusDstAlphaFactor;
            else if (str === "one_minus_src_alpha")
                return THREE.OneMinusSrcAlphaFactor;
            return undefined;
        },

        ignoreTextureUnit : function(textureType)
        {
            OgreMaterial.ignoreTextureUnit(textureType);
        }
    },

    isLoaded : function()
    {
        return (this.material !== null && this.numPendingDependencies() === 0);
    },

    _unloadTexture : function(threeTexture)
    {
        if (threeTexture == null)
            return;

        var uuid = threeTexture.uuid;
        var textureReferenced = false;
        var meshes = Tundra.renderer.getAllMeshes();
        for (var mi=0, mlen=meshes.length; mi<mlen; mi++)
        {
            var material = meshes[mi].material;
            if (meshes[mi].material == null)
                continue;

            if (material instanceof THREE.ShaderMaterial)
            {
                if (material.uniforms != null)
                {
                    if (material.uniforms["map1"] != null && material.uniforms["map1"].value != null && material.uniforms["map1"].value.uuid === uuid)
                        textureReferenced = true;
                    else if (material.uniforms["map2"] != null && material.uniforms["map2"].value != null && material.uniforms["map2"].value.uuid === uuid)
                        textureReferenced = true;
                    else if (material.uniforms["tCube"] != null && material.uniforms["tCube"].value != null && material.uniforms["tCube"].value.uuid === uuid)
                        textureReferenced = true;
                    else if (material.uniforms["map"] != null && material.uniforms["map"].value != null && material.uniforms["map"].value.uuid === uuid)
                        textureReferenced = true;
                    else if (material.uniforms["normalMap"] != null && material.uniforms["normalMap"].value != null && material.uniforms["normalMap"].value.uuid === uuid)
                        textureReferenced = true;
                }
            }
            else if (material instanceof THREE.Material)
            {
                if (material.map != null && material.map.uuid === uuid)
                    textureReferenced = true;
                else if (material.lightMap != null && material.lightMap.uuid === uuid)
                    textureReferenced = true;
                else if (material.specularMap != null && material.specularMap.uuid === uuid)
                    textureReferenced = true;
                else if (material.normalMap != null && material.normalMap.uuid === uuid)
                    textureReferenced = true;
                else if (material.envMap != null && material.envMap.uuid === uuid)
                    textureReferenced = true;
            }

            if (textureReferenced)
                break;
        }
        if (!textureReferenced)
            threeTexture.dispose();
    },

    isMaterialInUse : function(material)
    {
        if (material.uuid === undefined)
            return false;

        /// @todo This is probaly very slow. Figure out a faster way to do this.
        /// We could do internal bookkeeping on how many with this UUID have been created.
        var used = false;
        Tundra.renderer.scene.traverse(function(node) {
            // We are only interested in things that are using a material.
            if (used === true || node == null || node.material == null)
                return;

            if (node.material.uuid === material.uuid)
                used = true;
        });
        return used;
    },

    unload : function()
    {
        if (this.material == null)
            return;
        if (this.isMaterialInUse(this.material))
            return;

        if (this.logging) console.log("OgreMaterialAsset unload", this.name);

        if (this.material instanceof THREE.ShaderMaterial)
        {
            if (this.material.uniforms != null)
            {
                if (this.material.uniforms["map1"] != null && this.material.uniforms["map1"].value != null)
                {
                    if (this.logging) console.log("  uniform map1");
                    this._unloadTexture(this.material.uniforms["map1"].value);
                    this.material.uniforms["map1"].value = null;
                }
                if (this.material.uniforms["map2"] != null && this.material.uniforms["map2"].value != null)
                {
                    if (this.logging) console.log("  uniform map2");
                    this._unloadTexture(this.material.uniforms["map2"].value);
                    this.material.uniforms["map2"].value = null;
                }
                if (this.material.uniforms["tCube"] != null && this.material.uniforms["tCube"].value != null)
                {
                    if (this.logging) console.log("  uniform tCube");
                    this._unloadTexture(this.material.uniforms["tCube"].value);
                    this.material.uniforms["tCube"].value = null;
                }
                if (this.material.uniforms["map"] != null && this.material.uniforms["map"].value != null)
                {
                    if (this.logging) console.log("  uniform map");
                    this._unloadTexture(this.material.uniforms["map"].value);
                    this.material.uniforms["map"].value = null;
                }
                if (this.material.uniforms["normalMap"] != null && this.material.uniforms["normalMap"].value != null)
                {
                    if (this.logging) console.log("  uniform normalMap");
                    this._unloadTexture(this.material.uniforms["normalMap"].value);
                    this.material.uniforms["normalMap"].value = null;
                }
            }
        }
        else if (this.material instanceof THREE.Material)
        {
            if (this.material.map != null)
            {
                if (this.logging) console.log("  map");
                this._unloadTexture(this.material.map);
                this.material.map = null;
            }
            if (this.material.lightMap != null)
            {
                if (this.logging) console.log("  lightMap");
                this._unloadTexture(this.material.lightMap);
                this.material.lightMap = null;
            }
            if (this.material.specularMap != null)
            {
                if (this.logging) console.log("  specularMap");
                this._unloadTexture(this.material.specularMap);
                this.material.specularMap = null;
            }
            if (this.material.normalMap != null)
            {
                if (this.logging) console.log("  normalMap");
                this._unloadTexture(this.material.normalMap);
                this.material.normalMap = null;
            }
            if (this.material.envMap != null)
            {
                if (this.logging) console.log("  envMap");
                this._unloadTexture(this.material.envMap);
                this.material.envMap = null;
            }
        }

        this.material.dispose();
        if (this.material != null)
            this.log.error("Material non null after release");
    },

    _onMaterialDisposed : function()
    {
        if (this.material == null)
        {
            //this.log.error("Already disposed", this.name);
            return;
        }

        var numReseted = 0;
        var meshes = Tundra.renderer.getAllMeshes();
        for (var mi=0, mlen=meshes.length; mi<mlen; mi++)
        {
            if (meshes[mi].material != null && meshes[mi].material.uuid === this.material.uuid)
            {
                //this.log.warn("Material referenced", this.name);
                meshes[mi].material = Tundra.renderer.materialWhite;
                meshes[mi].material.needsUpdate = true;
                numReseted++;
            }
        }
        //console.log("Disposed", this.material.name, "Reseted", numReseted);

        this.material._listeners = [];
        this.material = null;
    },

    textureRefs : function()
    {
        var refs = [];
        if (this.material == null)
            return refs;

        if (this.material.map != null)
            refs.push(this.material.map.name);
        if (this.material.lightMap != null)
            refs.push(this.material.lightMap.name);
        if (this.material.specularMap != null)
            refs.push(this.material.specularMap.name);
        if (this.material.normalMap != null)
            refs.push(this.material.normalMap.name);
        if (this.material.envMap != null)
            refs.push(this.material.envMap.name);
        return refs;
    },

    deserializeFromData : function(data, dataType, transfer)
    {
        this.ogreMaterial = new OgreMaterial(this.name, data, this.logging);

        if (this.logging) console.log ("Converting to THREE.Material");

        // Lighting and depth write enabled for phong
        if (this.ogreMaterial.lighting && this.ogreMaterial.depthWrite !== false)
        {
            if (this.logging) console.log ("  -- THREE.MeshPhongMaterial");
            this.material = new THREE.MeshPhongMaterial();
        }
        else
        {
            if (this.logging) console.log ("  -- THREE.MeshBasicMaterial [lighting off]");
            this.material = new THREE.MeshBasicMaterial();
        }

        var fogOverride = this.ogreMaterial.attributes["fog_override"];
        if (Array.isArray(fogOverride) && fogOverride.length > 0)
        {
            if (fogOverride.length === 1)
            {
                var flag = (typeof fogOverride[0] === "string" ? fogOverride[0].toLowerCase() : fogOverride[0]);
                if (flag === "true")
                    this.material.fog = false;
                else if (flag === "false")
                    this.material.fog = true;
                else
                    this.log.warn("Unsupported fog_override:", flag, ". Supported 'fog_override {true|false}', will turn off/on fog for this material.");
            }
            else
                this.log.warn("Unsupported fog_override:", fogOverride, ". Supported 'fog_override {true|false}', will turn off/on fog for this material.");
        }
        else
            this.material.fog = true;

        this.material.name = this.name;
        this.material.hasTundraShadowShader = this.ogreMaterial.shaders.hasShadowShaders();

        this.material.ambient = this.ogreMaterial.ambient.toThreeColor();
        this.material.color = this.material.diffuse = this.ogreMaterial.diffuse.toThreeColor();
        this.material.specular = this.ogreMaterial.specular.toThreeColor();
        this.material.emissive = this.ogreMaterial.emissive.toThreeColor();
        this.material.opacity = this.ogreMaterial.opacity;

        // Ogre 1 1 1 emissive is closer to three.js 0.5 0.5 0.5
        OgreMaterial.clampColor(OgreMaterial.Color.Emissive, this.material.emissive, 0.5, this.logging);

        if (!this.ogreMaterial.shaders.fragment.isValid() && this.material instanceof THREE.MeshPhongMaterial &&
                  this.ogreMaterial.numTextures() <= 1)
        {
            OgreMaterial.clampColor(OgreMaterial.Color.Specular, this.material.specular, 0.1, this.logging);
        }

        if (this.ogreMaterial.depthWrite === false)
        {
            this.material.transparent = true;
            this.material.depthWrite = false;
            this.material.color.setRGB(1,1,1);
            this.material.diffuse.setRGB(1,1,1);
        }

        // Shininess
        var specularPower = this.ogreMaterial.shaders.fragment.namedParameter("specularPower", "float4");
        if (specularPower !== undefined && specularPower.value.length > 0)
        {
            var candidate = parseFloat(specularPower.value[0]);
            if (!isNaN(candidate))
            {
                this.material.shininess = candidate;
                if (this.logging) console.log ("  -- specularPower -> shininess", this.material.shininess);
            }
        }

        var maxShininess = 30;
        if (typeof this.material.shininess === "number" && this.material.shininess > maxShininess)
            this.material.shininess = maxShininess;

        // Scene blend op
        var sceneBlendOp = this.ogreMaterial.attributes["scene_blend_op"];
        if (typeof sceneBlendOp === "string" && sceneBlendOp !== "" && sceneBlendOp !== "add")
        {
            if (sceneBlendOp == "subtract")
            {
                this.material.blending = THREE.CustomBlending;
                this.material.blendEquation = THREE.SubtractEquation;
            }
            else if (sceneBlendOp == "reverse_subtract")
            {
                this.material.blending = THREE.CustomBlending;
                this.material.blendEquation = THREE.ReverseSubtractEquation;
            }
            else
                this.log.warn("Unsupported scene_blend_op '" + sceneBlendOp + "'");
        }

        // Color op
        /* colour_op_ex <operation> <source1> <source2> [<manual_factor>] [<manual_colour1>] [<manual_colour2>]
           We are reading this as r g b as the last 3 number elements, its not exactly per spec
           but seems how our artists are using it, and it does look like its producing the same
           color as in the native client. See http://www.ogre3d.org/docs/manual/manual_17.html#colour_005fop_005fex */
        var colorOpParts = this.ogreMaterial.attributes["colour_op_ex"];
        if (Array.isArray(colorOpParts) && colorOpParts.length >= 6)
        {
            this.material.color.r = Math.min(parseFloat(colorOpParts[3]), 1.0);
            this.material.color.g = Math.min(parseFloat(colorOpParts[4]), 1.0);
            this.material.color.b = Math.min(parseFloat(colorOpParts[5]), 1.0);
            this.material.diffuse = this.material.color;
        }

        // Alpha rejection
        var alphaRejectParts = this.ogreMaterial.attributes["alpha_rejection"];
        if (Array.isArray(alphaRejectParts) && alphaRejectParts.length >= 2)
        {
            var alphaRejectFunction = alphaRejectParts[0].toLowerCase();
            if (alphaRejectFunction === "greater_equal" || alphaRejectFunction === "greater")
            {
                var alphaRejectValue = parseInt(alphaRejectParts[1]);
                if (alphaRejectValue != null && alphaRejectValue > 0)
                {
                    if (alphaRejectValue > 255)
                        alphaRejectValue = 255;
                    this.material.alphaTest = (alphaRejectValue / 255.0);
                    if (this.logging) console.log("  -- alpha_rejection -> alphaTest", this.material.alphaTest);
                }
            }
            else if (alphaRejectFunction === "always_fail")
            {
                this.material.opacity = 0;
            }
            else if (alphaRejectFunction !== "always_pass")
                this.log.warn("Unsupported alpha_rejection function '" + alphaRejectFunction + "' Supported: 'always_fail', greater_equal' and 'greater'");
        }

        // Scene blend
        var sceneBlend = this.ogreMaterial.attributes["scene_blend"];
        if (typeof sceneBlend === "string" && sceneBlend !== "")
        {
            this.material.blending = THREE.CustomBlending;
            if (sceneBlend.indexOf(" ") === -1)
            {
                if (sceneBlend == "add")
                    this.material.blending = THREE.AdditiveBlending;
                else if (sceneBlend == "modulate")
                    this.material.blending = THREE.MultiplyBlending;
                else if (sceneBlend == "colour_blend")
                {
                    this.material.blendSrc = THREE.OneFactor;
                    this.material.blendDst = THREE.OneMinusSrcColorFactor;
                }
                else if (sceneBlend == "alpha_blend")
                {
                    this.material.blendSrc = THREE.SrcAlphaFactor;
                    this.material.blendDst = THREE.OneMinusSrcAlphaFactor;
                }
                else
                {
                    this.log.warn("Unsupported scene_blend '" + sceneBlend + "'");
                    this.material.blending = THREE.NormalBlending;
                }
            }
            else
            {
                var sceneBlendParts = sceneBlend.split(" ");
                var blendEnumSrc = OgreMaterialAsset.sceneBlendFactorFromString(sceneBlendParts[0]);
                var blendEnumDest = OgreMaterialAsset.sceneBlendFactorFromString(sceneBlendParts[1]);
                if (blendEnumSrc !== undefined && blendEnumDest !== undefined)
                {
                    this.material.blendSrc = blendEnumSrc;
                    this.material.blendDst = blendEnumDest;
                }
                else
                {
                    this.log.warn("Unsupported parts in scene_blend '" + sceneBlend + "'");
                    this.material.blending = THREE.NormalBlending;
                }
            }
        }

        for (var i=0, num=this.ogreMaterial.numTextures(); i<num; ++i)
        {
            var textureUnit = this.ogreMaterial.textureUnits[i];
            if (textureUnit.texture === "")
            {
                if (this.logging) console.warn("  -- Ignoring texture_unit " + i + ": Does not have a texture.");
                continue;
            }

            // Texture scale to repeat
            // Note: This intentionally modified the THREE.Vector2 in the texture unit
            var scale  = (this.logging ? textureUnit.scale.clone() : undefined);
            if (textureUnit.scale.x !== 1 || textureUnit.scale.y !== 1)
            {
                textureUnit.scale.x = 1.0 / textureUnit.scale.x;
                textureUnit.scale.y = 1.0 / textureUnit.scale.y;
                if (this.logging) console.log("  -- scale", scale.x, scale.y, "-> repeat", textureUnit.scale.x, textureUnit.scale.y);
            }

            // Relative reference. Make full url with parent material ref url base.
            if (!CoreStringUtils.startsWith(textureUnit.texture, "http", true))
                textureUnit.textureRef = this.baseRef + textureUnit.texture;

            // Request the dependency
            var transfer = Tundra.asset.requestDependencyAsset(this, textureUnit.textureRef, "Texture");
            if (transfer != null)
            {
                transfer.onCompleted(this, this._textureLoaded, textureUnit);
                transfer.onFailed(this, this._textureFailed);
                this.textureRequests.push(textureUnit);
            }
        }

        if (this.numPendingDependencies() > 0 && this.logging)
            console.log("  -- Waiting for", this.numPendingDependencies(), "dependency textures");
        if (this.logging) console.log("");

        this.material.addEventListener("dispose", this._onMaterialDisposed.bind(this));
    },

    /// IAsset override
    numPendingDependencies : function()
    {
        return this.textureRequests.length;
    },

    /// IAsset override
    pendingDependencies : function()
    {
        var pendingRefs = [];
        for (var tri=0; tri<this.textureRequests.length; ++tri)
            pendingRefs.push(this.textureRequests[tri].textureRef);
        return pendingRefs;
    },

    _removeTextureDependency : function(textureRef, index)
    {
        for (var tri=0; tri<this.textureRequests.length; ++tri)
        {
            if (this.textureRequests[tri].textureRef === textureRef &&
                this.textureRequests[tri].index === index)
            {
                this.textureRequests.splice(tri, 1);
                tri--;
            }
        }
    },

    _textureLoaded : function(asset, textureUnit)
    {
        if (this.material === null)
            return;

        if (asset === undefined && asset === null)
        {
            this.log.error("Texture 'completed' but asset is not valid:", asset);
            this._emitDependencyFailed(textureUnit.textureRef);
            this.unload();
            return;
        }

        var textureInstance = asset.getOrCreateInstance(textureUnit);

        // material.map               TextureAsset.DIFFUSE    UV 0
        // material.specularMap       TextureAsset.SPECULAR   UV 0
        // material.normalMap         TextureAsset.NORMAL     UV 0
        // material.lightMap          TextureAsset.LIGHT      UV 1

        if (textureUnit.type === TextureAsset.DIFFUSE)
            this.material.map = textureInstance;
        else if (textureUnit.type === TextureAsset.SPECULAR)
        {
            if (this.material.specularMap !== undefined)
                this.material.specularMap = textureInstance;
            else if (this.logging)
                this.log.warn("Cannot set specular map to this type of material", this.material);
        }
        else if (textureUnit.type === TextureAsset.LIGHT)
        {
            if (this.material.lightMap !== undefined)
                this.material.lightMap = textureInstance;
            else if (this.logging)
                this.log.warn("Cannot set light map to this type of material", this.material);
        }
        else if (textureUnit.type === TextureAsset.NORMAL)
        {
            if (this.material.normalMap !== undefined)
                this.material.normalMap = textureInstance;
            else if (this.logging)
                this.log.warn("Cannot set normal map to this type of material", this.material);
        }
        else if (textureUnit.type === TextureAsset.REFLECTION)
        {
            if (this.material.envMap !== undefined)
                this.material.envMap = textureInstance;
            else if (this.logging)
                this.log.warn("Cannot set reflection map to this type of material", this.material);
        }
        else
            this.log.error("Unknown texture loaded with type " + TextureAsset.typeToString(textureUnit.type));

        this.material.needsUpdate = true;

        // Dependency tracking
        this._removeTextureDependency(textureUnit.textureRef, textureUnit.index);
        if (this.numPendingDependencies() === 0)
        {
            if (this.logging) console.log("All dependencies loaded for", this.name);
            this._emitLoaded();
        }
    },

    _textureFailed : function(transfer, reason, metadata)
    {
        this._emitDependencyFailed(transfer.ref);
        this.unload();
    }
});

return OgreMaterialAsset;

}); // require js
