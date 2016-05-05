
define([
        "lib/classy",
        "lib/three",
        "lib/three/DDSLoader",
        "lib/webgl-texture-util",
        "core/asset/IAsset"
    ], function(Class, THREE, THREE_DDSLoader, WebGLTextureUtil, IAsset) {

/**
    Represents a texture asset.
    @class TextureAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var TextureAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "TextureAsset");

        /**
            Texture or null if not loaded.
            @property texture
            @type null|THREE.CompressedTexture|THREE.Texture
        */
        this.texture = null;
        this.cubeTexture = null;

        // Instanced variations created from this texture.
        this._instances = [];

        // Private for property instancing, see getOrCreateInstance()
        this.instanceUsed = false;
    },

    __classvars__ :
    {
        __init__ : function(framework)
        {
            TextureAsset.WebGLTextureLoader = new WebGLTextureUtil(framework.renderer.renderer.getContext());

            // If three.js reports it does not support DXT compressed formats
            // we will use WebGLTextureUtil for ETC1/PVR1.
            var threeCheck = framework.renderer.renderer.extensions.get("WEBGL_compressed_texture_s3tc");
            if ((threeCheck === null || threeCheck === undefined || threeCheck === false) && TextureAsset.WebGLTextureLoader.supportsDXT() !== true)
                TextureAsset.SupportsDXT = false;

            TextureAsset.SupportsETC1 = TextureAsset.WebGLTextureLoader.supportsETC1();
            TextureAsset.SupportsPVR = TextureAsset.WebGLTextureLoader.supportsPVRTC();

            if (Tundra.browser.isMobile())
                TextureAsset.EnabledFormat = (TextureAsset.SupportsETC1 ? "etc1" : (TextureAsset.SupportsPVR ? "pvr" : ""));

            console.log("[TextureAsset]: Compression support " +
                "DXT:"    + TextureAsset.SupportsDXT,
                "ETC1:"   + TextureAsset.SupportsETC1,
                "PVR:"    + TextureAsset.SupportsPVR,
                "Enabled format:'" + TextureAsset.EnabledFormat + "'"
            );
        },

        SupportsDXT  : true,
        SupportsETC1 : false,
        SupportsPVR  : false,

        EnabledFormat : "",

        Format :
        {
            // DXT formats, from:
            // http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
            COMPRESSED_RGB_S3TC_DXT1_EXT  : 0x83F0,
            COMPRESSED_RGBA_S3TC_DXT1_EXT : 0x83F1,
            COMPRESSED_RGBA_S3TC_DXT3_EXT : 0x83F2,
            COMPRESSED_RGBA_S3TC_DXT5_EXT : 0x83F3,

            // ETC1 format, from:
            // http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_etc1/
            COMPRESSED_RGB_ETC1_WEBGL : 0x8D64,

            // PVR formats, from:
            // http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/
            COMPRESSED_RGB_PVRTC_4BPPV1_IMG  : 0x8C00,
            COMPRESSED_RGB_PVRTC_2BPPV1_IMG  : 0x8C01,
            COMPRESSED_RGBA_PVRTC_4BPPV1_IMG : 0x8C02,
            COMPRESSED_RGBA_PVRTC_2BPPV1_IMG : 0x8C03,

            // ATC formats, from:
            // http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_atc/
            COMPRESSED_RGB_ATC_WEBGL                     : 0x8C92,
            COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL     : 0x8C93,
            COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL : 0x87EE
        },

        // Singleton texture loaders
        WebGLTextureLoader : null,

        // For three.js shaders
        DIFFUSE     : 0,
        SPECULAR    : 1,
        NORMAL      : 2,
        LIGHT       : 3,
        REFLECTION  : 4,
        SHADOW      : 5,

        typeToString : function(textureType)
        {
            if (textureType === TextureAsset.DIFFUSE)
                return "DIFFUSE";
            else if (textureType === TextureAsset.SPECULAR)
                return "SPECULAR";
            else if (textureType === TextureAsset.NORMAL)
                return "NORMAL";
            else if (textureType === TextureAsset.LIGHT)
                return "LIGHT";
            else if (textureType === TextureAsset.REFLECTION)
                return "REFLECTION";
            else if (textureType === TextureAsset.SHADOW)
                return "SHADOW";
            return "Unkown texture type " + textureType.toString();
        },

        typeFromString : function(textureType)
        {
            if (textureType === "DIFFUSE")
                return TextureAsset.DIFFUSE;
            else if (textureType === "SPECULAR")
                return TextureAsset.SPECULAR;
            else if (textureType === "NORMAL")
                return TextureAsset.NORMAL;
            else if (textureType === "LIGHT")
                return TextureAsset.LIGHT;
            else if (textureType === "REFLECTION")
                return TextureAsset.REFLECTION;
            else if (textureType === "SHADOW")
                return TextureAsset.SHADOW;
            return -1;
        },

        formatToString : function(format)
        {
            if (typeof format === "number")
            {
                if (format === THREE.AlphaFormat)
                    return "Alpha";
                else if (format === THREE.RGBFormat)
                    return "RGB";
                else if (format === THREE.LuminanceFormat)
                    return "Luminance";
                else if (format === THREE.LuminanceAlphaFormat)
                    return "LuminanceAlpha";
                else if (format === THREE.RGB_S3TC_DXT1_Format)
                    return "RGB_S3TC_DXT1";
                else if (format === THREE.RGBA_S3TC_DXT1_Format)
                    return "RGBA_S3TC_DXT1";
                else if (format === THREE.RGBA_S3TC_DXT3_Format)
                    return "RGBA_S3TC_DXT3";
                else if (format === THREE.RGBA_S3TC_DXT5_Format)
                    return "RGBA_S3TC_DXT5";
            }
            return "INVALID_TEXTURE_FORMAT";
        },

        filterToString : function(filter)
        {
            if (typeof filter === "number")
            {
                if (filter === THREE.NearestFilter)
                    return "Nearest";
                else if (filter === THREE.NearestMipMapNearestFilter)
                    return "NearestMipMapNearest";
                else if (filter === THREE.NearestMipMapLinearFilter)
                    return "NearestMipMapLinear";
                else if (filter === THREE.LinearFilter)
                    return "Linear";
                else if (filter === THREE.LinearMipMapNearestFilter)
                    return "LinearMipMapNearest";
                else if (filter === THREE.LinearMipMapLinearFilter)
                    return "LinearMipMapLinear";
            }
            return "INVALID_TEXTURE_FILTER";
        },

        addressModeFromString : function(addressMode)
        {
            /// @note Ogres 'border' mode is not directly supported by threejs
            if (addressMode === "wrap" || addressMode === "")
                return THREE.RepeatWrapping;
            else if (addressMode === "clamp")
                return THREE.ClampToEdgeWrapping;
            else if (addressMode === "mirror")
                return THREE.MirroredRepeatWrapping;
            // Default if unkown
            return THREE.RepeatWrapping;
        }
    },

    isLoaded : function()
    {
        return (this.texture !== null && this.texture.mipmaps !== undefined && this.texture.mipmaps !== null);
    },

    unload : function()
    {
        if (this.texture != null)
            this.texture.dispose();
        this.texture = null;
        if (this.cubeTexture != null)
            this.cubeTexture.dispose();
        this.cubeTexture = null;
    },

    /**
        Returns texture height or -1 if not not known.
        @method height
        @return {Number}
    */
    height : function()
    {
        if (this.isLoaded() && this.texture != null && this.texture.image != null)
            return this.texture.image.height;
        return -1;
    },

    /**
        Returns texture width or -1 if not not known.
        @method width
        @return {Number}
    */
    width : function()
    {
        if (this.isLoaded() && this.texture != null && this.texture.image != null)
            return this.texture.image.width;
        return -1;
    },

    /**
        Returns mipmap count or -1 if not not known.
        @method numMipmaps
        @return {Number}
    */
    numMipmaps : function()
    {
        if (this.isLoaded() && this.texture != null && this.texture.mipmaps != null)
            return this.texture.mipmaps.length;
        return -1;
    },

    getOrCreateInstance : function(textureUnit)
    {
        // @note Everyone of the variations needs a unique texture clone. This is some poor design in threejs
        // as the properties are not material spesific but texture spesific. Now we need to duplicate memory
        // for each different mixture of the properties.
        if (this.texture === undefined || this.texture === null)
            return null;

        // For reflection texture unit. Create a singleton cubemap texture and return it.
        if (textureUnit.type === TextureAsset.REFLECTION)
        {
            if (this.cubeTexture === null)
            {
                if (this.texture.image.width !== this.texture.image.height)
                {
                    this.log.warn("Cannot create reflection cube map from texture with width != height:",
                        this.texture.image.width, "x", this.texture.image.height, "in", this.name)
                    return null;
                }

                this.cubeTexture = new THREE.CompressedTexture();

                this.cubeTexture.name = this.texture.name;
                this.cubeTexture.wrapS = this.texture.wrapS;
                this.cubeTexture.wrapT = this.texture.wrapT;
                this.cubeTexture.magFilter = this.texture.magFilter;
                this.cubeTexture.minFilter = this.texture.minFilter;

                this.cubeTexture.format = this.texture.format;

                this.cubeTexture.anisotropy = this.texture.anisotropy;
                this.cubeTexture.needsUpdate = true;

                this.cubeTexture.image = [];
                for (var i = 0; i < 6; ++i)
                    this.cubeTexture.image.push(this.texture);
            }
            return this.cubeTexture;
        }

        var checker =
        {
            repeat              : textureUnit.scale,
            addressModeString   : textureUnit.addressMode,
            addressMode         : TextureAsset.addressModeFromString(textureUnit.addressMode),

            matches : function(textureAsset)
            {
                var t = textureAsset.texture;
                if (this.repeat.x === t.repeat.x && this.repeat.y === t.repeat.y &&
                    this.addressMode === t.wrapS && this.addressMode === t.wrapT)
                    return true;
                return false;
            },

            clone : function(textureAsset)
            {
                var clone = textureAsset.clone();
                this.apply(clone);
                return clone;
            },

            apply : function(textureAsset)
            {
                textureAsset.texture.repeat = this.repeat.clone();
                textureAsset.texture.wrapS = this.addressMode;
                textureAsset.texture.wrapT = this.addressMode;
                textureAsset.texture.needsUpdate = true;
                textureAsset.instanceUsed = true;
            },

            toString : function()
            {
                return "repeat = " + this.repeat.x + "," + this.repeat.y + " addressMode = " + this.addressModeString;
            },

            textureId : function(textureAsset)
            {
                return textureAsset.name.substring(textureAsset.name.lastIndexOf("/")+1);
            }
        };

        if (!checker.matches(this))
        {
            // If the base instance is not utilized yet, set the properties to it
            if (!this.instanceUsed)
            {
                if (this.logging) this.log.info("Modifying base instance with", checker.toString(), checker.textureId(this));
                checker.apply(this);
                return this.texture;
            }

            // Iterate clones and see if something matches the properties combo
            for (var i=0, num=this.numClones(); i<num; ++i)
            {
                var existing = Tundra.asset.getAsset(this.cloneName(i));
                if (existing != null && existing.texture != null)
                {
                    if (checker.matches(existing))
                    {
                        if (this.logging) this.log.info("Found existing instance", checker.toString(), checker.textureId(existing));
                        return existing.texture;
                    }
                }
            }

            // No matches found, we need clone a new instance for this combo.
            var clone = checker.clone(this);
            this._instances.push(clone.texture);
            if (this.logging) this.log.info("Cloned instance", checker.toString(), checker.textureId(clone));
            return clone.texture;
        }

        if (this.logging) this.log.info("Returning base instance", checker.toString(), checker.textureId(this));
        this.instanceUsed = true;
        return this.texture;
    },

    /// IAsset override.
    _cloneImpl : function(newAssetName)
    {
        var textureAsset = new TextureAsset(newAssetName);
        textureAsset.texture = this.texture.clone();
        textureAsset.texture.name = newAssetName;
        textureAsset.texture.needsUpdate = true;
        return textureAsset;
    },

    deserializeFromData : function(data, dataType, transfer)
    {
        if (this.texture != null)
        {
            this.log.warn("Texture already loaded: " + this.name);
            return false;
        }

        // PNG loading
        if ((transfer.suffix === ".png" && transfer.proxyMetadata.type !== ".dds") || transfer.proxyMetadata.type === ".png")
        {
            THREE.ImageUtils.crossOrigin = "anonymous";
            THREE.ImageUtils.loadTexture(transfer.suffix === ".png" ? transfer.ref : transfer.proxyRef, undefined, function(texture) {
                this.texture = texture;
                this.texture.tundraAsset = this;
                this.texture.width = texture.image.width;
                this.texture.height = texture.image.height;

                this.texture.wrapS = THREE.RepeatWrapping;
                this.texture.wrapT = THREE.RepeatWrapping;
                this.texture.magFilter = THREE.LinearFilter;
                this.texture.minFilter = THREE.LinearFilter;
                this.texture.flipY = false;

                this.texture.anisotropy = 4;
                this.texture.generateMipmaps = false;
                this.texture.needsUpdate = true;

                this._emitLoaded();
            }.bind(this), function(error) {
                this._emitFailed("Failed to load png via <img>");
            }.bind(this));
            return true;
        }
        // Desktop: Normal DXT texture load
        else if (TextureAsset.SupportsDXT !== false && (TextureAsset.EnabledFormat === "" || TextureAsset.EnabledFormat === "dxt"))
        {
            var dds = THREE.DDSLoader.parse(data, true);
            if (dds == null || dds.format == null)
                return false;

            this.texture = new THREE.CompressedTexture();
            this.texture.tundraAsset = this;
            this.texture.name = this.name;
            this.texture.wrapS = THREE.RepeatWrapping;
            this.texture.wrapT = THREE.RepeatWrapping;
            this.texture.magFilter = THREE.LinearFilter;
            this.texture.minFilter = THREE.LinearFilter;

            this.texture.format = dds.format;
            this.texture.mipmaps = dds.mipmaps;
            this.texture.width = this.texture.image.width = dds.width;
            this.texture.height = this.texture.image.height = dds.height;

            this.texture.anisotropy = 4;
            this.texture.generateMipmaps = false;
            this.texture.needsUpdate = true;

            if (this.texture.mipmaps !== undefined && this.texture.mipmaps !== null)
            {
                if (this.texture.mipmaps.length > 1)
                {
                    this.texture.magFilter = THREE.NearestFilter;
                    this.texture.minFilter = THREE.NearestMipMapNearestFilter;
                }
            }
            else
                this.log.error("Mipmaps null after loading for " + this.name, true);

            if (this.logging)
                this.dumpDebugInfo();

            this.texture.addEventListener("dispose", this._onTextureDispose.bind(this));

            delete dds; dds = null;
            return true;
        }
        // Mobile: Load DDS container ETC1 texture to the GPU.
        // This involves some trickery to go around three.js load steps.
        else if (TextureAsset.SupportsETC1 === true && TextureAsset.EnabledFormat === "etc1")
        {
            TextureAsset.WebGLTextureLoader.parseDDS(data, function(dxtData, width, height, levels, internalFormat) {
                if (internalFormat !== TextureAsset.Format.COMPRESSED_RGB_ETC1_WEBGL)
                {
                    this.log.error("Decoded compression format", internalFormat, "is not ETC1 and cannot be loaded.");
                    return;
                }

                this.texture = new THREE.CompressedTexture();
                this.texture.tundraAsset = this;
                this.texture.name = this.name;

                this.texture.mipmaps = [];
                this.texture.image.width = width;
                this.texture.image.height = height;
                this.texture.generateMipmaps = false;

                // @todo Set these to the webgl texture to mimic three.js loading.
                this.texture.wrapS = THREE.RepeatWrapping;
                this.texture.wrapT = THREE.RepeatWrapping;
                this.texture.magFilter = THREE.LinearFilter;
                this.texture.minFilter = THREE.LinearFilter;
                this.texture.anisotropy = 4;

                // hack three.js webgl init
                // todo this is a private/anon function and cannot be hooked to
                //this.texture.addEventListener( 'dispose', <webgl_renderer_anon_func>onTextureDispose );
                Tundra.renderer.renderer.info.memory.textures++;

                this.texture.needsUpdate = false;
                this.texture.__webglInit = true;
                this.texture.__webglTexture = TextureAsset.WebGLTextureLoader.gl.createTexture();

                TextureAsset.WebGLTextureLoader._uploadCompressedData(dxtData, width, height, levels, internalFormat, this.texture.__webglTexture, function(glTexture, nothing, stats)
                {
                    var _gl = TextureAsset.WebGLTextureLoader.gl;

                    // Setup THREE.Texture properties from private/anon WebGlRenderer.setTexture
                    _gl.pixelStorei( _gl.UNPACK_FLIP_Y_WEBGL, this.flipY );
                    _gl.pixelStorei( _gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha );
                    _gl.pixelStorei( _gl.UNPACK_ALIGNMENT, this.unpackAlignment );

                    // pow2 based min/mag filters
                    var isPow2 = (TextureAsset.WebGLTextureLoader.isPowerOfTwo(stats.width) && TextureAsset.WebGLTextureLoader.isPowerOfTwo(stats.height));
                    _gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, (isPow2 ? _gl.NEAREST : _gl.LINEAR) );
                    _gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, (isPow2 ? _gl.NEAREST_MIPMAP_NEAREST : _gl.LINEAR) );

                }.bind(this.texture));
            }.bind(this), function(err) {
                this.log.error("Failed to load ETC1 texture:", err);
            }.bind(this));

            return this.isLoaded();
        }
        /// @todo iOS devices
        /*else if (TextureAsset.SupportsPVR === true && TextureAsset.EnabledFormat === "pvr")
        {
        }*/
        else
        {
            this.log.error("Cannot load texture: Enabled profile '" + TextureAsset.EnabledFormat + "' asset ref:", this.name);
            return false;
        }
    },

    dumpDebugInfo : function()
    {
        this.log.debug(this.name);
        this.log.debug("  -- loaded  " + this.isLoaded());
        this.log.debug("  -- format  " + TextureAsset.formatToString(this.isLoaded() ? this.texture.format : undefined));
        this.log.debug("  -- filters min = " + TextureAsset.filterToString(this.isLoaded() ? this.texture.minFilter : undefined) +
                                " mag = " + TextureAsset.filterToString(this.isLoaded() ? this.texture.magFilter : undefined));
        this.log.debug("  -- size    " + this.width() + " x " + this.height());
        this.log.debug("  -- mipmaps " + this.numMipmaps());
        this.log.debug("");
    },

    _onTextureDispose : function(event)
    {
        if (this.texture == null && this.cubeTexture == null)
            return;

        //var t = performance.now();

        // Dispose instances
        var uuids = [(this.texture != null ? this.texture.uuid : this.cubeTexture.uuid)];
        for (var i = 0; i < this._instances.length; i++)
        {
            uuids.push(this._instances[i].uuid);
            this._instances[i].dispose();
        }

        var matches = function(uuid) {
            for (var ui=0, ulen=uuids.length; ui<ulen; ++ui)
                if (uuids[ui] === uuid)
                    return true;
            return false;
        };

        var numReseted = 0;
        var meshes = Tundra.renderer.getAllMeshes();
        for (var mi=0, mlen=meshes.length; mi<mlen; mi++)
        {
            var material = meshes[mi].material;
            if (meshes[mi].material == null)
                continue;

            var preNum = numReseted;
            if (material instanceof THREE.ShaderMaterial)
            {
                if (material.uniforms != null)
                {
                    if (material.uniforms["map1"] != null && material.uniforms["map1"].value != null && matches(material.uniforms["map1"].value.uuid))
                    {
                        if (this.logging) console.log("  uniform map1");
                        numReseted++;
                        material.uniforms["map1"].value = null;
                    }
                    if (material.uniforms["map2"] != null && material.uniforms["map2"].value != null && matches(material.uniforms["map2"].value.uuid))
                    {
                        if (this.logging) console.log("  uniform map2");
                        numReseted++;
                        material.uniforms["map2"].value = null;
                    }
                    if (material.uniforms["tCube"] != null && material.uniforms["tCube"].value != null && matches(material.uniforms["tCube"].value.uuid))
                    {
                        if (this.logging) console.log("  uniform tCube");
                        numReseted++;
                        material.uniforms["tCube"].value = null;
                    }
                    if (material.uniforms["map"] != null && material.uniforms["map"].value != null && matches(material.uniforms["map"].value.uuid))
                    {
                        if (this.logging) console.log("  uniform map");
                        numReseted++;
                        material.uniforms["map"].value = null;
                    }
                    if (material.uniforms["normalMap"] != null && material.uniforms["normalMap"].value != null && matches(material.uniforms["normalMap"].value.uuid))
                    {
                        if (this.logging) console.log("  uniform normalMap");
                        numReseted++;
                        material.uniforms["normalMap"].value = null;
                    }
                }
            }
            else if (material instanceof THREE.Material)
            {
                if (material.map != null && matches(material.map.uuid))
                {
                    if (this.logging) console.log("  map");
                    numReseted++;
                    material.map = null;
                }
                if (material.lightMap != null && matches(material.lightMap.uuid))
                {
                    if (this.logging) console.log("  lightMap");
                    numReseted++;
                    material.lightMap = null;
                }
                if (material.specularMap != null && matches(material.specularMap.uuid))
                {
                    if (this.logging) console.log("  specularMap");
                    numReseted++;
                    material.specularMap = null;
                }
                if (material.normalMap != null && matches(material.normalMap.uuid))
                {
                    if (this.logging) console.log("  normalMap");
                    numReseted++;
                    material.normalMap = null;
                }
                if (material.envMap != null && matches(material.envMap.uuid))
                {
                    if (this.logging) console.log("  envMap");
                    numReseted++;
                    material.envMap = null;
                }
            }

            if (preNum != numReseted)
                material.needsUpdate = true;
        }

        /*if (TextureAsset._perf === undefined)
            TextureAsset._perf = 0.0;
        var dur = (performance.now() - t);
        TextureAsset._perf += dur;

        console.log("  Disposed", (this.texture ? this.texture.name : this.cubeTexture.name), "Reseted", numReseted, "Instances", this._instances.length, "in", dur, TextureAsset._perf);*/

        this._instances = [];
        if (this.texture)
            this.texture.mipmaps = [];
        this.texture = null;
        if (this.cubeTexture)
            this.cubeTexture.mipmaps = [];
        this.cubeTexture = null;
    }
});

return TextureAsset;

}); // require js
