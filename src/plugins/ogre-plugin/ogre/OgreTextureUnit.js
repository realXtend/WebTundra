
define([
        "lib/three",
        "lib/classy",
        "core/framework/CoreStringUtils"
    ], function(THREE, Class, CoreStringUtils) {

var OgreTextureUnit = Class.$extend(
{
    __init__ : function(index, name, data, logging)
    {
        this.index = index;
        this.name = name;
        this.textureRef = "";
        this.logging = logging || false;

        if (data !== undefined && typeof data === "string")
            this.deserializeFromData(data);
    },

    deserializeFromData : function(data)
    {
        if (this.logging)
        {
            console.log ("  >> texture_unit", this.index);
            if (this.name !== "")
                console.log ("     --", this._logPadding("name"), "'" + this.name + "'");
        }

        this.data = data;

        this.texture = this.textureRef = this.readFirstString("texture");
        /// @todo Support different address mode for x and y! three.js supports this via texture.wrapS and texture.wrapT
        this.addressMode  = this.readFirstString("tex_address_mode");
        this.alias        = this.readString("texture_alias", true);
        this.coordSet     = this.readInt("tex_coord_set", -1);
        this.scale        = this.readFloat2("scale", 1.0, new THREE.Vector2(1,1));

        if (this.logging === false)
            this.data = undefined;
    },

    _logPadding : function(keyword)
    {
        return keyword;
        /*var padding = "";
        while (keyword.length + padding.length < 16)
            padding += " ";
        return keyword + padding;*/
    },

    readFirstString : function(keyword)
    {
        // Used for example in:
        // texture <texturename> [<type>] [unlimited | numMipMaps] [alpha] [<PixelFormat>] [gamma]
        // Simple Format: tex_address_mode <uvw_mode> 
        // Extended Format: tex_address_mode <u_mode> <v_mode> [<w_mode>]
        var value = this.readString(keyword);
        if (value.indexOf(" ") !== -1)
            value = value.substring(0, value.indexOf(" "));
        if (this.logging && value !== "")
            console.log("     --", this._logPadding(keyword), "'" + value + "'");
        return value;
    },

    readString : function(keyword, log)
    {
        keyword += " ";
        var index = this.data.indexOf(keyword);
        var value = (index !== -1 ? CoreStringUtils.readLine(this.data.substring(index + keyword.length), null, true, true) : "");
        if (this.logging && log === true && value !== "")
            console.log("     --", this._logPadding(keyword) + "'" + value + "'");
        return value;
    },

    readInt  : function(keyword, defaultValue)
    {
        var value = this.readString(keyword);
        if (value === "")
            return defaultValue;
        if (this.logging)
            console.log("     --", this._logPadding(keyword), parseInt(value));
        return parseInt(value);
    },

    readFloat2 : function(keyword, maxValue, defaultValue)
    {
        if (maxValue === undefined)
            maxValue = 1.0;
        if (defaultValue === undefined)
            defaultValue = new THREE.Vector2();

        var value = this.readString(keyword);
        if (value === "")
            return defaultValue;

        var parts = value.split(" ");
        if (parts.length >= 2)
        {
            defaultValue.x = Math.min(parseFloat(parts[0]), maxValue);
            defaultValue.y = Math.min(parseFloat(parts[1]), maxValue);
            if (this.logging)
                console.log("     --", this._logPadding(keyword), defaultValue.x, defaultValue.y);
        }
        return defaultValue;
    }
});

return OgreTextureUnit;

}); // require js
