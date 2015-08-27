
define([
    "lib/classy",
    "core/framework/Tundra",
    "core/framework/TundraLogging",
    "core/framework/CoreStringUtils"
    ], function(Class, Tundra, TundraLogging, CoreStringUtils) {

var IHttpProxyResolver = Class.$extend(
/** @lends IHttpProxyResolver.prototype */
{
    /**
        Http proxy resolvers responsibility is to provide proxy URL for HTTP assets.
        This interface is used by AssetAPI to request a proxy URL for http assets.

        The internal implementation should know where the http proxy service is running
        and its API to request assets from. This can include doing asset conversions on the fly.

        @constructs
        @param {String} name
        @param {String} proxyUrl Proxy base URL.
        @param {Boolean} [isLocalhost] If the server is running locally.

        * @example
        * var assetRef = "http://some.site.com/my.mesh"
        * var assetType = "Mesh";
        * if (Tundra.AssetAPI.httpProxyResolver !== undefined)
        * {
        *     console.log("Using HTTP proxy resolver: " + Tundra.AssetAPI.httpProxyResolver.name)
        *     var proxyRef = Tundra.AssetAPI.httpProxyResolver.resolve(assetRef, assetType);
        *
        *     // What this prints depends on the implentation, it can be undefined too if
        *     // the implementation does not support this asset type.
        *     // For example: http://my.proxy.com/assets?assetRef=http://some.site.com/my.mesh&convert=.mesh.xml
        *     console.log(proxyRef);
        * }
    */
    __init__ : function(name, proxyUrl, isLocalhost)
    {
        this.log = TundraLogging.getLogger(name);

        /**
            Resolver implementation name
            @var {String}
        */
        this.name = name;
        /**
            Proxy URL. Has a guaranteed trailing forward slash.
            @var {String}
        */
        this.proxyUrl = undefined;
        /**
            If this proxy is running on localhost.
            @var {Boolean}
        */
        this.localhost = (typeof isLocalhost === "boolean" ? isLocalhost : false);

        this.setProxy(proxyUrl);
    },

    /**
        Can be used to set the proxy URL during runtime.
        The proxyUrl property is guaranteed to have a trailing slash after this call.

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

        @param {Object} proxyMetadata Proxy can populate any data to this metadata object.
        @param {String} assetRef Asset reference
        @param {String} assetType Asset type
        @param {String} assetExtension Asset extension prefixed with "." eg. .png
        This can be ignored by the proxy implementation as long as it requests the asset in a format that can be loaded by AssetAPI.
        @return {String|undefined} Proxy URL if this asset ref and type can be fetched from the implementations proxy. Otherwise 'undefined'.
    */
    resolve : function(proxyMetadata, assetRef, assetType, assetExtension)
    {
        Tundra.client.logError("[IHttpProxyResolver]: resolve() function not overridden by implementation " + this.name)
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

        @param {AssetTransfer} transfer Asset transfer object making that is executing this function.
        @param {String} proxyRef Full resolved proxy ref that was produced by resolve() earlier.
        @return {Object} With properties 'timeout' and 'dataType'.

        * @example
        * // Returned object should have the following properties.
        * {
        *     // HTTP request timeout in milliseconds
        *     timeout  : <Number>,
        *     // HTTP request data type as string or undefined.
        *     dataType : <String or undefined>
        * }
    */
    resolveRequestMetadata : function(transfer, proxyRef)
    {
        Tundra.client.logError("[IHttpProxyResolver]: resolveRequestMetadata() function not overridden by implementation " + this.name)
        return undefined;
    }
});

return IHttpProxyResolver;

}); // require js
