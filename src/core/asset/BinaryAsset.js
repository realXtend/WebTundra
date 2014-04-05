
define([
        "lib/classy",
        "core/asset/IAsset"
    ], function(Class, IAsset) {

/**
    Represents a WebTundra binary asset.

    To use this asset type force asset type to "Binary" when calling {{#crossLink "AssetAPI/requestAsset:method"}}{{/crossLink}}.
    @class BinaryAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var BinaryAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "BinaryAsset");

        /**
            Asset binary data.
            @property data
            @type ArrayBuffer
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

return BinaryAsset;

}); // require js
