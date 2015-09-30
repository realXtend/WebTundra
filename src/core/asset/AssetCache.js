
define([
        "lib/classy"
    ], function(Class) {

var AssetCache = Class.$extend(
/** @lends AssetCache.prototype */
{
    /**
        The asset cache stores currently loaded assets. It is used to avoid re-downloading of assets.
        <b>Note:</b> This class is used by AssetAPI, then instance can be accessed from {@link AssetAPI#cache}.

        @constructs
    */
    __init__ : function()
    {
        this.assets = {};
    },

    assetData : function()
    {
        var data = {};
        var keys = Object.keys(this.assets);
        for (var i = 0; i < keys.length; i++) {
            var asset = this.assets[keys[i]];
            if (asset && asset.isLoaded())
            {
                if (data[asset.type] === undefined)
                    data[asset.type] = 1;
                else
                    data[asset.type]++;
            }
        }
        return data;
    },

    /**
        Get an `IAsset` object from this cache by asset reference

        @param {String} assetRef
        @return {IAsset|undefined} If the asset with `assetRef` does not exists, `undefined` will be returned
    */
    get : function(ref)
    {
        return this.assets[ref];
    },

    /**
        Sets an `IAsset` object by `assetRef` reference

        @param {String} assetRef
        @param {IAsset} asset
    */
    set : function(ref, asset)
    {
        this.assets[ref] = asset;
    },

    /**
        Removes an `IAsset` by `ref` reference

        @param {String} ref
    */
    remove : function(ref)
    {
        delete this.assets[ref];
    },

    /**
        Checks if an asset exists by `ref` reference

        @param {String} ref
        @return {Boolean}
    */
    hasAsset : function(ref)
    {
        return (this.get(ref) !== undefined);
    },

    /**
        Returns all assets in an array of `IAsset`

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
    */
    forgetAssets : function()
    {
        this.assets = {};
    }
});

return AssetCache;

}); // require js
