
define([
        "core/framework/TundraSDK",
        "core/framework/ITundraPlugin",
        "core/framework/CoreStringUtils",
        "core/asset/AssetAPI",
        "plugins/asset-redirect/RedirectResolver"
    ], function(TundraSDK, ITundraPlugin, CoreStringUtils, AssetAPI, RedirectResolver) {

/**
    This plugin provides a IHttpProxyResolver implementation that can be configured
    to redirect and change asset requests.

    Use cases where this plugin will be useful to you

    1) You want to fetch relative asset references from a custom host and optionally path.
       For example: "assets/texture.png" -> "http://my.custom.com/my/path/assets/texture.png"
    2) You want to swap asset extensions during runtime in a clean manner.
       For example: "my-mesh.mesh" -> "my-mesh.json"

    @example
        // todo

    @class AssetRedirectPlugin
    @extends ITundraPlugin
    @constructor
*/
var AssetRedirectPlugin = ITundraPlugin.$extend(
{
    __init__ : function()
    {
        this.$super("AssetRedirectPlugin");
        
        this._enabled = true;
        this._defaultStorage = null;
        this.resolver = new RedirectResolver();

        /**
            If asset redirect is enabled.
            @property enabled
            @type Boolean
            @default true
        */
        Object.defineProperties(this, {
            enabled : {
                get : function ()      { return this._enabled; },
                set : function (value) { this.setEnabled(value); }
            },
        });
    },

    initialize : function()
    {
        if (this.enabled)
            AssetAPI.setHttpProxyResolver(this.resolver);
    },

    setEnabled : function(enabled)
    {
        if (typeof enabled !== "boolean")
            enabled = true;
        if (this._enabled === enabled)
            return;
        this._enabled = enabled;
        AssetAPI.setHttpProxyResolver(this._enabled ? this.resolver : null);
    },

    /**
        Setups a custom default storage that will override the server sent default storage.
        This is useful if you are going to receive relative asset references from the server
        and would like to fetch them from a custom host+path or the current pages parent directory.

        If you would like to use the current pages host and parent directory, don't pass 
        any parameters to the invocation.

        @method setupDefaultStorage
        @param {String} [path] Optional path. Defaults to (parent) directory of window.location.pathname
        @param {String} [host] Optional host. Defaults to window.location.protocol + "//" + window.location.host
        @return {Boolean} If registration succeeded.
    */
    setupDefaultStorage : function(path, host)
    {
        if (this.framework.asset == null)
        {
            this.log.error("setupDefaultStorage: AssetAPI not initialized yet. Call after TundraClient has been created.");
            return false;
        }
        if (path === "") path = undefined;
        if (host === "") host = undefined;

        // Host
        host = host || (window.location.protocol + "//" + window.location.host);
        if (!CoreStringUtils.startsWith(host, "http"))
            host = "http://" + host;
        if (CoreStringUtils.endsWith(host, "/"))
            host = host.substring(0, host.length-1);
        // Path
        if (typeof path === "string")
        {
            if (!CoreStringUtils.startsWith(host, "/"))
                path = "/" + path;
        }
        else
        {
            // Use the current pages path directory
            path = window.location.pathname;
            if (!CoreStringUtils.endsWith(path, "/"))
                path = path.substring(0, path.lastIndexOf("/") + 1);
        }
        // Combine
        this._defaultStorage = host + path;
        if (!CoreStringUtils.endsWith(this._defaultStorage, "/"))
            this._defaultStorage += "/";
        this.log.debug("Default storage set to:", this._defaultStorage);
        this.framework.asset.handleDefaultStorage = this.handleDefaultStorageOverride.bind(this);
        return true;
    },

    handleDefaultStorageOverride : function(storageStr)
    {
        var temp = JSON.parse(storageStr);
        if (typeof this._defaultStorage === "string")
        {
            this.framework.asset.defaultStorage =
            {
                default : true,
                name    : "AssetRedirectPluginOverride",
                src     : this._defaultStorage,
                type    : "HttpAssetStorage"
            };
            this.log.debug("Overriding server sent default storage '" + temp.storage.src + "' with '" + this._defaultStorage + "'");
        }
        else
            this.framework.asset.defaultStorage = temp.storage;
    },

    /**
        Registers a asset type swap.

        1) Append the swapped extension to a existing factory.
           Otherwise the request never ends up to our RedirectResolver.

        2) Registers the type extension swap to our RedirectResolver
           to fetch the resource with a new extension.

        @method registerAssetTypeSwap
        @param {String} fromExtension Extension you want to swap eg. ".mesh"
        @param {String} toExtension Asset type extension you want to fetch instead eg. ".json"
        @param {String} toAssetType Asset type name. This must have a existing registered AssetFactory.
        @param {String} [requestDataType] Network request data type. If not provided the
        target factory default will be used.
        @return {Boolean} If registration succeeded.
    */
    registerAssetTypeSwap : function(fromExtension, toExtension, toAssetType, requestDataType)
    {
        if (this.framework.asset == null)
        {
            this.log.error("registerAssetTypeSwap: AssetAPI not initialized yet. Call after TundraClient has been created.");
            return false;
        }
        if (typeof fromExtension !== "string" || fromExtension === "")
        {
            this.log.error("registerAssetTypeSwap: Invalid 'fromExtension':", fromExtension);
            return false;
        }
        else if (typeof toExtension !== "string" || toExtension === "")
        {
            this.log.error("registerAssetTypeSwap: Invalid 'toExtension':", toExtension);
            return false;
        }

        if (fromExtension[0] !== ".") fromExtension = "." + fromExtension;
        if (toExtension[0] !== ".") toExtension = "." + toExtension;
        fromExtension = fromExtension.toLowerCase();
        toExtension = toExtension.toLowerCase();

        var toFactory = this.framework.asset.getAssetFactory(undefined, toAssetType);
        if (toFactory === null)
        {
            this.log.error("registerAssetTypeSwap: AssetFactory not found for '" + toAssetType + "' asset type!");
            return false;
        }
        // If already registered this grants a warning
        if (toFactory.canCreate("fake" + fromExtension))
        {
            this.log.warn("registerAssetTypeSwap: Extension '" + fromExtension + "' already supported by AssetFactory of", toFactory.assetType);
            return false;
        }

        toFactory.typeExtensions[fromExtension] = requestDataType;
        this.resolver.typeSwaps[fromExtension] = toExtension;
        this.log.debug("Registered type swap from", fromExtension, "to", toExtension, "with AssetFactory", toFactory.assetType);
        return true;
    }
});

TundraSDK.registerPlugin(new AssetRedirectPlugin());

return AssetRedirectPlugin;

}); // require js
