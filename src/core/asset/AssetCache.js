
define([
        "lib/classy"
    ], function(Class) {

/**
    Asset cache.

    @class AssetCache
    @constructor
*/
var AssetCache = Class.$extend(
{
    __init__ : function()
    {
        this.assets = {};
    },

    /**
        @method get
        @param {String} assetRef
        @return {IAsset}
    */
    get : function(ref)
    {
        return this.assets[ref];
    },

    /**
        @method set
        @param {String} assetRef
        @param {IAsset} asset
    */
    set : function(ref, asset)
    {
        this.assets[ref] = asset;
    },

    /**
        @method remove
        @param {String} assetRef
    */
    remove : function(ref)
    {
        delete this.assets[ref];
    },

    /**
        @method hasAsset
        @param {String} assetRef
        @return {Boolean}
    */
    hasAsset : function(ref)
    {
        return (this.get(ref) !== undefined);
    },

    /**
        @method getAssets
        @return {Array<IAsset>}
    */
    getAssets : function()
    {
        var assetsList = [];
        for (var ref in this.assets)
            assetsList.push(this.assets[ref]);
        return assetsList;
    },

    /**
        Clears the cache.
        @method forgetAssets
    */
    forgetAssets : function()
    {
        this.assets = {};
    }
});

return AssetCache;

}); // require js
