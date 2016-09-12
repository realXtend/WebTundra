
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/asset/IAsset"
    ], function(Class, Tundra, TundraLogging, IAsset) {


var AssetTransfer = Class.$extend(
/** @lends AssetTransfer.prototype */
{
    /**
        Asset transfer represents an web asset transfer operation.

        @constructs
        @param {AssetFactory} factory
        @param {String} ref
        @param {String} proxyRef
        @param {String} type
        @param {String} suffix
    */
    __init__ : function(factory, ref, proxyRef, type, suffix)
    {
        /**
            Factory that will produce this asset.
            @var {AssetFactory}
        */
        this.factory = factory;
        /**
            Full unique asset reference.
            @var {String}
        */
        this.ref = ref;
        /**
            HTTP asset proxy request URL. 'undefined' if not fetched from a proxy.
            @var {String}
        */
        this.proxyRef = proxyRef;
        /**
            Asset type.
            @var {String}
        */
        this.type = type;
        /**
            Requests file suffix.
            @var {String}
        */
        this.suffix = suffix;
        /**
            Request data type for the HTTP GET, if null lets the browser auto detect.
            Possible values are "text", "xml", "arraybuffer" or null.
            @var {String}
        */
        this.requestDataType = undefined;
        /**
            Request timeout. The request will assume to have failed after this time once sent.
            @var {Number}
        */
        this.requestTimeout = 10000;
        /**
            True if this transfer is active aka fetching resource from the source.
            @var {Boolean}
        */
        this.active = false;
        /**
            True if this transfer has finished, but the asset is still loading itself.
            This can happen if the asset has dependencies it needs to fetch before/during loading.
            @var {Boolean}
        */
        this.loading = false;
        /**
            If this asset is aborted. When true the callbacks waiting for this transfer
            to finish won't be invoked once the web request finishes.
            or loading the response data into a IAsset.
            @var {Boolean}
        */
        this.aborted = false;
        /**
            If error logging should be suppressed on error responses.
            @var {Boolean}
        */
        this.silent = false;
        /**
            Parent assets that depend on the current transfer of this asset.
            @var {IAsset}
        */
        this.parentAssets = [];
        /**
            HTTP response status code.
            @var {Number}
        */
        this.httpStatusCode = -1;

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

        /**
            @static
            @readonly
            @enum {Number}
        */
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

        /**
            Returns a corresponding status code text for status code

            @static
            @param {Number} statusCode
            @return {String}
        */
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

        /**
            Returns if status code is a success.
            @param {Number} statusCode
            @return {Boolean}
        */
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

    /**
        @return {String}
    */
    toString : function()
    {
        return "ref = " + this.ref + " type = " + this.type + " suffix = " + this.suffix + " dataType = " + this.requestDataType;
    },

    /**
        @param {AssetTransfer} transfer
        @return {Boolean}
    */
    equals : function(transfer)
    {
        // @todo We need some kind of running number or a uuid to get something unique.
        if (!transfer || !transfer.ref)
            return;

        return (this.ref === transfer.ref && this.proxyRef === transfer.proxyRef && this.type === transfer.type);
    },

    /**
        Aborts the transfer, in that it wont handle any request response data.
        For internal use of AssetAPI.
    */
    abort : function()
    {
        if (this.aborted === true)
            return;
        this.aborted = true;

        // @hox Should _emitFailed be called?!
        Tundra.asset.removeTransfer(this);

        // Abort if in flight
        if (this._ajax !== undefined && typeof this._ajax.abort === "function")
        {
            this._ajax.abort();
            this._ajax = undefined;
        }
    },

    /**
        Adds a parent asset for this transfer if not already added.

        @param {IAsset} asset Parent asset that depends on this transfer.
    */
    addParentAsset : function(asset)
    {
        if (!(asset instanceof IAsset))
        {
            TundraLogging.get("AssetTransfer").error("addParentAsset called with non IAsset object:", asset);
            return;
        }
        for (var i = 0; i < this.parentAssets.length; i++)
            if (this.parentAssets[i].name === asset.name)
                return;
        this.parentAssets.push(asset);
    },

    /**
        Registers a callback for asset transfer and asset load completion.

        @subscribes
        @param {Object} [metadata=undefined] Metadata you want to receive into the callback.

        * @example
        * var myContext = { name : "MyContextObject", meshAsset : null, textAsset : null };
        *
        * // Passing in metadata for the callback.
        * var transfer = Tundra.asset.requestAsset("http://www.my-assets.com/meshes/my.mesh");
        * if (transfer != null)
        * {
        *     // You can give custom metadata that will be sent to you on completion.
        *     transfer.onCompleted(myContext, function(asset, metadata) {
        *         this.meshAsset = asset;       // this === the given context, in this case 'myContext'
        *         console.log("Mesh loaded:", asset.name);
        *         console.log("My metadata: ", metadata);
        *     }, { id : 14, name : "my mesh"}); // This object is the metadata
        * }
        * // Forcing an asset type for a request.
        * transfer = Tundra.asset.requestAsset("http://www.my-assets.com/data/my.json", "Text");
        * if (transfer != null)
        * {
        *     transfer.onCompleted(myContext, function(asset) {
        *         this.textAsset = asset;              // this === the given context, in this case 'myContext'
        *         console.log(JSON.parse(asset.data)); // "Text" forced TextAsset type
        *     });
        *     transfer.onFailed(myContext, function(transfer, reason, metadata) {
        *         console.log("Failed to fetch my json from", transfer.ref, "into", this.name); // this.name === "MyContextObject"
        *         console.log("Reason:", + reason);
        *         console.log("Metadata id:", metadata); // metadata === 12345
        *     }, 12345);
        * }
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

        @subscribes
        @param {Object} [metadata=undefined] Metadata you want to receive into the callback.

        * @example
        * var transfer = Tundra.asset.requestAsset("http://www.my-assets.com/meshes/my.mesh");
        * if (transfer != null)
        * {
        *     transfer.onFailed(null, function(transfer, reason, metadata) {
        *         console.log("Failed to fetch my json from", transfer.ref);
        *         console.log("Reason:", + reason);
        *         console.log("Metadata id:", metadata); // metadata === 12345
        *     }, 12345);
        * }
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

        TundraLogging.get("AssetTransfer").warn("AssetFactory for", this.ref, "failed to return data type. Guessing from known types.");

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
            TundraLogging.get("AssetTransfer").error("Transfer is already active, refusing to re-send:", this.ref);
            return;
        }
        this.active = true;

        // If proxy has been set ask it for the data type. We cannot assume it from
        // the asset ref suffix as binary <-> text conversions can occur in the proxy.
        // Proxy also needs to tell us what is the appropriate request timeout.
        if (Tundra.asset.getHttpProxyResolver() !== undefined)
        {
            var transferMetadata = Tundra.asset.getHttpProxyResolver().resolveRequestMetadata(this, this.proxyRef);
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
            this._ajax = $.ajax({
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
            this._ajax = new XMLHttpRequest();
            this._ajax.open("GET", (this.proxyRef !== undefined ? this.proxyRef : this.ref), true);
            this._ajax.responseType = this.requestDataType;
            this._ajax.timeout = this.requestTimeout;

            this._ajax.addEventListener("load", this._onTransferCompletedBinary.bind(this), false);
            this._ajax.addEventListener("timeout", this._onTransferFailedBinary.bind(this), false);
            this._ajax.addEventListener("error", this._onTransferFailedBinary.bind(this), false);

            this._ajax.send(null);
        }
    },

    _handleHttpErrors : function(statusCode)
    {
        if (AssetTransfer.isHttpSuccess(statusCode))
            return false;

        Tundra.asset.assetTransferFailed(this, "Request failed " + this.ref + ": " +
            statusCode + " " + AssetTransfer.statusCodeName(statusCode));
        return true;
    },

    _onTransferCompleted : function(data, textStatus, jqXHR)
    {
        if (this.aborted === true)
            return;

        this.httpStatusCode = jqXHR.status;
        if (this._handleHttpErrors(this.httpStatusCode))
            return;

        this._loadAssetFromData(data);

        // Cleanup
        jqXHR.responseText = null;
        jqXHR.responseXml = null;
        jqXHR = null;
        data = null;

        this._ajax = undefined;
    },

    _onTransferCompletedBinary : function(event)
    {
        if (this.aborted === true)
            return;

        var request = event.currentTarget;
        this.httpStatusCode = request.status;
        if (this._handleHttpErrors(this.httpStatusCode))
            return;

        this._loadAssetFromData(request.response);

        // Cleanup
        request.response = null;
        request = null;

        this._ajax = undefined;
    },

    _onTransferFailed : function(jqXHR, textStatus, errorThrown)
    {
        if (this.aborted === true)
            return;

        this.httpStatusCode = jqXHR.status;

        Tundra.asset.assetTransferFailed(this, "Request failed " + this.ref + ": " +
            (jqXHR.status !== 0 ? jqXHR.status : "Request Timed Out") + " " +
            AssetTransfer.statusCodeName(jqXHR.status) +
            (typeof textStatus === "string" ? " (" + textStatus  + ")": "")
        );

        // Cleanup
        jqXHR.responseText = null;
        jqXHR.responseXml = null;
        jqXHR = null;

        this._ajax = undefined;
    },

    _onTransferFailedBinary : function(event)
    {
        if (this.aborted === true)
            return;

        // Proxy asked us to wait?
        var request = event.currentTarget;
        this.httpStatusCode = request.status;

        Tundra.asset.assetTransferFailed(this, "Request failed " + this.ref + ": " +
            (request.status !== 0 ? request.status : "Request Timed Out") + " " +
            AssetTransfer.statusCodeName(request.status)
        );

        // Cleanup
        request.response = null;
        request = null;

        this._ajax = undefined;
    },

    _loadAssetFromData : function(data)
    {
        Tundra.asset.removeActiveTransfer(this);

        var asset = Tundra.asset.createEmptyAsset(this.ref, this.type);
        if (asset == null)
        {
            Tundra.asset.assetTransferFailed(this, "Failed to create asset of unknown type '" + this.type + "' for '" + this.ref + "'");
            return;
        }

        try
        {
            this._deserializeFromData(asset, data);
        }
        catch(e)
        {
            Tundra.asset.assetTransferFailed(this, "Exception while deserializing asset from data: " + e, true);
            if (e.stack !== undefined)
                console.error(e.stack);
            console.log(this);
        }

        this.active = false;
    },

    _deserializeFromData : function(asset, data)
    {
        var succeeded = asset._deserializeFromData(data, this.requestDataType, this);

        // Load failed synchronously
        if (!succeeded)
            Tundra.asset.assetTransferFailed(this, "IAsset.deserializeFromData failed loading asset " + this.ref);
        // Loaded completed synchronously
        else if (asset.isLoaded())
            this._assetLoadCompleted(asset);
        // Load did not fail or complete yet: The asset is fetching dependencies or
        // loading asynchronously with a WebWorker or just library that uses callbacks.
        else
        {
            this.loading = true;
            this.subscriptions.push(asset.onLoaded(this, this._assetLoadCompleted));
            this.subscriptions.push(asset.onFailed(this, this._assetLoadFailed));
            this.subscriptions.push(asset.onDependencyFailed(this, this._assetDependencyFailed));
        }
    },

    _assetLoadCompleted : function(asset)
    {
        this.loading = false;
        Tundra.asset.assetTransferCompleted(this, asset);
    },

    _assetLoadFailed : function(asset, reason)
    {
        this.loading = false;
        Tundra.asset.assetTransferFailed(this,
            "Asset " + this.ref + " request failed: " + (typeof reason === "string" ? reason : "Unkown reason"));
    },

    _assetDependencyFailed : function(dependencyRef)
    {
        this.loading = false;
        Tundra.asset.assetTransferFailed(this,
            "Asset " + this.ref + " request failed. Dependency " + dependencyRef + " could not be loaded.");
    },

    _emitCompleted : function(asset)
    {
        for (var i = 0; i < this.subscriptions.length; i++)
            Tundra.events.unsubscribe(this.subscriptions[i]);
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
                {
                    // If code logic has marked this base asset as reusable,
                    // don't clone on the first response.
                    if (asset.canReuse === true)
                    {
                        asset.canReuse = false;
                        responseAsset = asset;
                    }
                    else
                        responseAsset = asset.clone();
                }
                else
                    responseAsset = asset;

                fired++; // Increment before for potential exception

                // If context was not provided use this AssetTransfer as the context.
                subscriber.callback.call((subscriber.context !== undefined && subscriber.context !== null ? subscriber.context : this),
                        responseAsset, subscriber.metadata);
            }
            catch(e)
            {
                Tundra.client.logError("[AssetTransfer]: Completed handler exception: " + e, true);
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
            Tundra.events.unsubscribe(this.subscriptions[i]);
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
                Tundra.client.logError("[AssetTransfer]: Failed handler exception: " + e, true);
            }
        }
        this.subscribers = [];
    }
});

return AssetTransfer;

}); // require js
