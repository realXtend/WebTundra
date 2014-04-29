
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/asset/IAsset"
    ], function(Class, TundraSDK, TundraLogging, IAsset) {

/**
    Asset transfer represents an web asset transfer operation.

    @class AssetTransfer
    @constructor
*/
var AssetTransfer = Class.$extend(
{
    __init__ : function(factory, ref, proxyRef, type, suffix)
    {
        this.log = TundraLogging.getLogger("AssetTransfer");

        /**
            Factory that will produce this asset.
            @property factory
            @type AssetFactory
        */
        this.factory = factory;
        /**
            Full unique asset reference.
            @property ref
            @type String
        */
        this.ref = ref;
        /**
            HTTP asset proxy request URL. 'undefined' if not fetched from a proxy.
            @property proxyRef
            @type String
        */
        this.proxyRef = proxyRef;
        /**
            Asset type.
            @property type
            @type String
        */
        this.type = type;
        /**
            Requests file suffix.
            @property suffix
            @type String
        */
        this.suffix = suffix;
        /**
            Request data type for the HTTP GET, if null lets the browser auto detect.
            Possible values are "text", "xml", "arraybuffer" or null.
            @property requestDataType
            @type String
        */
        this.requestDataType = undefined;
        /**
            Request timeout. The request will assume to have failed after this time once sent.
            @property requestTimeout
            @type Number
        */
        this.requestTimeout = 10000;
        /**
            True if this transfer is active aka fetching resource from the source.
            @property active
            @type Boolean
        */
        this.active = false;
        /**
            True if this transfer has finished, but the asset is still loading itself.
            This can happen if the asset has dependencies it needs to fetch before/during loading.
            @property loading
            @type Boolean
        */
        this.loading = false;
        /**
            If this asset is aborted. When true the callbacks waiting for this transfer
            to finish won't be invoked once the web request finishes.
            or loading the response data into a IAsset.
            @property active
            @type Boolean
        */
        this.aborted = false;
        /**
            Parent assets that depend on the current transfer of this asset.
            @property parentAssets
            @type IAsset
        */
        this.parentAssets = [];

        // Private, don't doc.
        this.subscribers = [];
        this.subscriptions = [];
    },

    __classvars__ :
    {
        completedFired : {},

        reset : function()
        {
            AssetTransfer.completedFired = {};
        },

        HttpStatus :
        {
            // Informational 1xx
            CONTINUE            : 100,
            SWITCHING_PROTOCOLS : 101,

            // Successful 2xx
            OK                              : 200,
            CREATED                         : 201,
            ACCEPTED                        : 202,
            NON_AUTHORITATIVE_INFORMATION   : 203,
            NO_CONTENT                      : 204,
            RESET_CONTENT                   : 205,
            PARTIAL_CONTENT                 : 206,

            // Redirection 3xx
            MULTIPLE_CHOICES                : 300,
            MOVED_PERMANENTLY               : 301,
            FOUND                           : 302,
            SEE_OTHER                       : 303,
            NOT_MODIFIED                    : 304,
            USE_PROXY                       : 305,
            TEMPORARY_REDIRECT              : 307,

            // Client Error 4xx
            BAD_REQUEST                     : 400,
            UNAUTHORIZED                    : 401,
            PAYMENT_REQUIRED                : 402,
            FORBIDDEN                       : 403,
            NOT_FOUND                       : 404,
            METHOD_NOT_ALLOWED              : 405,
            NOT_ACCEPTABLE                  : 406,
            PROXY_AUTHENTICATION_REQUIRED   : 407,
            REQUEST_TIMEOUT                 : 408,
            CONFLICT                        : 409,
            GONE                            : 410,
            LENGTH_REQUIRED                 : 411,
            PRECONDITION_FAILED             : 412,
            REQUEST_ENTITY_TOO_LARGE        : 413,
            REQUEST_URI_TOO_LONG            : 414,
            UNSUPPORTED_MEDIA_TYPE          : 415,
            REQUEST_RANGE_NOT_SATISFIABLE   : 416,
            EXPECTATION_FAILED              : 417,

            // Server Error 5xx
            INTERNAL_SERVER_ERROR           : 500,
            NOT_IMPLEMENTED                 : 501,
            BAD_GATEWAY                     : 502,
            SERVICE_UNAVAILABLE             : 503,
            GATEWAY_TIMEOUT                 : 504,
            HTTP_VERSION_NOT_SUPPORTED      : 505
        },

        statusCodeName : function(statusCode)
        {
            switch(statusCode)
            {
                case this.HttpStatus.CONTINUE: return "Continue";
                case this.HttpStatus.SWITCHING_PROTOCOLS: return "Switching Protocols";
                case this.HttpStatus.OK: return "OK";
                case this.HttpStatus.CREATED: return "Created";
                case this.HttpStatus.ACCEPTED: return "Accepted";
                case this.HttpStatus.NON_AUTHORITATIVE_INFORMATION: return "Non Authoritative Information";
                case this.HttpStatus.NO_CONTENT: return "No Content";
                case this.HttpStatus.RESET_CONTENT: return "Reset Content";
                case this.HttpStatus.PARTIAL_CONTENT: return "Partial Content";
                case this.HttpStatus.MULTIPLE_CHOICES: return "Multiple Choices";
                case this.HttpStatus.MOVED_PERMANENTLY: return "Moved Permanently";
                case this.HttpStatus.FOUND: return "Found";
                case this.HttpStatus.SEE_OTHER: return "See Other";
                case this.HttpStatus.NOT_MODIFIED: return "Not Modified";
                case this.HttpStatus.USE_PROXY: return "Use Proxy";
                case this.HttpStatus.TEMPORARY_REDIRECT: return "Temporary Redirect";
                case this.HttpStatus.BAD_REQUEST: return "Bad Request";
                case this.HttpStatus.UNAUTHORIZED: return "Unauthorized";
                case this.HttpStatus.PAYMENT_REQUIRED: return "Payment Required";
                case this.HttpStatus.FORBIDDEN: return "Forbidden";
                case this.HttpStatus.NOT_FOUND: return "Not Found";
                case this.HttpStatus.METHOD_NOT_ALLOWED: return "Method Not Allowed";
                case this.HttpStatus.NOT_ACCEPTABLE: return "Not Acceptable";
                case this.HttpStatus.PROXY_AUTHENTICATION_REQUIRED: return "Proxy Authentication Required";
                case this.HttpStatus.REQUEST_TIMEOUT: return "Request Timeout";
                case this.HttpStatus.CONFLICT: return "Conflict";
                case this.HttpStatus.GONE: return "Gone";
                case this.HttpStatus.LENGTH_REQUIRED: return "Length Required";
                case this.HttpStatus.PRECONDITION_FAILED: return "Precondition Failed";
                case this.HttpStatus.REQUEST_ENTITY_TOO_LARGE: return "Request Rntity Too Large";
                case this.HttpStatus.REQUEST_URI_TOO_LONG: return "Request Uri Too Long";
                case this.HttpStatus.UNSUPPORTED_MEDIA_TYPE: return "Unsupported Media Type";
                case this.HttpStatus.REQUEST_RANGE_NOT_SATISFIABLE: return "Request Range Not Satisfiable";
                case this.HttpStatus.EXPECTATION_FAILED: return "Expectation Failed";
                case this.HttpStatus.INTERNAL_SERVER_ERROR: return "Internal Server Error";
                case this.HttpStatus.NOT_IMPLEMENTED: return "Not Implemented";
                case this.HttpStatus.BAD_GATEWAY: return "Bad Gateway";
                case this.HttpStatus.SERVICE_UNAVAILABLE: return "Service Unavailable";
                case this.HttpStatus.GATEWAY_TIMEOUT: return "Gateway Timeout";
                case this.HttpStatus.HTTP_VERSION_NOT_SUPPORTED: return "Http Version Not Supported";
                case 0: return ""; // Request timeout
                default:
                    return "Unknown HTTP status code " + statusCode;
            }
        },

        isHttpSuccess : function(statusCode)
        {
            // For asset transfers the following are errors
            // this.HttpStatus.NO_CONTENT
            // this.HttpStatus.PARTIAL_CONTENT
            switch (statusCode)
            {
                case this.HttpStatus.OK:
                case this.HttpStatus.CREATED:
                case this.HttpStatus.ACCEPTED:
                case this.HttpStatus.NOT_MODIFIED:
                    return true;
                default:
                    return false;
            }
        }
    },

    toString : function()
    {
        return "ref = " + this.ref + " type = " + this.type + " suffix = " + this.suffix + " dataType = " + this.requestDataType;
    },

    /**
        Aborts the transfer, in that it wont handle any request response data.
        For internal use of AssetAPI.
    */
    abort : function()
    {
        this.aborted = true;
    },

    /**
        Adds a parent asset for this transfer if not already added.

        @method addParentAsset
        @param {IAsset} asset Parent asset that depends on this transfer.
    */
    addParentAsset : function(asset)
    {
        if (!(asset instanceof IAsset))
        {
            this.log.error("addParentAsset called with non IAsset object:", asset);
            return;
        }
        for (var i = 0; i < this.parentAssets.length; i++)
            if (this.parentAssets[i].name === asset.name)
                return;
        this.parentAssets.push(asset);
    },

    /**
        Registers a callback for asset transfer and asset load completion.

        @example
            var myContext = { name : "MyContextObject", meshAsset : null, textAsset : null };

            // Passing in metadata for the callback.
            var transfer = TundraSDK.framework.asset.requestAsset("http://www.my-assets.com/meshes/my.mesh");
            if (transfer != null)
            {
                // You can give custom metadata that will be sent to you on completion.
                transfer.onCompleted(myContext, function(asset, metadata) {
                    this.meshAsset = asset;       // this === the given context, in this case 'myContext'
                    console.log("Mesh loaded:", asset.name);
                    console.log("My metadata: ", metadata);
                }, { id : 14, name : "my mesh"}); // This object is the metadata
            }
            // Forcing an asset type for a request.
            transfer = TundraSDK.framework.asset.requestAsset("http://www.my-assets.com/data/my.json", "Text");
            if (transfer != null)
            {
                transfer.onCompleted(myContext, function(asset) {
                    this.textAsset = asset;              // this === the given context, in this case 'myContext'
                    console.log(JSON.parse(asset.data)); // "Text" forced TextAsset type
                });
                transfer.onFailed(myContext, function(transfer, reason, metadata) {
                    console.log("Failed to fetch my json from", transfer.ref, "into", this.name); // this.name === "MyContextObject"
                    console.log("Reason:", + reason);
                    console.log("Metadata id:", metadata); // metadata === 12345
                }, 12345);
            }

        @method onCompleted
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @param {Object} [metadata=undefined] Metadata you want to receive into the callback.
    */
    onCompleted : function(context, callback, metadata)
    {
        this.subscribers.push({
            "type"     : "completed",
            "context"  : context,
            "callback" : callback,
            "metadata" : metadata
        });
    },

    /**
        Registers a callback for asset transfer and asset load completion.

        @example
            var transfer = TundraSDK.framework.asset.requestAsset("http://www.my-assets.com/meshes/my.mesh");
            if (transfer != null)
            {
                transfer.onFailed(null, function(transfer, reason, metadata) {
                    console.log("Failed to fetch my json from", transfer.ref);
                    console.log("Reason:", + reason);
                    console.log("Metadata id:", metadata); // metadata === 12345
                }, 12345);
            }

        @method onFailed
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @param {Object} [metadata=undefined] Metadata you want to receive into the callback.
    */
    onFailed : function(context, callback, metadata)
    {
        this.subscribers.push({
            "type"     : "failed",
            "context"  : context,
            "callback" : callback,
            "metadata" : metadata
        });
    },

    _detectRequestDataType : function()
    {
        var dataType = (this.factory != null ? this.factory.requestDataType(this.suffix) : undefined);
        if (typeof dataType === "string")
            return dataType;

        this.log.warn("AssetFactory for", this.ref, "failed to return data type. Guessing from known types.");

        /** @todo Take an educated guess with type and suffix.
            There should be logic to ask the request data type either 
            from the AssetFactory or the IAsset class it instantiates.
            And/or have option to override the data type in AssetAPI.RequestAsset. */
        if (this.type === "Binary")
            return "arraybuffer";
        else if (this.type === "Text" && this.suffix === ".xml" || this.suffix === ".txml")
            return "xml";
        else if (this.type === "Text" && this.suffix === ".html" || this.suffix === ".html")
            return "document";
        else if (this.type === "Text" && this.suffix === ".json")
            return "json";
        else if (this.type === "Text")
            return "text";
        return undefined;
    },

    _send : function()
    {
        if (this.active === true)
        {
            this.log.error("Transfer is already active, refusing to re-send:", this.ref);
            return;
        }
        this.active = true;

        // If proxy has been set ask it for the data type. We cannot assume it from
        // the asset ref suffix as binary <-> text conversions can occur in the proxy.
        // Proxy also needs to tell us what is the appropriate request timeout.
        if (this.proxyRef !== undefined && TundraSDK.framework.asset.getHttpProxyResolver() !== undefined)
        {
             var transferMetadata = TundraSDK.framework.asset.getHttpProxyResolver().resolveRequestMetadata(this, this.proxyRef);
             if (transferMetadata !== undefined)
             {
                 this.requestDataType = (typeof transferMetadata.dataType === "string" ? transferMetadata.dataType : undefined);
                 this.requestTimeout = (typeof transferMetadata.timeout === "number" ? transferMetadata.timeout : this.requestTimeout);
             }
        }
        if (this.requestDataType === undefined  || this.requestDataType === null || this.requestDataType === "")
            this.requestDataType = this._detectRequestDataType();

        if (this.requestDataType !== "arraybuffer" && this.requestDataType !== "document")
        {
            $.ajax({
                type        : "GET",
                timeout     : this.requestTimeout,
                url         : (this.proxyRef !== undefined ? this.proxyRef : this.ref),
                dataType    : this.requestDataType,
                context     : this,
                success     : this._onTransferCompleted,
                error       : this._onTransferFailed
            });
        }
        else
        {
            var xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.open("GET", (this.proxyRef !== undefined ? this.proxyRef : this.ref), true);
            xmlHttpRequest.responseType = this.requestDataType;
            xmlHttpRequest.timeout = this.requestTimeout;

            xmlHttpRequest.addEventListener("load", this._onTransferCompletedBinary.bind(this), false);
            xmlHttpRequest.addEventListener("timeout", this._onTransferFailedBinary.bind(this), false);
            xmlHttpRequest.addEventListener("error", this._onTransferFailedBinary.bind(this), false);

            xmlHttpRequest.send(null);
        }
    },

    _handleHttpErrors : function(statusCode)
    {
        if (AssetTransfer.isHttpSuccess(statusCode))
            return false;

        TundraSDK.framework.asset.assetTransferFailed(this, "Request failed " + this.ref + ": " +
            statusCode + " " + AssetTransfer.statusCodeName(statusCode));
        return true;
    },

    _onTransferCompleted : function(data, textStatus, jqXHR)
    {
        if (this.aborted === true)
            return;

        if (this._handleHttpErrors(jqXHR.status))
            return;

        this._loadAssetFromData(data);

        // Cleanup
        jqXHR.responseText = null;
        jqXHR.responseXml = null;
        delete jqXHR; jqXHR = null;
        delete data; data = null;
    },

    _onTransferCompletedBinary : function(event)
    {
        if (this.aborted === true)
            return;

        // Proxy asked us to wait?
        var request = event.currentTarget;

        if (this._handleHttpErrors(request.status))
            return;

        this._loadAssetFromData(request.response);

        // Cleanup
        request.response = null;
        delete request; request = null;
    },

    _onTransferFailed : function(jqXHR, textStatus, errorThrown)
    {
        if (this.aborted === true)
            return;

        TundraSDK.framework.asset.assetTransferFailed(this, "Request failed " + this.ref + ": " +
            (jqXHR.status !== 0 ? jqXHR.status : "Request Timed Out") + " " +
            AssetTransfer.statusCodeName(jqXHR.status) +
            (typeof textStatus === "string" ? " (" + textStatus  + ")": "")
        );

        // Cleanup
        jqXHR.responseText = null;
        jqXHR.responseXml = null;
        delete jqXHR; jqXHR = null;
    },

    _onTransferFailedBinary : function(event)
    {
        if (this.aborted === true)
            return;

        // Proxy asked us to wait?
        var request = event.currentTarget;

        TundraSDK.framework.asset.assetTransferFailed(this, "Request failed " + this.ref + ": " +
            (request.status !== 0 ? request.status : "Request Timed Out") + " " +
            AssetTransfer.statusCodeName(request.status)
        );

        // Cleanup
        request.response = null;
        delete request; request = null;
    },

    _loadAssetFromData : function(data)
    {
        TundraSDK.framework.asset.removeActiveTransfer(this);

        var asset = TundraSDK.framework.asset.createEmptyAsset(this.ref, this.type);
        if (asset == null)
        {
            TundraSDK.framework.asset.assetTransferFailed(this, "Failed to create asset of unknown type '" + this.type + "' for '" + this.ref + "'");
            return;
        }

        try
        {
            this._deserializeFromData(asset, data);
        }
        catch(e)
        {
            TundraSDK.framework.asset.assetTransferFailed(this, "Exception while deserializing asset from data: " + e, true);
            if (e.stack !== undefined)
                console.error(e.stack);
            console.log(this);
        }

        this.active = false;
    },

    _deserializeFromData : function(asset, data)
    {
        var succeeded = asset._deserializeFromData(data, this.requestDataType);

        // Load failed synchronously
        if (!succeeded)
            TundraSDK.framework.asset.assetTransferFailed(this, "IAsset.deserializeFromData failed loading asset " + this.ref);
        // Loaded completed synchronously
        else if (asset.isLoaded())
            this._assetLoadCompleted(asset);
        // Load did not fail or complete yet: The asset is fetching dependencies etc.
        else
        {
            this.loading = true;
            this.subscriptions.push(asset.onLoaded(this, this._assetLoadCompleted));
            this.subscriptions.push(asset.onDependencyFailed(this, this._assetDependencyFailed));
        }
    },

    _assetLoadCompleted : function(asset)
    {
        this.loading = false;
        TundraSDK.framework.asset.assetTransferCompleted(this, asset);
    },

    _assetDependencyFailed : function(dependencyRef)
    {
        this.loading = false;
        TundraSDK.framework.asset.assetTransferFailed(this, "Asset request failed: " + this.ref +
            ". Dependency " + dependencyRef + " could not be loaded.");
    },

    _emitCompleted : function(asset)
    {
        for (var i = 0; i < this.subscriptions.length; i++)
            TundraSDK.framework.events.unsubscribe(this.subscriptions[i]);
        this.subscriptions = [];

        // Get fired count from static global object.
        // Used to determine if we need to clone certain assets.
        var fired = AssetTransfer.completedFired[asset.name];
        if (fired === undefined)
            fired = 0;

        for (var i=0; i<this.subscribers.length; ++i)
        {
            try
            {
                var subscriber = this.subscribers[i];
                if (subscriber.type !== "completed")
                    continue;

                // Create clone if applicable
                var responseAsset = null;
                if (asset.requiresCloning && fired > 0)
                    responseAsset = asset.clone();
                else
                    responseAsset = asset;

                fired++; // Increment before for potential exception

                // If context was not provided use this AssetTransfer as the context.
                subscriber.callback.call((subscriber.context !== undefined && subscriber.context !== null ? subscriber.context : this),
                        responseAsset, subscriber.metadata);
            }
            catch(e)
            {
                TundraSDK.framework.client.logError("[AssetTransfer]: Completed handler exception: " + e, true);
                if (e.stack !== undefined)
                    console.error(e.stack);
            }
        }
        AssetTransfer.completedFired[asset.name] = fired;
        this.subscribers = [];
    },

    _emitFailed : function(reason)
    {
        for (var i = 0; i < this.subscriptions.length; i++)
            TundraSDK.framework.events.unsubscribe(this.subscriptions[i]);
        this.subscriptions = [];

        for (var i=0; i<this.subscribers.length; ++i)
        {
            try
            {
                var subscriber = this.subscribers[i];
                if (subscriber.type !== "failed")
                    continue;

                // If context was not provided use this AssetTransfer as the context.
                subscriber.callback.call((subscriber.context !== undefined && subscriber.context !== null ? subscriber.context : this),
                    this, reason, subscriber.metadata);
            }
            catch(e)
            {
                TundraSDK.framework.client.logError("[AssetTransfer]: Failed handler exception: " + e, true);
            }
        }
        this.subscribers = [];
    }
});

return AssetTransfer;

}); // require js
