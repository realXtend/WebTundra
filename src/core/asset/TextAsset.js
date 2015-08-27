
define([
        "lib/classy",
        "core/asset/IAsset"
    ], function(Class, IAsset) {

var TextAsset = IAsset.$extend(
/** @lends TextAsset.prototype */
{
    /**
        Represents a WebTundra text based asset, useful for JSON/XML/TXT etc. requests.
        To use this asset type force asset type to "Text" when calling {@link AssetAPI#requestAsset}.

        @constructs
        @extends IAsset
        @param {String} name Unique name of the asset, usually this is the asset reference.
    */
    __init__ : function(name)
    {
        this.$super(name, "TextAsset");

        /**
            Asset data string. This can be a JSON object, DOM XML node or
            a string, depending on the type of the asset request.
            @var {String}
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

return TextAsset;

}); // require js
