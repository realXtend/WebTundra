
define([
        "lib/classy",
        "core/asset/IAsset"
    ], function(Class, IAsset) {

/**
    Represents a WebTundra text based asset, useful for JSON/XML/TXT etc. requests.

    To use this asset type force asset type to "Text" when calling {{#crossLink "AssetAPI/requestAsset:method"}}{{/crossLink}}.
    @class TextAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var TextAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "TextAsset");

        /**
            Asset data string.
            @property data
            @type String
        */
        this.data = null;
    },

    isLoaded : function()
    {
        return (this.data !== null);
    },

    deserializeFromData : function(data)
    {
        this.data = data;
    },

    unload : function()
    {
        this.data = null;
    }
});

return TextAsset;

}); // require js
