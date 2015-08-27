
define([
        "lib/classy",
        "core/asset/IAsset"
    ], function(Class, IAsset) {

var BinaryAsset = IAsset.$extend(
/** @lends BinaryAsset.prototype */
{
    /**
        Represents a WebTundra binary asset. To use this asset type force asset type to "Binary"
        when calling {@link AssetAPI#requestAsset}.

        @constructs
        @extends IAsset
        @param {String} name Unique name of the asset, usually this is the asset reference.
    */
    __init__ : function(name)
    {
        this.$super(name, "BinaryAsset");

        /**
            Asset binary data.
            @var {ArrayBuffer}
        */
        this.data = null;
    },

    isLoaded : function()
    {
        return (this.data !== null);
    },

    deserializeFromData : function(data, dataType, transfer)
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
