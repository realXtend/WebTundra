
define([
        "lib/classy",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        "core/math/Color",
        "plugins/ogre-plugin/ogre/OgreShader",
        "plugins/ogre-plugin/ogre/OgreTextureUnit",
        "plugins/ogre-plugin/asset/TextureAsset"
    ], function(Class, TundraLogging, CoreStringUtils, Color,
                OgreShader, OgreTextureUnit, TextureAsset) {

var OgreMaterial = Class.$extend(
{
    __init__ : function(name, data, logging)
    {
        this.name = name;
        this.logging = (logging || false);

        if (data !== undefined && typeof data === "string")
            this.deserializeFromData(data);
    },

    __classvars__ :
    {
        IgnoredTextureUnitTypes : {},

        Color :
        {
            Ambient  : 0,
            Diffuse  : 1,
            Specular : 2,
            Emissive : 3
        },

        ignoreTextureUnit : function(textureType)
        {
            var types = (Array.isArray(textureType) ? textureType : [ textureType ]);
            for (var i = 0; i < types.length; i++)
            {
                var type = types[i]
                if (typeof type === "string")
                    type = TextureAsset.typeFromString(type);
                if (typeof type !== "number" || type < 0)
                    continue;

                OgreMaterial.IgnoredTextureUnitTypes[type] = true;
            }
        },

        typeFromString : function(type)
        {
            if (type === "ambient")
                return OgreMaterial.Color.Ambient;
            else if (type === "diffuse")
                return OgreMaterial.Color.Diffuse;
            else if (type === "specular")
                return OgreMaterial.Color.Specular;
            else if (type === "emissive")
                return OgreMaterial.Color.Emissive;
            return undefined;
        },

        typeToString : function(type)
        {
            if (type === OgreMaterial.Color.Ambient)
                return "ambient";
            else if (type === OgreMaterial.Color.Diffuse)
                return "diffuse";
            else if (type === OgreMaterial.Color.Specular)
                return "specular";
            else if (type === OgreMaterial.Color.Emissive)
                return "emissive";
            return "Unkown color type";
        },

        defaultMaterialColor : function(type)
        {
            if (typeof type === "string")
                type = OgreMaterial.typeFromString(type);
            if (type === undefined)
                return null;

            /** Note that these are Ogre defaults when not
                defined in the material. We are aiming for a similar
                visual impact. However theejs does not have alpha channel
                so we need to improvise a bit for transparent default colors. */
            var c = new Color();
            if (type === OgreMaterial.Color.Ambient)
                c.setRGBA(0.8, 0.8, 0.8);
            else if (type === OgreMaterial.Color.Diffuse)
                c.setRGBA(1, 1, 1);
            else if (type === OgreMaterial.Color.Specular)
                c.setRGBA(0.067, 0.067, 0.067); // transparent!
            else if (type === OgreMaterial.Color.Emissive)
                c.setRGBA(0, 0, 0); // transparent!
            return c;
        },

        clampColor : function(type, color, maxValue, logging)
        {
            if (color.r > maxValue || color.g > maxValue || color.b > maxValue)
            {
                if (color.r > maxValue) color.r = maxValue;
                if (color.g > maxValue) color.g = maxValue;
                if (color.b > maxValue) color.b = maxValue;
                if (logging)
                {
                    if (typeof type === "string") type = OgreMaterial.typeFromString(type);
                    console.log("  -- Clamped", OgreMaterial.typeToString(type), "to", maxValue);
                }
            }
        },

        _passRegexp    : /\spass/g,
        _texUnitRegexp : /\stexture_unit/g
    },

    deserializeFromData : function(data)
    {
        this.data = CoreStringUtils.removeComments(data);

        if (this.logging) console.log("Parsing '" + this.name + "'");

        this.passes            = {};
        this.passes.count      = this.readCount("pass", OgreMaterial._passRegexp);

        if (this.passes.count > 1)
        {
            console.warn("OgreMaterial: Parser detected", this.passes.count, "passes. Only single pass fixed pipeline materials are supported '" + this.name + "'. Continuing parsing witht the first pass.");

            var block = this.readBlock("pass", 0, false);
            this.data = block.data;

            // Turns out there are tons of these typeo f assets and lots of spam.
            //if (TundraLogging.DebugLevelEnabled)
            //    console.log(this.data);
        }

        if (this.logging) this.readCount("texture_unit", OgreMaterial._texUnitRegexp); // This is just for debug prints

        this.shaders           = {};
        this.shaders.vertex    = new OgreShader(OgreShader.Type.Vertex, this.data, this.logging);
        this.shaders.fragment  = new OgreShader(OgreShader.Type.Fragment, this.data, this.logging);

        this.shaders.hasShadowShaders = function() {
            return (this.vertex.nameContains("Shadow") || this.fragment.nameContains("Shadow"));
        };

        this.shaders.fragment.readNamedParameters({
            "opacity"       : "float4",
            "specularPower" : "float4"
        });

        // Attributes
        /// @todo These should be read per pass or texture unit. This global matching
        /// can produce visual bugs in complex materials.
        this.attributes  = {};
        this.attributes["scene_blend"]      = this.readString("scene_blend", true);
        this.attributes["scene_blend_op"]   = this.readString("scene_blend_op", true);
        this.attributes["colour_op_ex"]     = this.readAttributeList("colour_op_ex");
        this.attributes["alpha_op_ex"]      = this.readAttributeList("alpha_op_ex");
        this.attributes["alpha_rejection"]  = this.readAttributeList("alpha_rejection");
        this.attributes["fog_override"]     = this.readAttributeList("fog_override");

        // Colors
        this.ambient     = this.readColor(OgreMaterial.Color.Ambient);
        this.diffuse     = this.readColor(OgreMaterial.Color.Diffuse);
        this.specular    = this.readColor(OgreMaterial.Color.Specular);
        this.emissive    = this.readColor(OgreMaterial.Color.Emissive);

        // Transparency and lighting
        this.opacity     = this.readOpacity();
        this.depthWrite  = (this.data.indexOf("depth_write off") === -1)
        this.lighting    = (this.data.indexOf("lighting off") === -1);

        if (this.logging && !this.depthWrite)
            console.log("  -- depth_write off");
        if (this.logging && !this.lighting)
            console.log("  -- lighting off");

        // Texture units
        this.textureUnits = [];

        for (var textureIndex=0, blockIndex=0; blockIndex!==-1; ++textureIndex)
        {
            var block = this.readBlock("texture_unit", blockIndex, false);
            if (block === undefined)
                break;
            blockIndex = block.indexEnd;

            var textureUnit = new OgreTextureUnit(textureIndex, block.name, block.data, this.logging);
            textureUnit.type = this.resolveTextureType(textureUnit);

            if (textureUnit.type === undefined)
            {
                /*if (this.logging)
                {*/
                    console.warn("Failed to resolve texture type", "index =", textureUnit.index, "name =", textureUnit.name,
                        "coord set =", textureUnit.coordSet, "fragment shader =", this.shaders.fragment.name);
                //}
                continue;
            }
            if (textureUnit.type === TextureAsset.SHADOW)
                continue;

            // Is this texture units type set to be ignored by 3rd party code?
            var typeIgnored = OgreMaterial.IgnoredTextureUnitTypes[textureUnit.type];
            if (typeIgnored !== undefined && typeIgnored === true)
            {
                if (this.logging)
                    console.log ("     Ignoring " + TextureAsset.typeToString(textureUnit.type) + " as instructed by 3rd party code.");
                continue;
            }

            if (!this.isTextureTypeReserved(textureUnit.type))
                this.textureUnits.push(textureUnit);
            else if (this.logging)
                console.log ("     Ignoring " + TextureAsset.typeToString(textureUnit.type) + " as its already set once!");
        }

        // Only keep the string for later inspection
        // if we are in 'debug' logging mode.
        if (this.logging === false)
            this.data = undefined;
    },

    readString : function(keyword, log)
    {
        keyword += " ";
        var index = this.data.indexOf(keyword);
        var value = (index !== -1 ? CoreStringUtils.readLine(this.data.substring(index + keyword.length), null, true, true) : "");
        if (this.logging && log === true && value !== "")
            console.log("  --", keyword + "'" + value + "'");
        return value;
    },

    readList : function(afterKeyword, splitSeparator)
    {
        var index = this.data.indexOf(afterKeyword);
        if (index === -1)
            return [];

        var line = CoreStringUtils.trim(this.readLine(this.data.substring(index + afterKeyword.length)));
        return (line !== "" ? line.split(typeof splitSeparator === "string" ? splitSeparator : " ") : []);
    },

    readColor : function(type)
    {
        /** @todo Use Color.fromString() */
        var c = null;
        var parts = this.readList(OgreMaterial.typeToString(type) + " ");
        if (parts.length >= 3)
        {
            c = new Color();
            c.r = Math.min(parseFloat(parts[0]), 1.0);
            c.g = Math.min(parseFloat(parts[1]), 1.0);
            c.b = Math.min(parseFloat(parts[2]), 1.0);
        }
        else
            c = OgreMaterial.defaultMaterialColor(type);

        if (this.logging)
        {
            var filler = "";
            while (OgreMaterial.typeToString(type).length+filler.length < 8)
                filler += " ";
            console.log("  --", OgreMaterial.typeToString(type) + filler, c.r, c.g, c.b, (parts.length < 3 ? "[default]" : ""));
        }
        return c;
    },

    readOpacity : function()
    {
        var opacity = undefined;

        // 1. 'param_named opacity float4 <alpha>'
        var shaderOpacity = this.shaders.fragment.namedParameter("opacity", "float4")
        if (shaderOpacity !== undefined && shaderOpacity.value.length > 0)
        {
            var candidate = Math.min(parseFloat(shaderOpacity.value[0]), 1.0);
            if (!isNaN(candidate))
                opacity = candidate;
        }
        // 2. 'alpha_op_ex <operation> <source1> <source2> <falpha_actor>' HOX: This is supposed to be texture_unit specific
        if (opacity === undefined && Array.isArray(this.attributes["alpha_op_ex"]) && this.attributes["alpha_op_ex"].length >= 4)
            opacity = Math.min(parseFloat(this.attributes["alpha_op_ex"][3]), 1.0);
        // 3. 'diffuse R G B A'
        if (opacity === undefined)
        {
            var diffuseParts = this.readList("diffuse ");
            opacity = (diffuseParts.length >= 4 ? Math.min(parseFloat(diffuseParts[3]), 1.0) : 1.0);
        }

        if (this.logging && opacity !== 1.0)
            console.log("  -- opacity ", opacity);
        return opacity;
    },

    readAttributeList : function(attributeId)
    {
        var parts = this.readList(attributeId + " ");
        if (this.logging && parts.length > 0)
            console.log("  --", attributeId, parts.join(" "));
        return parts;
    },

    readBlock : function(blockId, startIndex, log)
    {
        if (startIndex === undefined)
            startIndex = 0;

        var blockStartIndex = this.data.indexOf(blockId, startIndex);
        if (blockStartIndex === -1)
            return undefined;

        var block =
        {
            indexEnd : -1,
            // For example:
            // texture_unit
            id : blockId,
            // texture_unit <name>
            name : "",
            // texture_unit <name> { '<data>' }
            data : ""
        };

        var proceedIndex = blockStartIndex + blockId.length;
        var open = this.data.indexOf("{", proceedIndex);
        var close = this.data.indexOf("}", proceedIndex);
        if (open === -1 || close === -1)
        {
            console.error("Failed to read block { } data content starting from index", blockStartIndex);
            console.error("in", this.name);
            console.error(this.data.substring(blockStartIndex));
            return undefined;
        }
        var innerOpen = this.data.indexOf("{", open+1);
        while (innerOpen >= 0 && innerOpen < close)
        {
            innerClose = this.data.indexOf("}", innerOpen+1);
            if (innerClose === -1 || innerOpen >= close)
            {
                console.error("Syntax error in material file in {} scope at index", open, "in material:", this.name);
                console.log(this.data);
                return undefined;
            }
            close = this.data.indexOf("}", innerClose+1);
            innerOpen = this.data.indexOf("{", innerOpen+1);
        }

        block.name = CoreStringUtils.trim(this.readLine(this.data.substring(proceedIndex)));
        block.data = this.data.substring(open + 1, close - 1);
        block.indexEnd = close + 1;

        if (this.logging && log === true)
            console.log("  >>", block.id, (block.name !== "" ? "'" + block.name + "'" : ""));
        return block;
    },

    readCount : function(id, regex, log)
    {
        var result = this.data.match(regex);
        var num = (result != null ? result.length : 0);
        if (this.logging)
            console.log("  --", id, "count", num);
        return num;
    },

    readLine : function(str, separator)
    {
        var indexSplit = null;
        var indexEnd1 = str.indexOf("\n");
        var indexEnd2 = str.indexOf("\r\n");
        var indexEnd3 = str.indexOf("\t");
        var indexCustom = (separator !== undefined ? str.indexOf(separator) : -1);
        if (indexSplit == null || (indexEnd1 !== -1 && indexEnd1 < indexSplit))
            indexSplit = indexEnd1;
        if (indexSplit == null || (indexEnd2 !== -1 && indexEnd2 < indexSplit))
            indexSplit = indexEnd2;
        if (indexSplit == null || (indexEnd3 !== -1 && indexEnd3 < indexSplit))
            indexSplit = indexEnd3;
        if (indexSplit == null || (indexCustom !== -1 && indexCustom < indexSplit))
            indexSplit = indexCustom;
        return (indexSplit !== -1 ? str.substring(0, indexSplit) : "");
    },

    numTextures : function()
    {
        return this.textureUnits.length;
    },

    isTextureTypeReserved : function(textureType)
    {
        for (var i=0; i<this.textureUnits.length; ++i)
        {
            if (this.textureUnits[i].type === textureType)
                return true;
        }
        return false;
    },

    isTextureCoordReserver : function(coordSet)
    {
        for (var i=0; i<this.textureUnits.length; ++i)
        {
            if (this.textureUnits[i].coordSet === coordSet)
                return true;
        }
        return false;
    },

    resolveTextureType : function(textureUnit)
    {
        var textureType = undefined;

        // Detect from name
        if (textureUnit.name === "baseMap" || textureUnit.name === "diffuseMap")
            textureType = TextureAsset.DIFFUSE;
        else if (textureUnit.name === "specularMap")
            textureType = TextureAsset.SPECULAR;
        else if (textureUnit.name === "lightMap")
            textureType = TextureAsset.LIGHT;
        else if (textureUnit.name === "normalMap")
            textureType = TextureAsset.NORMAL;
        else if (textureUnit.name === "reflectionMap")
            textureType = TextureAsset.REFLECTION;
        else if (CoreStringUtils.startsWith(textureUnit.name, "shadowMap"))
        {
            if (this.logging)
                console.log("     --", TextureAsset.typeToString(TextureAsset.SHADOW));
            return TextureAsset.SHADOW;
        }

        // Material texture coord set defined.
        if (textureType === undefined && textureUnit.coordSet > -1)
        {
            // UV 0
            if (textureUnit.coordSet === 0)
            {
                if (!this.isTextureTypeReserved(TextureAsset.DIFFUSE))
                    textureType = TextureAsset.DIFFUSE;
                else
                    textureType = TextureAsset.SPECULAR;
            }
            // UV 1
            else if (textureUnit.coordSet === 1)
                textureType = TextureAsset.LIGHT;
        }

        // Make a guess with texture index and fragment program name.
        if (textureType === undefined)
        {
            // What if the fragment program is set?
            if (!this.shaders.fragment.isValid())
            {
                // UV 0
                if (textureUnit.index === 0)
                    textureType = TextureAsset.DIFFUSE;
                // UV 0
                else if (textureUnit.index === 1)
                {
                    if (!this.isTextureTypeReserved(TextureAsset.LIGHT))
                        textureType = TextureAsset.LIGHT;
                    else
                        textureType = TextureAsset.DIFFUSE;
                }
            }
            else if (this.shaders.fragment.nameContains("/Diff"))
            {
                if (textureUnit.index === 0)
                    textureType = TextureAsset.DIFFUSE;
            }
        }

        // Shader spesific texture typing
        if (this.shaders.fragment.nameContains("meshmoon/MultiDiff"))
        {
            // Texture coord is ignored, even if set. The order of the textures
            // determines which UV is used. tex0 UV0 and tex1 UV1.
            if (textureUnit.index === 0)
                textureType = TextureAsset.DIFFUSE;
            else
                textureType = undefined;
        }
        else if (this.shaders.fragment.nameContains("DiffSpecmapNormalShadowLightmap"))
        {
            // For this shader, applying lightmap seems to break the rendering.
            // Disable until we implement a custom shader to do it correctly.
            //if (textureType === TextureAsset.LIGHT)
            //    textureType = undefined;
        }

        if (this.logging && textureType !== undefined)
            console.log("     --", TextureAsset.typeToString(textureType));
        return textureType;
    },
});

return OgreMaterial;

}); // require js
