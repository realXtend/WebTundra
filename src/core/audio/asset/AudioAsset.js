
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

        this.data = null;
    },

    __classvars__ :
    {
    },

    isLoaded : function()
    {
        return typeof this.data != 'undefined';
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

return AudioAsset;

}); // require js
