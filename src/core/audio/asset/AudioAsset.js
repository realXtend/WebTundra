
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/asset/IAsset",
        "lib/three",
    ], function(Class, Tundra, IAsset, THREE) {

/**
    Represents a WebTundra Audio asset.

    @class AudioAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var AudioAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "AudioAsset");
    },


    isLoaded : function()
    {
    },

    deserializeFromData : function(data, dataType, transfer)
    {
    },

    unload : function()
    {
    }
});

return AudioAsset;

}); // require js
