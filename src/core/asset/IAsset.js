
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/framework/TundraLogging"
    ], function(Class, Tundra, TundraLogging) {

// Main flag to enable profiling
var _enableAssetProfiling = false;
var _profiling  = (!_enableAssetProfiling ? undefined :
{
    // Total assets loaded
    loaded    : 0,
    // Total time spent loading
    timeTotal : 0,
    // List of asset classes to provide e.g "TextureAsset",
    // "OgreMeshAsset" or "all" for everything.
    types : [ "all" ]
});

var IAsset = Class.$extend(
/** @lends IAsset.prototype */
{
    /**
        IAsset interface that asset implementation will extend.

        @constructs
        @param {String} name Unique name of the asset, usually this is the asset reference.
        @param {String} type AssetAPI supported asset type.
    */
    __init__ : function(name, type)
    {
        this.log = TundraLogging.getLogger(type);

        /**
            Unique asset reference.
            @var {String}
        */
        this.name = name;
        /**
            AssetAPI supported asset type.
            @var {String}
        */
        this.type = type;
        /**
            If this is a URL reference, baseRef is a URL to the parent folder. Guaranteed to have a trailing slash. <br>
            Can be used to resolve full URL references for potential relative path dependencies.
            @var {String}
        */
        this.baseRef = (name.indexOf("/") !== 0 ? name.substring(0, name.lastIndexOf("/") + 1) : "");
        if (name.indexOf(".zip#") !== -1)
            this.baseRef = name.substring(0, name.lastIndexOf(".zip#")+5);

        /**
            List of absolute asset references that this asset depends on.
            @var {Array.<String>}
        */
        this.dependencyRefs = [];
        /**
            True if this asset type requires cloning when its distributed among its transfers. Default value is false.
            @var {Boolean}
        */
        this.requiresCloning = false;
        /**
            True if this asset is the first loaded instance where clones were created. See the requiresCloning property.
            @var {Boolean}
        */
        this.isCloneSource = false;
        /**
            True if verbose logging should be done while loading the asset. Default value is false.
            @var {Boolean}
        */
        this.logging = false;
    },

    __classvars__ :
    {
        cloneCounts : {},
    },

    /**
        Return the current clone count for this asset.

        @return {Number}
    */
    numClones : function()
    {
        var num = IAsset.cloneCounts[this.name];
        if (num === undefined) num = 0;
        return num;
    },

    /**
        Returns the original asset name for clones.

        @todo Naming the clones like this is a bit unfortunate and should be fixed in the AssetAPI logic.
        @return {String}
    */
    originalName : function()
    {
        var index = this.name.indexOf("_clone_");
        return (index > 0 ? this.name.substring(0, index) : this.name);
    },

    /**
        Returns a clone asset ref for a clone index.

        @param {Number} index Clone index.
        @return {String}
    */
    cloneName : function(index)
    {
        return this.name + "_clone_" + index;
    },

    /**
        Returns if this asset it loaded. Asset implementation must override this function, base implementation always returns false.
        If false you can hook to the loaded/failed event with {@link IAsset#onLoaded} and {@link IAsset#onFailed}.

        @return {Boolean}
    */
    isLoaded : function()
    {
        return false;
    },

    /**
        Registers a callback for asset deserialized event. Note that completing deserializing from data
        does not equal the asset being loaded. Data has been processed and potential dependencies should have
        been resolved and possibly requested.

        @subscribes
    */
    onDeserializedFromData : function(context, callback)
    {
        return Tundra.events.subscribe("IAsset.DeserializedFromData." + this.name, context, callback);
    },

    /**
        Registers a callback for asset loaded event. See {@link IAsset#isLoaded}.

        @subscribes
    */
    onLoaded : function(context, callback)
    {
        return Tundra.events.subscribe("IAsset.Loaded." + this.name, context, callback);
    },

    /**
        Registers a callback for asset load failure event. See {@link IAsset#isLoaded}.

        @subscribes
    */
    onFailed : function(context, callback)
    {
        return Tundra.events.subscribe("IAsset.Failed." + this.name, context, callback);
    },

    /**
        Registers a callback for asset dependency failed event.

        Code outside of AssetAPI internals requesting assets do not need to use this event.
        Use {@link AssetTransfer#onFailed} instead.

        @subscribes
    */
    onDependencyFailed : function(context, callback)
    {
        return Tundra.events.subscribe("IAsset.DependencyFailed." + this.name, context, callback);
    },

    /**
        Registers a callback for asset unloaded event. See {@link IAsset#isLoaded}.

        @subscribes

        * @example
        * var asset = Tundra.asset.getAsset(assetRef);
        * if (asset != null)
        * {
        *     asset.onUnloaded(null, function(asset) {
        *         console.log("Asset unloaded:", asset.name);
        *     });
        * }
    */
    onUnloaded : function(context, callback)
    {
        return Tundra.events.subscribe("IAsset.Unloaded." + this.name, context, callback);
    },

    /**
        Clones the asset and return the clone.

        @param {undefined|String} newAssetName Name for the produced clone, must be unique to the AssetAPI system.
        If undefined the new name will be auto generated.
        @return {null|IAsset} Valid asset or null if cloning failed.
    */
    clone : function(newAssetName)
    {
        // It is internally supported to call clone() with undefined name if requires cloning is true
        if (newAssetName === undefined || typeof newAssetName !== "string")
        {
            var cloneNum = this.numClones() + 1;
            newAssetName = this.cloneName(cloneNum);
            IAsset.cloneCounts[this.name] = cloneNum;
        }
        if (newAssetName === undefined || typeof newAssetName !== "string")
        {
            this.log.error("Canno clone() as input parameter 'newAssetName' is not defined!");
            return null;
        }

        var existing = Tundra.asset.getAsset(newAssetName);
        if (existing !== undefined && existing !== null)
        {
            this.log.error("Cannot clone() asset '" + this.name + "' to new asset '" + newAssetName + "', it already exists!");
            return null;
        }
        var c = this._cloneImpl(newAssetName);
        if (c !== undefined && c !== null)
            Tundra.asset.cache.set(c.name, c);
        else
            this.log.error("Failed to create clone '" + newAssetName + "'");
        return c;
    },

    /**
        This function needs to be overridden by the IAsset implementation for cloning to work.
    */
    _cloneImpl : function(newAssetName)
    {
        this.log.warn("_cloneImpl() not implemented/overridden by this asset type '" + this.type + "'");
        return null;
    },

    /**
        Returns number of dependencies this asset has.

        Asset implementation can override this function, base implementation will return dependencies().length.

        @return {Number}
    */
    numDependencies : function()
    {
        return this.dependencies().length;
    },

    /**
        Returns number of pending (still loading) dependencies for this asset.

        Asset implementation should override this function if it has dependency logic,
        base implementation will return 0.

        @return {Number}
    */
    numPendingDependencies : function()
    {
        return 0;
    },

    /**
        Returns list of absolute asset references that this asset depends on.
        Base implementation will returns the dependencyRefs property.

        @return {Number}
    */
    dependencies : function()
    {
        return this.dependencyRefs;
    },

    /**
        Returns a list of absolute asset refs that are pending (still loading) for this asset.

        Asset implementation should override this function if it has dependency logic,
        base implementation will return and empty array.

        @return {Number}
    */
    pendingDependencies : function()
    {
        return [];
    },

    /**
        Deserializes the asset from input data.
        Asset implementation must override this function, base implementation is a no-op.

        @param {ArrayBuffer|Text|Xml} data
        @param {String} dataType eg. 'arraybuffer', 'text'
        @return {Boolean} Return false if loading the asset from input data fails.
        Returning true on success is optional, auto return of 'undefined' is assumed to be a successful load.
    */
    deserializeFromData : function(data, dataType, transfer)
    {
    },

    /**
        Unloads the asset from memory.
        Asset implementation must override this function, base implementation is a no-op.
    */
    unload : function()
    {
    },

    _deserializeFromData : function(data, dataType, transfer)
    {
        // Profiling
        var startTime = undefined;
        if (_profiling !== undefined)
        {
            for (var i = 0; i < _profiling.types.length; i++)
            {
                if (_profiling.types[i] === "all" || _profiling.types[i] === this.type)
                {
                    startTime = new Date();
                    break;
                }
            }
        }

        // Load asset
        var succeeded = this.deserializeFromData(data, dataType, transfer);
        if (succeeded === undefined)
            succeeded = true;
        else if (typeof succeeded !== "boolean")
        {
            this.log.error("deserializeFromData returned non boolean type value: " + succeeded +
                " for " + this.name + ". Assuming loading failed, marking to false. Fix your failure code paths to return 'false'.", true);
            succeeded = false;
        }

        // Profiling
        if (_profiling !== undefined && startTime !== undefined)
        {
            var name = this.name.substring(this.name.lastIndexOf("/")+1);
            var diff = (new Date()-startTime);
            _profiling.timeTotal += diff;
            _profiling.loaded += (succeeded ? 1 : 0);
            console.log("Loaded in " + diff +
                " msec [totals: time spent = " + _profiling.timeTotal +
                " msec num = " + _profiling.loaded + "] " + name
            );
        }

        // Deserialized
        if (succeeded)
            Tundra.asset._emitAssetDeserializedFromData(this);
        // Loaded?
        if (succeeded && this.isLoaded())
            this._emitLoaded();
        return succeeded;
    },

    _unload : function()
    {
        this.unload();
        this._emiUnloaded();
    },

    _emitDeserializedFromData : function()
    {
        Tundra.events.send("IAsset.DeserializedFromData." + this.name, this);
    },

    _emitLoaded : function()
    {
        Tundra.events.send("IAsset.Loaded." + this.name, this);
    },

    _emitFailed : function(reason)
    {
        Tundra.events.send("IAsset.Failed." + this.name, this, reason);
    },

    _emitDependencyFailed : function(dependencyRef)
    {
        Tundra.events.send("IAsset.DependencyFailed." + this.name, dependencyRef);
    },

    _emiUnloaded : function()
    {
        Tundra.events.send("IAsset.Unloaded." + this.name, this);
    }
});

return IAsset;

}); // require js
