
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/framework/CoreStringUtils",
        "core/asset/AssetCache",
        "core/asset/AssetTransfer",
        "core/asset/AssetFactory",
        "core/asset/IAsset",
        "core/asset/TextAsset",
        "core/asset/BinaryAsset"
    ], function(Class, TundraSDK, TundraLogging, CoreStringUtils,
                AssetCache, AssetTransfer, AssetFactory,
                IAsset, TextAsset, BinaryAsset) {

/**
    AssetAPI that is accessible from {{#crossLink "TundraClient/asset:property"}}TundraClient.asset{{/crossLink}}

    Loads requested assets to the system and manages their lifetime.
    @class AssetAPI
    @constructor
*/
var AssetAPI = Class.$extend(
{
    __init__ : function(params)
    {
        this.log = TundraLogging.getLogger("Asset");

        // Handle startup parameters
        this.localStoragePath = params.asset.localStoragePath != null ? params.asset.localStoragePath : "";
        if (this.localStoragePath != "" && !CoreStringUtils.endsWith(this.localStoragePath, "/"))
            this.localStoragePath += "/";

        /**
            Asset cache where you can find currently loaded assets.

                var asset = TundraSDK.framework.asset.cache.get(assetRef);
                if (asset != null)
                    console.log(asset.name);

            @property cache
            @type AssetCache
        */
        this.cache = new AssetCache();
        /**
            Registered asset factories.

            @property factories
            @type Array<AssetFactory>
        */
        this.factories = [];
        /**
            If transfers should be processed and started automatically by AssetAPI.
            If set to false, you need to manually pump the processing by calling
            AssetAPI.processTransfers() or implementing your own logic that processes
            the AssetAPI.transfers queue.

            @property autoProcessTransfers
            @type Boolean
            @default true
        */
        this.autoProcessTransfers = true;
        /**
            Maximum number of active asset transfers.
            @property transfers
            @type Array of AssetTransfers
            @default 8
        */
        this.maxActiveTransfers = 8;
        /**
            Maximum number of active asset transfers per asset type.

            <b>Note:</b> maxActiveTransfers is respected first. Even if you set a type to have
            higher max transfers, it can never go above maxActiveTransfers.

            @property transfers
            @type Array of AssetTransfers
            @default None are set.
            @example
                TundraSDK.framework.asset.maxActiveTransfersPerType["Binary"] = 5;
        */
        this.maxActiveTransfersPerType = {};

        // Register core asset factories
        this.registerAssetFactory(new AssetFactory("Text", TextAsset, { 
            ".xml"   : "xml",           ".txml"  : "xml",
            ".html"  : "document",      ".htm"   : "document",
            ".json"  : "json",          ".js"    : "json",
            ".txt"   : "text"
        }, "text"));
        this.registerAssetFactory(new AssetFactory("Binary", BinaryAsset, {}, "arraybuffer"));
    },

    __classvars__ :
    {
        /**
            Current HTTP proxy resolver implementation used by AssetAPI.
            @property
            @static
            @default undefined
            @type IHttpProxyResolver
        */
        httpProxyResolver : undefined,

        /**
            Sets a proxy resolver implementation to be used by AssetAPI.
            @method reset
            @static
            @param {IHttpProxyResolver} resolver Resover implementation.
        */
        setHttpProxyResolver : function(resolver)
        {
            this.httpProxyResolver = resolver;
        }
    },

    postInitialize : function()
    {
    },

    /**
        Sets the current proxy resolver implementation.
        @method getHttpProxyResolver
        @param {IHttpProxyResolver|undefined} resolver IHttpProxyResolver instance.
    */
    setHttpProxyResolver : function(resolver)
    {
        return AssetAPI.httpProxyResolver = resolver;
    },

    /**
        Returns the current proxy resolver implementation, or undefined if not set.
        @method getHttpProxyResolver
        @return {IHttpProxyResolver|undefined}
    */
    getHttpProxyResolver : function()
    {
        return AssetAPI.httpProxyResolver;
    },

    /**
        Registers a new asset factory.
        @method registerAssetFactory
        @param {AssetFactory} assetFactory
        @return {Boolean} If registration was successful.
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
        if (assetFactory.typeExtensions !== undefined && assetFactory.supportedSuffixes().length > 0)
            this.log.debug("Registered factory", assetFactory.assetType, assetFactory.supportedSuffixes());
        else
            this.log.debug("Registered factory", assetFactory.assetType);
        return true;
    },

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
        Resets the internal state. Forgets all cached assets permanently.
        @method reset
    */
    reset : function()
    {
        this.forgetAssets(true);
        this.abortTransfers();
        this.defaultStorage = null;

        /**
            Active asset transfers.
            @property transfers
            @type Array of AssetTransfers
        */
        this.transfers = [];

        // Internal, no doc.
        this.readyTransfers = [];
        this.activeTransfers = [];

        this.startMonitoring = false;
        this.tranferCheckT = 0.0;
        this.tranferCheckInterval = 0.1;

        this.noFactoryErrors = {};

        // Reset static asset transfer tracking data.
        AssetTransfer.reset();
    },

    /**
        Returns a relative path to the local asset storage for a given resouce.
        @method getLocalAssetPath
        @param {String} resource
        @return {String} Relative resource path that can be embedded to the DOM or CSS.
    */
    getLocalAssetPath : function(resource)
    {
        return this.localStoragePath + resource;
    },

    /**
        Get loaded asset.
        @method getAsset
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
        @method forgetAssets
        @param {Boolean} [doUnload=true]
    */
    forgetAssets : function(doUnload)
    {
        if (doUnload === undefined || doUnload === null)
            doUnload = true;

        var assets = this.cache.getAssets();
        for (var i = 0; i < assets.length; i++)
        {
            var asset = assets[i];
            if (asset != null)
                TundraSDK.framework.events.send("AssetAPI.AssetAboutToBeRemoved", asset);
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

    update : function(frametime)
    {
        if (frametime !== undefined)
        {
            this.tranferCheckT += frametime;
            if (this.tranferCheckT < this.tranferCheckInterval)
                return;
            this.tranferCheckT = 0.0;
        }

        // Process transfers queue
        if (this.transfers.length > 0 && this.activeTransfers.length < this.maxActiveTransfers)
        {
            if (this.autoProcessTransfers === true)
                this.processTransfers();
        }
        else if (this.transfers.length == 0 && this.startMonitoring)
        {
            this.startMonitoring = false;

            if (TundraSDK.framework.client.websocket !== null)
            {
                /// Wait a bit and check again if we have completed everything
                setTimeout(function() {
                    if (this.transfers.length > 0)
                        return;

                    this.log.infoC("All asset transfers done");
                    this.noFactoryErrors = {};

                    if (TundraSDK.framework.client.networkDebugLogging === true)
                    {
                        var loadedAssets = {};
                        var assets = this.cache.getAssets();
                        for (var i=0, len=assets.length; i<len; i++)
                        {
                            var asset = assets[i];
                            if (loadedAssets[asset.type] === undefined)
                                loadedAssets[asset.type] = 1;
                            else
                                loadedAssets[asset.type] += 1;
                        }
                        for (var assetType in loadedAssets)
                            this.log.debug("   >> " + assetType + " : " + loadedAssets[assetType]);
                    }
                }.bind(this), 500);
            }
        }

        // Ship ready transfers
        if (this.readyTransfers.length > 0)
        {
            for (var i = 0; i < this.readyTransfers.length; i++)
            {
                var transfer = this.readyTransfers[i];
                transfer._emitCompleted(this.getAsset(transfer.ref));
                delete transfer;
            }
            this.readyTransfers = [];
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
        Return if the given asset reference is supported by a registered AssetFactory.
        @method isSupportedAssetRef
        @param {String} assetRef
        @return {Boolean}
    */
    isSupportedAssetRef : function(assetRef)
    {
        return (this.getAssetFactory(assetRef) !== null);
    },

    /**
        Return if the given type is supported by a registered AssetFactory.
        @method isSupportedAssetType
        @param {String} type
        @return {Boolean}
    */
    isSupportedAssetType : function(type)
    {
        return (this.getAssetFactory(undefined, type) !== null);
    },

    /*
        Request a dependency asset. Used for IAsset implementation to request dependencies.
        This function differs from AssetAPI.requestAsset in that it will setup dependency refs to parent asset
        (IAsset.dependencyRefs) and add the parent asset to the new transfer automatically (AssetTransfer.parentAssets).
        
        This function also puts this dependency transfer at the front of the pending transfers queue, 
        so the dependency is loaded as soon as possible.

        <b>Note:</b> AssetAPI does not track/monitor asset dependency completions automatically, 
        only the number of dependencies it has, the refs and manages the parent asset for transfers.
        Each asset is responsible for actually executing the requests and handling their completion.

        @method requestDependencyAsset
        @param {IAsset} parentAsset Parent asset requesting this dependency.
        @param {String} ref Dependency asset reference.
        @param {String} [forcedAssetType=undefined] Can be used to override the auto detected asset type.
    */
    requestDependencyAsset : function(parentAsset, ref, forcedAssetType)
    {
        if (!(parentAsset instanceof IAsset))
        {
            this.log.error("requestDependencyAsset called with non IAsset object as 'parentAsset':", parentAsset);
            return null;
        }

        /** @todo Verify that this does not get broken if multiple things request the same dependency.
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

    /**
        Request asset.

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

        @method requestAsset
        @param {String} ref Asset reference
        @param {String} [forcedAssetType=undefined] Can be used to override the auto detected asset type.
        @return {AssetTransfer} Transfer for this request. Connect to it with
        {{#crossLink "AssetTransfer/onCompleted:method"}}onCompleted(){{/crossLink}} and {{#crossLink "AssetTransfer/onFailed:method"}}onCompleted(){{/crossLink}}.
    */
    requestAsset : function(ref, forcedAssetType)
    {
        if (CoreStringUtils.startsWith(ref, "generated://") || CoreStringUtils.startsWith(ref, "local://"))
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

        // webtundra:// ref to a relative ref on the hosted web page.
        if (CoreStringUtils.startsWith(ref, "webtundra://"))
        {
            ref = this.localStoragePath + ref.substring(12);
        }
        // Point relative refs to default storage.
        // If not known (not connected to server) use relative from page.
        else if (!CoreStringUtils.startsWith(ref, "http"))
        {
            if (this.defaultStorage != null && typeof this.defaultStorage.src === "string")
                ref = this.defaultStorage.src + ref;
            else
                ref = this.localStoragePath + ref;
        }

        // If an asset proxy implementation has been registered, ask it for the proxy url.
        // Otherwise the original url is used for the request, meaning its the hosting partys
        // responsibility to make sure their server support CORS and other aspect of what
        // are required when doing http requests from JavaScript code.
        var proxyRef = undefined;
        if (CoreStringUtils.startsWith(ref, "http") && AssetAPI.httpProxyResolver !== undefined)
            proxyRef = AssetAPI.httpProxyResolver.resolve(ref, assetType, assetExt);

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
        var existingAsset = this.getAsset(ref);
        if (existingAsset !== undefined && existingAsset !== null)
        {
            transfer = new AssetTransfer(null, ref, proxyRef, assetType, assetExt);
            this.readyTransfers.push(transfer);
            return transfer;
        }

        // 4. Request asset from the source
        transfer = new AssetTransfer(factory, ref, proxyRef, assetType, assetExt);
        this.transfers.push(transfer);

        /** @todo Evaluate if this event should fire for 'readyTransfers'
            that are just dummy transfers of already loaded assets. */
        TundraSDK.framework.events.send("AssetAPI.ActiveAssetTransferCountChanged", this.numCurrentTransfers());

        return transfer;
    },

    processTransfers : function(recursiveUpToMaxActiveTransfers)
    {
        if (recursiveUpToMaxActiveTransfers === undefined)
            recursiveUpToMaxActiveTransfers = true;

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
                this.startMonitoring = true;

                this.activeTransfers.push(transfer);
                transfer._send();
                break;
            }
        }

        if (recursiveUpToMaxActiveTransfers === true && !allActive && this.transfers.length > 0 && this.activeTransfers.length < this.maxActiveTransfers)
            this.processTransfers(recursiveUpToMaxActiveTransfers);
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

        TundraSDK.framework.events.send("AssetAPI.ActiveAssetTransferCountChanged", this.numCurrentTransfers());
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
            TundraSDK.framework.client.logError("[AssetAPI]: " + reason, true);

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
            TundraSDK.framework.events.send("AssetAPI.AssetCreated", asset);
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
        Registers a callback for when asset transfer count changes
        @example
            TundraSDK.framework.asset.onActiveAssetTransferCountChanged(null, function(num) {
                console.log("Transfers remaining:", num);
            });

        @method onActiveAssetTransferCountChanged
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onActiveAssetTransferCountChanged : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("AssetAPI.ActiveAssetTransferCountChanged", context, callback);
    },

    /**
        Registers a callback for when a new asset is created.
        This allows code to track asset creations and hook to IAsset events.

        @method onAssetCreated
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAssetCreated : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("AssetAPI.AssetCreated", context, callback);
    },

    /**
        Registers a callback for when asset has been deserialized from data.
        See {{#crossLink "IAsset/onDeserializedFromData:method"}}IAsset.onDeserializedFromData(){{/crossLink}}.

        @method onAssetDeserializedFromData
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAssetDeserializedFromData : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("AssetAPI.AssetDeserializedFromData", context, callback);
    },

    _emitAssetDeserializedFromData : function(asset)
    {
        TundraSDK.framework.events.send("AssetAPI.AssetDeserializedFromData", asset);
        asset._emitDeserializedFromData();
    },

    /**
        Registers a callback for when a asset is about to be removed from the asset system
        and under usual conditions implying that the asset is also being unloaded.

        @method onAssetAboutToBeRemoved
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity is not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAssetAboutToBeRemoved : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("AssetAPI.AssetAboutToBeRemoved", context, callback);
    }
});

return AssetAPI;

}); // require js
