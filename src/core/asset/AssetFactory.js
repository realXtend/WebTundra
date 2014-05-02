
define([
        "lib/classy",
        "core/framework/CoreStringUtils"
    ], function(Class, CoreStringUtils) {

/**
    AssetFactory for creating new assets.

    @class AssetFactory
    @constructor
    @param {String} name Name of the factory.
    @param {IAsset} assetClass Asset class that new assets are created from. 
    @param {Object} typeExtensions Map of lower cased file extension to the network request data type.
    If 'undefined' this asset can only be created via forcing the request type to assetType in AssetAPI.requestAsset.
    Or you can do more complex logic by overriding requestDataType and canCreate functions.
    @param {String} defaultDataType Default network request data type for example 'xml', 'text', 'arraybuffer', 'json' etc.
*/
var AssetFactory = Class.$extend(
{
    __init__ : function(assetType, assetClass, typeExtensions, defaultDataType)
    {
        if (typeof assetType !== "string")
            console.error("AssetFactory constructor 'assetType' needs to be a string!");
        if (assetClass === undefined || assetClass === null)
            console.error("AssetFactory constructor 'assetClass' is not a valid object!");
        if (typeExtensions !== undefined && Array.isArray(typeExtensions))
            console.error("AssetFactory constructor 'typeExtensions' must be a object mapping suffix to request data type!");
        else if (typeExtensions !== undefined && typeof typeExtensions !== "object")
            console.error("AssetFactory constructor 'typeExtensions' must be a object mapping suffix to request data type!");

        this.assetType = assetType;
        this.assetClass = assetClass;
        this.typeExtensions = typeExtensions;
        this.defaultDataType = defaultDataType;
    },

    /**
        Returns supported file extensions.
        @return {Array<string>}
    */
    supportedSuffixes : function()
    {
        return Object.keys(this.typeExtensions);
    },

    /**
        Returns the data type for the network request for a particular suffix.

        @method requestDataType
        @param {String} extension File type extension.
        @return {String}
    */
    requestDataType : function(suffix)
    {
        var dataType = this.typeExtensions[suffix.toLowerCase()];
        if (typeof dataType === "string")
            return dataType;
        else if (typeof this.defaultDataType === "string")
            return this.defaultDataType;
        return undefined;
    },

    /**
        Returns if this factory can create assets for a given file extension.
        The extension should start with a dot, eg. ".png".

        @method canCreate
        @param {String} extension File type extension.
        @return {Boolean}
    */
    canCreate : function(assetRef)
    {
        if (this.typeExtensions === undefined || this.typeExtensions === null)
            return false;

        var assetRefLower = assetRef.toLowerCase();
        var supportedSuffixes = Object.keys(this.typeExtensions);
        for (var i=0, len=supportedSuffixes.length; i<len; ++i)
        {
            if (CoreStringUtils.endsWith(assetRef, supportedSuffixes[i]))
                return true;
        }
        return false;
    },

    /**
        Returns a new empty asset for the given assetRef. Null if cannot be created.

        @method createEmptyAsset
        @param {String} assetRef Asset reference for the new asset.
        @return {IAsset|null}
    */
    createEmptyAsset : function(assetRef)
    {
        var asset = new this.assetClass(assetRef);
        this.emptyAssetCreated(asset);
        return asset;
    },

    /**
        Called when a new asset is created. You can implement your own AssetFactory and
        override this function to get notificatin each time a new asset has been created.

        @method emptyAssetCreated
        @param {IAsset} asset Created asset.
    */
    emptyAssetCreated : function(asset)
    {
    }
});

return AssetFactory;

}); // require js
