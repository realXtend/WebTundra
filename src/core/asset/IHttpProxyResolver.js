
define([
    "lib/classy",
    "core/framework/TundraSDK",
    "core/framework/CoreStringUtils"
    ], function(Class, TundraSDK, CoreStringUtils) {

/**
    Http proxy resolvers responsibility is to provide proxy URL for HTTP assets.
    This interface is used by AssetAPI to request a proxy URL for http assets.

    The internal implementation should know where the http proxy service is running
    and its API to request assets from. This can include doing asset conversions on the fly.

    @example
        var assetRef = "http://some.site.com/my.mesh"
        var assetType = "Mesh";
        if (TundraSDK.AssetAPI.httpProxyResolver !== undefined)
        {
            console.log("Using HTTP proxy resolver: " + TundraSDK.AssetAPI.httpProxyResolver.name)
            var proxyRef = TundraSDK.AssetAPI.httpProxyResolver.resolve(assetRef, assetType);

            // What this prints depends on the implentation, it can be undefined too if
            // the implementation does not support this asset type.
            // For example: http://my.proxy.com/assets?assetRef=http://some.site.com/my.mesh&convert=.mesh.xml
            console.log(proxyRef);
        }

    @class IHttpProxyResolver
    @constructor
    @param {String} name Descriptive resolver name
*/
var IHttpProxyResolver = Class.$extend(
{
    __init__ : function(name, proxyUrl)
    {
        /**
            Resolver implementation name
            @property name
            @type String
        */
        this.name = name;

        /**
            Proxy URL. Has a guaranteed trailing forward slash.
            @property proxyUrl
            @type String
        */
        this.proxyUrl = undefined;

        this.setProxy(proxyUrl);
    },

    /**
        Can be used to set the proxy URL during runtime.
        The proxyUrl property is guaranteed to have a trailing slash after this call.

        @method setProxy
        @param {String} proxyUrl Proxy URL.
    */
    setProxy : function(proxyUrl)
    {
        if (proxyUrl === "")
            proxyUrl = undefined;

        this.proxyUrl = proxyUrl;

        if (typeof this.proxyUrl === "string" && this.proxyUrl !== "")
        {
            if (!CoreStringUtils.startsWith(this.proxyUrl, "http", true))
                this.proxyUrl = "http://" + this.proxyUrl;
            if (!CoreStringUtils.endsWith(this.proxyUrl, "/"))
                this.proxyUrl += "/";
        }
    },

    /**
        Returns proxy url for this implementation where the asset can be fetched. Return undefined if assetRef is not supported.

        IHttpProxyResolver implementation must override this function, base implementation always returns undefined.

        @method resolve
        @param {String} assetRef Asset reference
        @param {String} assetType Asset type
        This can be ignored by the proxy implementation as long as it requests the asset in a format that can be loaded by AssetAPI.
        @return {String|undefined} Proxy URL if this asset ref and type can be fetched from the implementations proxy. Otherwise 'undefined'.
    */
    resolve : function(assetRef, assetType)
    {
        TundraSDK.framework.client.logError("[IHttpProxyResolver]: resolve() function not overridden by implementation " + this.name)
        return undefined
    },

    /**
        Returns data type of the request done to proxyRef. Valid 'dataType' property values are "text", "xml", "arraybuffer" or undefined.
        Return undefined if you wish AssetTransfer to auto detect the data type from the asset type and its request suffix
        (desiredAssetTypeSuffix passed into resolve() earlier).

        The 'timeout' property should be set to number of milliseconds the HTTP transfer should fail after. This is queried from the
        proxy implementation as its the only entity that knows if data conversion will happen on the server. The data conversion may
        take a long time, so this is the proxys change to make timout larger. If 'timeout' is not type of 'number' AssetTransfer will
        use default timeout of 10 seconds.

        IHttpProxyResolver implementation must override this function, base implementation always returns undefined which
        will break asset loading by design so you can detect the bug.

        @example
            // Returned object should have the following properties.
            {
                // HTTP request timeout in milliseconds
                timeout  : <Number>,
                // HTTP request data type as string or undefined.
                dataType : <String or undefined>
            }

        @method resolveRequestMetadata
        @param {AssetTransfer} transfer Asset transfer object making that is executing this function.
        @param {String} proxyRef Full resolved proxy ref that was produced by resolve() earlier.
        @return {Object} With properties 'timeout' and 'dataType'.
    */
    resolveRequestMetadata : function(transfer, proxyRef)
    {
        TundraSDK.framework.client.logError("[IHttpProxyResolver]: resolveRequestMetadata() function not overridden by implementation " + this.name)
        return undefined;
    }
});

return IHttpProxyResolver;

}); // require js
