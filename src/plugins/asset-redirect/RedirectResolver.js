
define([
        "core/framework/TundraSDK",
        "core/framework/CoreStringUtils",
        "core/asset/IHttpProxyResolver",
    ], function(TundraSDK, CoreStringUtils, IHttpProxyResolver) {

/**
    @class RedirectResolver
    @extends IHttpProxyResolver
    @constructor
*/
var RedirectResolver = IHttpProxyResolver.$extend(
{
    __init__ : function()
    {
        this.$super("RedirectResolver");
        this.framework = TundraSDK.framework;

        this.typeSwaps = {};
    },

    /// IHttpProxyResolver override.
    resolve : function(assetRef, assetType)
    {
        // This returns a lowercased with prefix dot which
        // is what we have in the typeSwaps map.
        var fromExt = CoreStringUtils.extension(assetRef);
        var toExt = this.typeSwaps[fromExt];
        if (typeof toExt === "string")
            return assetRef.substring(0, assetRef.length - fromExt.length) + toExt;
        // Undefined will request the asset from the original assetRef.
        return undefined;
    },

    /// IHttpProxyResolver override.
    resolveRequestMetadata : function(transfer, proxyRef)
    {
        // Returning undefined will use AssetAPI, AssetTransfer
        // and AssetFactory to resolve the metadata. This is ok
        // as we know there is an actual AssetFactory behind our swap logic.
        return undefined;
    }
});

return RedirectResolver;

}); // require js
