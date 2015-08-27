
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/CoreStringUtils",
        "core/frame/AsyncHelper",
        "core/frame/FrameLimiter",
        "core/asset/AssetCache",
        "core/asset/AssetTransfer",
        "core/asset/AssetFactory",
        "core/asset/IAsset",
        "core/asset/TextAsset",
        "core/asset/BinaryAsset"
    ], function(Tundra, ITundraAPI, CoreStringUtils, AsyncHelper, FrameLimiter,
                AssetCache, AssetTransfer, AssetFactory,
                IAsset, TextAsset, BinaryAsset) {

var AssetAPI = ITundraAPI.$extend(
/** @lends AssetAPI.prototype */
{
    /**
        The AssetAPI provides functionalities to loads requested assets to the system and manages their lifetime.
        Assets can be textures, meshes, materials etc, and are in the most cases automatically handled by WebTundra.

        AssetAPI is a singleton and accessible from {@link Tundra.asset}

        @constructs
        @extends ITundraAPI
        @private
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        // Validate storages
        var storageIds = Object.keys(this.options.storages);
        for (var i = 0; i < storageIds.length; i++)
        {
            var storageScheme = storageIds[i];
            if (this.options.storages[storageScheme] !== "" && !CoreStringUtils.endsWith(this.options.storages[storageScheme], "/"))
                this.options.storages[storageScheme] += "/";
            // Lower case the storage scheme

            if (this.options.storages[storageScheme] !== this.options.storages[storageScheme.toLowerCase()])
            {
                this.options.storages[storageScheme.toLowerCase()] = this.options.storages[storageScheme];
                delete this.options.storages[storageScheme];
            }
            // Fix formatting for webtundra to hyphened version. But we cant remove the old one as stuff might be using it.
            if (storageScheme.toLowerCase() === "webtundra://")
                this.options.storages["web-tundra://"] = this.options.storages[storageScheme.toLowerCase()];
        };

        this._timing = new AsyncHelper(this.name, this);
        this._timing.data = { transferNum : 0, tStart : 0 };
        this._limiterProcess = new FrameLimiter(1.0/10.0);

        /**
            The asset cache contains currently loaded assets.
            @var {AssetCache}

            * @example
            * var asset = Tundra.asset.cache.get(assetRef);
            * if (asset)
            *     console.log(asset.name);
        */
        this.cache = new AssetCache();
        /**
            Active asset transfers.
            @type Array.<AssetTransfer>
        */
        this.transfers = [];
        /**
            Registered asset factories.
            @var {Array.<AssetFactory>}
        */
        this.factories = [];
        /**
            If transfers should be processed and started automatically by AssetAPI.
            If set to `false`, you need to manually pump the processing by calling
            {@link AssetAPI#processTransfers} or implementing your own logic that processes
            the AssetAPI.transfers queue.

            @var {Boolean}
            @default true
        */
        this.autoProcessTransfers = true;
        /**
            Maximum number of active asset transfers.
            @var {Number}
            @default 8
        */
        this.maxActiveTransfers = 8;
        /**
            Maximum number of active asset transfers per asset type.

            <b>Note:</b> maxActiveTransfers is respected first. Even if you set a type to have
            higher max transfers, it can never go above maxActiveTransfers.

            @var {Object}
            * @example
            * Tundra.asset.maxActiveTransfersPerType["Binary"] = 5;
        */
        this.maxActiveTransfersPerType = {};
    },

    // ITundraAPI override
    initialize : function()
    {
        // Register core asset factories
        this.registerAssetFactory(new AssetFactory("Binary", BinaryAsset, {}, "arraybuffer"));
        this.registerAssetFactory(new AssetFactory("Text", TextAsset, {
            ".xml"   : "xml",           ".txml"  : "xml",
            ".html"  : "document",      ".htm"   : "document",
            ".json"  : "json",          ".js"    : "json",
            ".txt"   : "text",          ".rss"   : "xml"
        }, "text"));
    },

    // ITundraAPI override
    postInitialize : function()
    {
        for (var i = 0; i < this.factories.length; i++)
            this._logAssetTypeFactory(this.factories[i], true);
    },

    // ITundraAPI override
    reset : function()
    {
        this.abortTransfers();
        this.defaultStorage = null;

        this.transfers = [];

        // Internal, no doc.
        this.readyTransfers = [];
        this.activeTransfers = [];

        this.noFactoryErrors = {};

        // Reset static asset transfer tracking data.
        AssetTransfer.reset();

        this._timing.async("forget.assets", function() {
            this.forgetAssets(true);
        });
    },

    __classvars__ :
    {
        getDefaultOptions : function()
        {
            return {
                storages : {
                    "webtundra://" : ""
                }
            };
        },

        /**
            Current HTTP proxy resolver implementation used by AssetAPI.

            @static
            @default undefined
            @var {IHttpProxyResolver}
        */
        httpProxyResolver : undefined,

        /**
            Activate a HTTP proxy resolver implementation.

            @static
            @param {IHttpProxyResolver}
        */
        setHttpProxyResolver : function(resolver)
        {
            this.httpProxyResolver = resolver;

            if (Tundra.events)
                Tundra.events.send("AssetAPI.HTTP.Proxy.Changed", this.httpProxyResolver);
            return this.httpProxyResolver;
        },

        // Static class version of loadScript
        loadScript : function(url, options)
        {
            options = $.extend(options || {}, {
                url      : url,
                dataType : "script",
                cache    : true
            });
            return $.ajax(options);
        },

        // Static class version of loadDependencies
        loadDependencies : function(context)
        {
            if (context === undefined || context === null)
                context = "";
            if (typeof context !== "string")
            {
                Tundra.asset.log.error("loadDependencies: First parameter must be a context ref. If you don't need to specify a context pass in 'undefined'");
                return $.Deferred(function(defer) {
                    defer.reject();
                }).promise();
            }

            var refs = [].slice.call(arguments, 1);
            if (!Array.isArray(refs) || refs.length === 0)
            {
                Tundra.asset.log.error("loadDependencies: Invoked without any dependencies");
                return $.Deferred(function(defer) {
                    defer.reject();
                }).promise();
            }
            // Resolve references
            context = Tundra.asset.resolveAssetRef("", context);
            for (var i = 0; i < refs.length; i++)
            {
                if (typeof refs[i] !== "string")
                {
                    Tundra.asset.log.error("loadDependencies: Invoked with a dependency that is not a string:", refs);
                    return $.Deferred(function(defer) {
                        defer.reject();
                    }).promise();
                }
            }
            for (var i = 0; i < refs.length; i++)
            {
                var resolved = Tundra.asset.resolveAssetRef(context, refs[i]);
                if (typeof resolved === "string" && resolved !== "" && resolved !== refs[i])
                    refs[i] = resolved;
            }
            // Start deferred
            return promise = $.Deferred(function(defer) {
                $.extend(defer, {
                    _context : context,
                    _refs   : refs,
                    _error  : undefined,
                    _onFail : function(req, error, exception)
                    {
                        // Preserve the first error
                        if (this._error !== undefined)
                            return;
                        this._error = "Failed to fetch dependency '" + this._processingRef + "' for '" + this._context + "':";
                        if (exception)
                            this._error +=  " " + exception.toString();
                        else if (error)
                            this._error += " " + error;
                    },
                    _processNext : function()
                    {
                        if (this._error !== undefined)
                        {
                            Tundra.asset.log.error("loadDependencies:", this._error);
                            this.reject(this.error);
                            return;
                        }
                        if (this._refs.length === 0)
                        {
                            this.resolve();
                            return;
                        }

                        this._processingRef = this._refs.splice(0,1)[0];
                        var ext = CoreStringUtils.extension(this._processingRef);
                        if (ext !== ".html")
                        {
                            Tundra.asset.loadScript(this._processingRef)
                                .fail(this._onFail.bind(this))
                                .always(this._processNext.bind(this));
                        }
                        else
                        {
                            this._processNext();
                        }
                    }
                });
                /* @todo Support parallel loading with a boolean to this func.
                   Now fetching the deps is one by one in the given order.
                   We must assume that the order might be important. */
                defer._processNext();
            }).promise();
            return promise;
        }
    },

    /**
        Load a JavaScript file from URL to the global context.

        This function differs from `$.getScript()` in that it
        allows normal browser cache mechanisms. `$.getScript()`
        forces caching off by appending a random number to the query.

        If your script is on a server that returns cache headers
        please prefer using this function to keep load times to a
        minimum. Especially if you request libraries on client startup.

        See more from http://api.jquery.com/jquery.getscript/

        @param {String} url
        @param {Object} options Passed to `$.ajax()`. 'dataType',
        'cache' and 'url' cannot be overridden.
        @return {jqXHR} jQuery ajax request.
    */
    loadScript : function(url, options)
    {
        return AssetAPI.loadScript(url, options);
    },

    /**
        Loads arbitrary number of JavaScript files.

        @param {String|undefined} context Context will be used to resolve relative dependency refs.
        If you know you wont need a context you should pass 'undefined'.
        @param {String} dependencyRef After context you can pass in any number of asset references.
        @return {jQuery.Promise}
    */
    loadDependencies : function()
    {
        return AssetAPI.loadDependencies.apply(AssetAPI, arguments);
    },

    /**
        Sets the current proxy resolver implementation.

        @param {IHttpProxyResolver|undefined} resolver IHttpProxyResolver instance.
        @return {IHttpProxyResolver}
    */
    setHttpProxyResolver : function(resolver)
    {
        return AssetAPI.setHttpProxyResolver(resolver);
    },

    /**
        Registers a callback for http proxy resolved changes.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onHttpProxyResolvedChanged : function(context, callback)
    {
        return Tundra.events.subscribe("AssetAPI.HTTP.Proxy.Changed", context, callback);
    },

    /**
        Returns the current proxy resolver implementation, or undefined if not set.

        @return {IHttpProxyResolver|undefined}
    */
    getHttpProxyResolver : function()
    {
        return AssetAPI.httpProxyResolver;
    },

    /**
        Registers a new asset factory.

        @param {AssetFactory} assetFactory
        @return {Boolean} `true` if registration was successful.
    */
    registerAssetFactory : function(assetFactory)
    {
        if (!(assetFactory instanceof AssetFactory))
        {
            this.log.error("registerAssetFactory called with a non AssetFactory object:", assetFactory);
            return false;
        }
        // Check if this type is registered
        for (var i=0; i<this.factories.length; ++i)
        {
            if (this.factories[i].assetType === assetFactory.assetType)
            {
                this.log.error("AssetFactory with type '" + assetFactory.assetType + "' already registered:", this.factories[i]);
                return false;
            }
        }
        this.factories.push(assetFactory);
        this._logAssetTypeFactory(assetFactory);
        return true;
    },

    _logAssetTypeFactory : function(assetFactory, force)
    {
        if (!this.staging.postInitialized && force !== true)
            return;
        if (assetFactory.typeExtensions !== undefined && assetFactory.supportedSuffixes().length > 0)
            this.log.debug("Registered factory", assetFactory.assetType, assetFactory.supportedSuffixes());
        else
            this.log.debug("Registered factory", assetFactory.assetType);
    },

    /**
        Returns asset factory for a asset ref/type
        @param {String} assetRef
        @param {String} assetType Type of file extension.
        @return {null|AssetFactory}
    */
    getAssetFactory : function(assetRef, assetType)
    {
        // This is either or: If the asset type is provided,
        // it must be found with it or its an error.
        if (typeof assetType === "string")
        {
            for (var i=0; i<this.factories.length; i++)
            {
                if (this.factories[i].assetType === assetType)
                    return this.factories[i];
            }
            if (assetType.indexOf(".") === 0)
            {
                for (var i=0; i<this.factories.length; i++)
                {
                    if (this.factories[i].canCreate(assetType))
                        return this.factories[i];
                }
            }
        }
        else
        {
            for (var i=0; i<this.factories.length; i++)
            {
                if (this.factories[i].canCreate(assetRef))
                    return this.factories[i];
            }
        }
        return null;
    },

    /**
        Returns a relative path to the local asset storage for a given resource.

        @param {String} resource
        @return {String} Relative resource path to the local storage.
    */
    getLocalAssetPath : function(resource)
    {
        if (CoreStringUtils.startsWith(resource, "webtundra://"))
            resource = resource.substring(12);
        else if (CoreStringUtils.startsWith(resource, "webtundra-applications://"))
            resource = resource.substring(24);
        return this.options.storages["webtundra://"] + resource;
    },

    /**
        Get loaded asset.

        @param {String} assetRef Full asset reference.
        @return {IAsset|undefined} Asset instance or undefined if not loaded.
    */
    getAsset : function(assetRef)
    {
        return this.cache.get(assetRef);
    },

    abortTransfers : function()
    {
        if (this.transfers !== undefined)
        {
            for (var i = 0; i < this.transfers.length; i++)
                this.transfers[i].abort();
        }
        if (this.activeTransfers !== undefined)
        {
            for (var i = 0; i < this.activeTransfers.length; i++)
                this.activeTransfers[i].abort();
        }
    },

    /**
        Forgets all assets from the asset cache. Additionally also unloads all assets from memory, this can be prevented with doUnload=false.

        @param {Boolean} [doUnload=true]
    */
    forgetAssets : function(doUnload)
    {
        doUnload = (typeof doUnload === "boolean" ? doUnload : true);

        var assets = this.cache.getAssets();
        for (var i = 0; i < assets.length; i++)
        {
            var asset = assets[i];
            if (asset != null)
                Tundra.events.send("AssetAPI.AssetAboutToBeRemoved", asset);
            if (doUnload && asset != null && typeof asset.unload === "function")
            {
                // Reset the requiresCloning boolean as we really want to unload now.
                // Some assets won't unload if requiresCloning is set due to various reasons.
                asset.requiresCloning = false;
                asset.isCloneSource = false;
                asset.unload();
            }
            asset = null;
        }
        this.cache.forgetAssets();
    },

    forgetAsset : function(ref, doUnload)
    {
        return this.forget(ref, doUnload);
    },

    /**
        Forget a single asset.

        @param {String|IAsset} ref Asset reference or IAsset instance.
        @param {Boolean} [doUnload=true]
    */
    forget : function(ref, doUnload)
    {
        doUnload = (typeof doUnload === "boolean" ? doUnload : true);

        // Check if IAsset was passed
        if (typeof ref !== "string" && ref instanceof IAsset)
            ref = ref.name;
        if (typeof ref !== "string")
        {
            this.log.error("forgetAsset: Must pass in asset reference of IAsset instance:", ref, doUnload);
            return;
        }

        var asset = this.cache.get(ref);
        if (asset)
        {
            Tundra.events.send("AssetAPI.AssetAboutToBeRemoved", asset);
            if (doUnload && typeof asset.unload === "function")
            {
                // Reset the requiresCloning boolean as we really want to unload now.
                // Some assets won't unload if requiresCloning is set due to various reasons.
                asset.requiresCloning = false;
                asset.isCloneSource = false;
                asset.unload();
            }
            asset = null;

            this.cache.remove(ref);
        }
    },

    update : function(frametime)
    {
        // Limit execution not to happen each frame
        if (!this._limiterProcess.shouldUpdate(frametime))
            return;

        // Process transfers queue
        if (this.transfers.length > 0 && this.activeTransfers.length < this.maxActiveTransfers && this.autoProcessTransfers === true)
            this.processTransfers();

        // Ship ready transfers
        if (this.readyTransfers.length > 0)
        {
            var startTime = performance.now();
            var budjet = 5.0;

            for (var i = this.readyTransfers.length - 1; i >= 0; i--)
            {
                var transfer = this.readyTransfers[i];
                var asset = this.getAsset(transfer.ref);
                if (asset)
                    transfer._emitCompleted(asset);
                delete transfer;

                this.readyTransfers.splice(i, 1);

                if ((performance.now() - startTime) > budjet)
                    return;
            }
        }
    },

    handleDefaultStorage : function(storageStr)
    {
        var temp = JSON.parse(storageStr);
        this.defaultStorage = temp.storage;
    },

    makeDefaultStorageRelativeRef : function(ref)
    {
        if (this.defaultStorage == null || typeof this.defaultStorage.src !== "string" || !CoreStringUtils.startsWith(ref, this.defaultStorage.src))
            return undefined;
        return ref.substring(this.defaultStorage.src.length);
    },

    /**
        Returns asset type for assetRef.
        @note Unline desktop Tundra this function does NOT return "Binary" if
        a factory cannot be resolved for the asset reference. 'undefined'
        is returned if the type is not supported by any factory.

        @param {String} assetRef
        @return {String|undefined}
    */
    resourceTypeForAssetRef : function(assetRef)
    {
        if (assetRef === "")
            return undefined;

        var factory = this.getAssetFactory(assetRef);
        if (factory != null && typeof factory.assetType === "string")
            return factory.assetType;
        return undefined;
    },

    /**
        Return if the given asset reference is supported by a registered AssetFactory.

        @param {String} assetRef
        @return {Boolean}
    */
    isSupportedAssetRef : function(assetRef)
    {
        return (this.getAssetFactory(assetRef) !== null);
    },

    /**
        Return if the given type is supported by a registered AssetFactory.

        @param {String} type
        @return {Boolean}
    */
    isSupportedAssetType : function(type)
    {
        return (this.getAssetFactory(undefined, type) !== null);
    },

    /**
        Return if the given ref is relative. Note that all registered storage
        schemes are considered as relative references.

        @param {String} ref
        @return {Boolean}
    */
    isRelativeRef : function(ref)
    {
        if (ref.indexOf("/") === 0)
            return true;
        if (this.isRegisteredStorageSheme(ref))
            return true;
        var refLower = ref.toLowerCase();
        return (refLower.indexOf("http://") !== 0 && refLower.indexOf("https://") !== 0);
    },

    /**
        Return if the given ref is pointing to localhost.
        For developer setups this includes LAN IP if configured.

        @param {String} ref
        @return {Boolean}
    */
    isLocalhostRef : function(ref)
    {
        var refLower = ref.toLowerCase()
        var schemaless = "";
        if (refLower.indexOf("http://") === 0)
            schemaless = refLower.substring(7);
        else if (refLower.indexOf("https://") === 0)
            schemaless = refLower.substring(8);
        if (schemaless !== "")
        {
            if (schemaless.indexOf("localhost") === 0)
                return true;
            else if (typeof Tundra.DeveloperServerHost === "string" && schemaless.indexOf(Tundra.DeveloperServerHost) === 0)
                return true;
        }
        return false;
    },

    /**
        Returns if input string starts with a registered storage scheme, eg. "webtundra://"

        @param {String} ref Asset reference of directly a scheme string.
        @return {Boolean}
    */
    isRegisteredStorageSheme : function(ref)
    {
        var index = ref.indexOf("://");
        if (index !== -1)
            return (this.options.storages[ref.substring(0, index+3).toLowerCase()] !== undefined)
        return false;
    },

    /**
        Converts relative reference to absolute ref based on context.
        It is safe to call this function with non relative references.

        @param {IAsset|String} context Parent asset or parent asset reference.
        This parameter is optional, you can also call this function with only the ref as the first parameter.
        @param {String} ref Reference to resolve.
        @return {String}
    */
    resolveAssetRef : function(context, ref)
    {
        if (typeof ref !== "string" && typeof context === "string")
        {
            ref = context;
            context = "";
        }
        if (typeof ref !== "string" || ref === "")
            return "";

        // 1) Absolute http:// or https:// URL
        if (!this.isRelativeRef(ref))
            return ref;
        // 2) Relative webtundra:// or another registered storage scheme
        else if (this.isRegisteredStorageSheme(ref))
            return this.resolveCustomStorageRef(ref);

        // Drop "/" prefix
        var originalRef = ref;
        if (CoreStringUtils.startsWith(ref, "/"))
            ref = ref.substring(1);
        // 3) Context is a IAsset: resolve base from it
        if (context instanceof IAsset)
            return context.baseRef + ref;
        // 3) Context is a string
        else if (typeof context === "string")
        {
            // a) No context given, return as is?
            if (context === "")
                return originalRef;

            // b) Resolve to context
            var finalContext = context;
            if (context.indexOf(".zip#") !== -1)
                finalContext = context.substring(0, context.lastIndexOf(".zip#")+5);
            else if (!CoreStringUtils.endsWith(context, "/") && context.indexOf("/") !== -1)
                finalContext = context.substring(0, context.lastIndexOf("/")+1);
            return finalContext + ref;
        }
        this.log.error("resolveAssetRef: Allowed 'context' types are IAsset and String, given:", context, "for ref", ref);
        return originalRef;
    },

    /**
        Resolves the asset ref by its scheme to absolute URLs. Empty string is retuend if
            1) ref is empty
            2) ref is relative
            3) ref is an absolute http/https URL
            4) The ref scheme at, from index 0 to the ending of :// has not been registered.

        @param {String} ref Custom scheme ref eg. `my-custom-storage://path/to/asset.mesh`
        @return {String} Resolved ref or empty string.
    */
    resolveCustomStorageRef : function(ref)
    {
        if (typeof ref !== "string" || ref === "")
            return "";
        var index = ref.indexOf("://");
        if (index === -1)
            return "";
        var scheme = ref.substring(0, index+3).toLowerCase();
        if (scheme === "http://" || scheme === "https://")
            return "";
        var relative = ref.substring(index+3);
        var base = this.options.storages[scheme];
        if (typeof base !== "string")
            return "";
        if (relative.indexOf("/") === 0)
            relative = relative.substring(1);
        return base + relative;
    },

    /**
        Request a dependency asset. Used for IAsset implementation to request dependencies.
        This function differs from AssetAPI.requestAsset in that it will setup dependency refs to parent asset
        (IAsset.dependencyRefs) and add the parent asset to the new transfer automatically (AssetTransfer.parentAssets).

        This function also puts this dependency transfer at the front of the pending transfers queue,
        so the dependency is loaded as soon as possible.

        <b>Note:</b> AssetAPI does not track/monitor asset dependency completions automatically,
        only the number of dependencies it has, the refs and manages the parent asset for transfers.
        Each asset is responsible for actually executing the requests and handling their completion.

        @param {IAsset} parentAsset Parent asset requesting this dependency.
        @param {String} ref Dependency asset reference.
        @param {String} [forcedAssetType=undefined] Can be used to override the auto detected asset type.
        @return {AssetTransfer} Transfer for this request. Connect to it with
        {@link AssetTransfer#onCompleted} and {@link AssetTransfer#onFailed}.
    */
    requestDependencyAsset : function(parentAsset, ref, forcedAssetType)
    {
        if (!(parentAsset instanceof IAsset))
        {
            this.log.error("requestDependencyAsset called with non IAsset object as 'parentAsset':", parentAsset);
            return null;
        }
        else if (typeof ref !== "string")
        {
            this.log.error("requestDependencyAsset: 'ref' is not a string:", ref);
            return null;
        }

        // Resolve relative ref to context
        ref = this.resolveAssetRef(parentAsset, ref);

        /* @todo Verify that this does not get broken if multiple things request the same dependency.
           All that should happen it gets prepended multiple times to transfers and multiple parentAssets are set. */
        var lenPre = this.transfers.length;
        var transfer = this.requestAsset(ref, forcedAssetType);
        if (transfer == null)
            return transfer;

        // Set parent asset
        transfer.addParentAsset(parentAsset);

        // Prepend dep to transfer queue.
        if (this.transfers.length > lenPre)
        {
            var removeTransfer = this.transfers.splice(this.transfers.length-1, 1)[0];
            if (removeTransfer.ref !== transfer.ref)
            {
                this.log.error("Something went wrong in injecting transfer to the start of the queue: " +
                    transfer.ref + " removed from last index: " + removeTransfer.ref)
            }
            this.transfers.splice(0, 0, removeTransfer);
        }
        // Append dependency to IAsset.dependencyRefs
        if (parentAsset !== undefined && parentAsset.dependencyRefs !== undefined)
        {
            var depRefExists = false;
            for (var i = parentAsset.dependencyRefs.length - 1; i >= 0; i--)
            {
                depRefExists = (parentAsset.dependencyRefs[i] === transfer.ref);
                if (depRefExists)
                    break;
            }
            if (!depRefExists)
                parentAsset.dependencyRefs.push(transfer.ref);
        }
        return transfer;
    },

    requestAsset : function(ref, forcedAssetType)
    {
        return this.request(ref, forcedAssetType);
    },

    /**
        Shifts a existing scheduled asset transfer to the front of the tnrassfer queue.
        This can be used to execute high priority requests faster.

        @param {AssetTransfer} transfer
    */
    prependTransfer : function(transfer)
    {
        if (!(transfer instanceof AssetTransfer))
            return;

        var at = -1;
        for (var i = 0; i < this.transfers.length; i++)
        {
            if (this.transfers[i].equals(transfer))
            {
                at = i;
                break;
            }
        }
        if (at > 0)
        {
            var shiftTransfer = this.transfers.splice(at, 1)[0];
            if (!shiftTransfer || shiftTransfer.ref !== transfer.ref)
            {
                this.log.error("prependTransfer: Something went wrong in injecting transfer to the start of the queue: " +
                    transfer.ref + " removed from index " + at + ": " + (shiftTransfer ? shiftTransfer.ref : "-"));
            }
            this.transfers.splice(0, 0, shiftTransfer);
        }
    },

    /**
        Request asset.

        @param {String} ref Asset reference
        @param {String} [forcedAssetType=undefined] Can be used to override the auto detected asset type.
        @return {AssetTransfer} Transfer for this request. Connect to it with
        {@link AssetTransfer#onCompleted} and {@link AssetTransfer#onFailed}.

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
    request : function(ref, forcedAssetType)
    {
        if (typeof ref !== "string")
        {
            this.log.error("requestAsset: 'ref' is not a string:", ref);
            return null;
        }
        else if (CoreStringUtils.startsWith(ref, "generated://", true) || CoreStringUtils.startsWith(ref, "local://", true))
            return null;

        var factory = this.getAssetFactory(ref, forcedAssetType);
        if (factory === null)
        {
            var logged = this.noFactoryErrors[ref];
            if (logged === undefined)
            {
                if (typeof forcedAssetType === "string")
                    this.log.error("No registered AssetFactory for type '" + forcedAssetType + "':", ref);
                else
                    this.log.error("No registered AssetFactory for suffix '" + CoreStringUtils.extension(ref) + "':", ref);
                this.noFactoryErrors[ref] = true;
            }
            return null;
        }

        // Type information
        var assetExt = CoreStringUtils.extension(ref);
        var assetType = factory.assetType;

        // No extension was found or resolved to end of URL, eg. .com/data/json/items/123
        if (typeof assetExt !== "string" || assetExt === "" || assetExt.indexOf("/") !== -1)
        {
            // Replace with forced type if its an extension
            if (forcedAssetType.indexOf(".") === 0)
                assetExt = forcedAssetType.trim().toLowerCase();
            else
            {
                if (assetType === "Binary")
                    assetExt = "";
                else
                    this.log.warn("Failed to detect asset extension for '" + ref + "':", assetExt);
            }
        }

        var resolvedRef = this.resolveCustomStorageRef(ref);
        if (typeof resolvedRef !== "string" || resolvedRef === "")
        {
            /* webtundra:// will be resolved to the webtundra root folder
               @note If the TundraClient.AssetAPI has been configured properly
               this scheme was already resolved above. This is a fallback for backwards compatibility
               while we are transitioning to move apps from core to webtundra-applications:// */
            if (CoreStringUtils.startsWith(ref, "webtundra://") || CoreStringUtils.startsWith(ref, "webtundra-applications://"))
            {
                ref = this.getLocalAssetPath(ref);
            }
            /* Relative references will be resolved to the server provided default HTTP storage.
               If there is no server connection, the local storage is used instead. */
            else if (this.isRelativeRef(ref))
            {
                if (this.defaultStorage != null && typeof this.defaultStorage.src === "string")
                    ref = this.defaultStorage.src + ref;
                else
                    ref = this.options.storages["webtundra://"] + ref;
                if (CoreStringUtils.startsWith(ref, "local://", true))
                {
                    console.warn("local:// default storage cannot be used with WebTundra. It has no direct disk access. Ignoring request:", ref);
                    return null;
                }
            }
        }
        else
            ref = resolvedRef;

        // If an asset proxy implementation has been registered, ask it for the proxy url.
        // Otherwise the original url is used for the request, meaning its the hosting partys
        // responsibility to make sure their server support CORS and other aspect of what
        // are required when doing http requests from JavaScript code.
        var proxyRef = undefined;
        var proxyMetadata = {};
        if (CoreStringUtils.startsWith(ref, "http", true) && AssetAPI.httpProxyResolver !== undefined)
            proxyRef = AssetAPI.httpProxyResolver.resolve(proxyMetadata, ref, assetType, assetExt);

        // 1. Ongoing ready transfer
        var transfer = null;
        for (var i = this.readyTransfers.length - 1; i >= 0; i--)
        {
            transfer = this.readyTransfers[i];
            if (transfer.ref === ref)
                return transfer;
        }

        // 2. Ongoing web transfer
        for (var i = this.transfers.length - 1; i >= 0; i--)
        {
            transfer = this.transfers[i];
            if (transfer.ref === ref)
                return transfer;
        }

        // 3. Asset loaded to the system
        // @todo Should check proxy that metadata match: eg. texture might be loaded as dds and as png.
        var existingAsset = this.getAsset(ref);
        if (existingAsset !== undefined && existingAsset !== null)
        {
            if (existingAsset.isLoaded())
            {
                transfer = new AssetTransfer(null, ref, proxyRef, assetType, assetExt);
                transfer.proxyMetadata = proxyMetadata;
                this.readyTransfers.push(transfer);
                return transfer;
            }
            else
                this.cache.remove(existingAsset.name);
        }

        // 4. Request asset from the source
        transfer = new AssetTransfer(factory, ref, proxyRef, assetType, assetExt);
        transfer.proxyMetadata = proxyMetadata;
        this.transfers.push(transfer);

        // Profiling and stats
        this._timing.cancel("transfers.completed.sync");
        if (this._timing.data.transferNum === 0)
            this._timing.data.tStart = performance.now();
        this._timing.data.transferNum++;

        /** @todo Evaluate if this event should fire for 'readyTransfers'
            that are just dummy transfers of already loaded assets. */
        Tundra.events.send("AssetAPI.ActiveAssetTransferCountChanged", this.numCurrentTransfers());

        return transfer;
    },

    /**
        Process all pending transfers.
        This function should be only called if {@link AssetAPI#autoProcessTransfers} is set to `false`
    */
    processTransfers : function(recursiveUpToMaxActiveTransfers, startTime)
    {
        if (recursiveUpToMaxActiveTransfers === undefined)
            recursiveUpToMaxActiveTransfers = true;
        if (typeof startTime !== "number")
            startTime = performance.now();

        var allActive = true;
        if (this.transfers.length > 0 && this.activeTransfers.length < this.maxActiveTransfers)
        {
            var queued = this.numQueuedTransfersPerType();

            for (var i=0; i<this.transfers.length; ++i)
            {
                var transfer = this.transfers[i];
                if (transfer === undefined || transfer === null)
                {
                    this.transfers.splice(0, 1);
                    break;
                }

                if (transfer.active || transfer.loading)
                    continue;

                var maxTransfersForType = this.maxAssetTransfersForType(transfer.type);
                if (maxTransfersForType !== undefined && typeof maxTransfersForType === "number" && maxTransfersForType > 0)
                {
                    if (this.activeTransfersForType(transfer.type) >= maxTransfersForType)
                    {
                        // If no other type is pending, we will ignore the max transfers for this type
                        if (Object.keys(queued).length > 1)
                            continue;
                    }
                }

                allActive = false;

                this.activeTransfers.push(transfer);
                transfer._send();
                break;
            }
        }

        if (recursiveUpToMaxActiveTransfers === true && !allActive && this.transfers.length > 0 && this.activeTransfers.length < this.maxActiveTransfers)
        {
            if ((performance.now() - startTime) < 5.0)
                this.processTransfers(recursiveUpToMaxActiveTransfers, startTime);
        }
    },

    maxAssetTransfersForType : function(type)
    {
        if (typeof type === "string")
            return this.maxActiveTransfersPerType[type];
        return undefined;
    },

    numQueuedTransfersPerType : function()
    {
        var queued = {};
        for (var i = 0; i < this.transfers.length; i++)
        {
            if (this.transfers[i].active || this.transfers[i].loading)
                continue;
            var type = this.transfers[i].type;
            if (queued[type] === undefined)
                queued[type] = 0;
            queued[type] += 1;
        }
        return queued;
    },

    numQueuedTransfers : function()
    {
        var queued = 0;
        for (var i = 0; i < this.transfers.length; i++)
        {
            if (!this.transfers[i].active && this.transfers[i].loading)
                queued += 1;
        }
        return queued;
    },

    transferState : function()
    {
        var state = {
            active  : {},
            loading : {},
            queued  : {}
        };
        for (var i = 0; i < this.activeTransfers.length; i++)
        {
            var type = this.activeTransfers[i].type;
            if (state.active[type] === undefined)
                state.active[type] = 0;
            state.active[type] += 1;
        }
        for (var i = 0; i < this.transfers.length; i++)
        {
            if (this.transfers[i].active)
                continue;

            var submap = this.transfers[i].loading ? "loading" : "queued";
            var type = this.transfers[i].type;
            if (state[submap][type] === undefined)
                state[submap][type] = 0;
            state[submap][type] += 1;
        }
        return state;
    },

    activeTransfersForType : function(type)
    {
        var num = 0;
        for (var i=0; i<this.activeTransfers.length; ++i)
        {
            if (this.activeTransfers[i].type === type)
                num++;
        }
        return num;
    },

    removeActiveTransfer : function(transfer)
    {
        for (var i=0; i<this.activeTransfers.length; ++i)
        {
            if (this.activeTransfers[i].ref === transfer.ref)
            {
                this.activeTransfers.splice(i,1);
                break;
            }
        }
    },

    removeTransfer : function(transfer)
    {
        this.removeActiveTransfer(transfer);
        for (var i=0; i<this.transfers.length; ++i)
        {
            if (this.transfers[i].ref === transfer.ref)
            {
                this.transfers.splice(i,1);
                break;
            }
        }

        var numPending = this.numCurrentTransfers();
        Tundra.events.send("AssetAPI.ActiveAssetTransferCountChanged", numPending);

        // All done
        if (numPending === 0)
        {
            // Deferred
            this._timing.resolve("transfers.completed", true, this._timing.data.transferNum);

            // Logging
            if (Tundra.client.isConnected() || this.log.isDebug())
            {
                this._timing.async("transfers.completed.sync", function() {
                    if (typeof this._timing.data.transferNum === "number" && this._timing.data.transferNum > 0)
                    {
                        var spentMsec = (performance.now()-this._timing.data.tStart);
                        var spentSeconds = spentMsec / 1000.0;
                        var avg = spentMsec / this._timing.data.transferNum;
                        var qps = this._timing.data.transferNum / spentSeconds;
                        this.log.info(this._timing.data.transferNum, "transfers completed in", spentSeconds.toFixed(2), "sec / avg", avg.toFixed(0), "msec / QPS", qps.toFixed(2), "- All done");
                    }
                    this._timing.data.transferNum = 0;

                    if (this.log.isDebug() || Tundra.network.options.debug === false)
                    {
                        var loadedAssets = {};
                        var assets = Tundra.asset.cache.getAssets();
                        for (var i = 0; i < assets.length; i++)
                        {
                            var asset = assets[i];
                            if (loadedAssets[asset.type] === undefined)
                                loadedAssets[asset.type] = 1;
                            else
                                loadedAssets[asset.type] += 1;
                        }
                        this.log.debug("Loaded assets:", loadedAssets);
                    }
                }, 500);
            }
            else
                this._timing.data.transferNum = 0;
        }
    },

    assetTransferCompleted : function(transfer, asset)
    {
        // Mark this instance as the clone source
        if (asset.requiresCloning)
            asset.isCloneSource = true;

        // Cache. Replace the ref to cache initially set by createEmptyAsset.
        if (this.getAsset(asset.name) === undefined)
            this.log.warn("Could not find cache item to update for", asset.name, "Did you create the original asset with AssetAPI.createEmptyAsset?");
        this.cache.set(asset.name, asset);

        // Notify completion
        this.removeTransfer(transfer);
        transfer._emitCompleted(asset);

        // Cleanup
        asset = null;
        delete transfer; transfer = null;
    },

    assetTransferFailed : function(transfer, reason)
    {
        if (typeof reason === "string")
        {
            // Skip error logging for:
            // - AssetTransfer.silent
            // - "204 No Content"
            if (!transfer.silent && transfer.httpStatusCode !== 204)
                Tundra.client.logError("[AssetAPI]: " + reason, true);
        }

        // Notify failure
        this.removeTransfer(transfer);
        transfer._emitFailed(reason);

        delete transfer; transfer = null;
    },

    createEmptyAsset : function(assetRef, assetType)
    {
        var factory = this.getAssetFactory(undefined, assetType);
        if (factory !== null)
        {
            var asset = factory.createEmptyAsset(assetRef);
            this.cache.set(asset.name, asset);
            Tundra.events.send("AssetAPI.AssetCreated", asset);
            return asset;
        }
        return null;
    },

    numCurrentTransfers : function()
    {
        return this.transfers.length;
    },

    allTransfersCompleted : function()
    {
        return (this.numCurrentTransfers() === 0);
    },

    /**
        Promise that fires when all asset transfers have been completed.
        This promise is also resolved if there are not transfers at the time of the invocation.

        @return {jQuery.Promise}

        * @example
        * Tundra.asset.onTransfersCompleted().done(function(numTransfered) {
        *     console.debug("Transfers done. Starting application. Completed while waiting:", numTransfered);
        * }.bind(this));
    */
    onTransfersCompleted : function()
    {
        if (this.allTransfersCompleted())
            return this._timing.deferImmediate("transfers.completed", true, 0);
        return this._timing.defer("transfers.completed");
    },

    /**
        Registers a callback for when asset transfer count changes

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.asset.onActiveAssetTransferCountChanged(null, function(num) {
        *     console.log("Transfers remaining:", num);
        * });
    */
    onActiveAssetTransferCountChanged : function(context, callback)
    {
        return Tundra.events.subscribe("AssetAPI.ActiveAssetTransferCountChanged", context, callback);
    },

    /**
        Registers a callback for when a new asset is created.
        This allows code to track asset creations and hook to IAsset events.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onAssetCreated : function(context, callback)
    {
        return Tundra.events.subscribe("AssetAPI.AssetCreated", context, callback);
    },

    /**
        Registers a callback for when asset has been deserialized from data.
        See {{#crossLink "IAsset/onDeserializedFromData:method"}}IAsset.onDeserializedFromData(){{/crossLink}}.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onAssetDeserializedFromData : function(context, callback)
    {
        return Tundra.events.subscribe("AssetAPI.AssetDeserializedFromData", context, callback);
    },

    _emitAssetDeserializedFromData : function(asset)
    {
        Tundra.events.send("AssetAPI.AssetDeserializedFromData", asset);
        asset._emitDeserializedFromData();
    },

    /**
        Registers a callback for when a asset is about to be removed from the asset system
        and under usual conditions implying that the asset is also being unloaded.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onAssetAboutToBeRemoved : function(context, callback)
    {
        return Tundra.events.subscribe("AssetAPI.AssetAboutToBeRemoved", context, callback);
    }
});

return AssetAPI;

}); // require js
