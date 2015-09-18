
define([
        "core/framework/Tundra",
        "core/framework/TundraLogging",
        "core/scene/Scene",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(Tundra, TundraLogging, Scene, IComponent, Attribute) {

/**
    Script component.
    @class EC_Script
    @extends IComponent
    @constructor
*/
var EC_Script = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.startupApplication = false;
        this.scriptsRequested = false;
        this.scriptAsset = null;

        /**
            @property scriptRef (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "scriptRef", [], Attribute.AssetReferenceList, "Script ref");
        /**
            @property runOnLoad (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "runOnLoad", false, Attribute.Bool, "Run on load");
        /**
            @example
                if (ent.script.runMode === EC_Script.RunMode.Both)
                    ...;
                else if (ent.script.runMode === EC_Script.RunMode.Client)
                    ...;
                else if (ent.script.runMode === EC_Script.RunMode.Server)
                    ...;
            @property runMode (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "runMode", EC_Script.RunMode.Both, Attribute.Int, "Run mode");
        /**
            @property applicationName (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "applicationName", "", Attribute.String, "Script application name");
        /**
            @property className (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "className", "", Attribute.String, "Script class name");
    },

    __classvars__ :
    {
        TypeId   : 5,
        TypeName : "Script",

        /**
            Script run mode enumeration.
            @property RunMode
            @static
            @example
                {
                    Both   : 0,
                    Client : 1,
                    Server : 2
                };
        */
        RunMode :
        {
            Both   : 0,
            Client : 1,
            Server : 2
        },

        nativeScriptReplacements : [],

        /**
            Register an web client script to replace certain native Tundra script ref.
            Useful for register hot swapping apps so you don't have to add two client scripts to your scene.
            The keyword will be matched against the script file name only, not the full URL. Comparison is case-insensitive.
            @static
            @method registerNativeScriptReplacement
            @param {String} scriptRefKeyword Script ref keyword, if this keyword is found from a scriptref it will be replaced.
            @param {String} replacementScriptRef Replacement script ref.
        */
        registerNativeScriptReplacement : function(scriptRefKeyword, replacementScriptRef)
        {
            var replacements = (typeof scriptRefKeyword === "object" ? scriptRefKeyword : undefined);
            if (replacements === undefined)
            {
                replacements = {};
                replacements[scriptRefKeyword] = replacementScriptRef;
            }
            var keys = Object.keys(replacements);
            for (var i = 0; i < keys.length; i++)
            {
                var keyword = keys[i];
                if (this.getNativeScriptReplacement(keyword) === undefined)
                {
                    this.nativeScriptReplacements.push({
                        keyword     : keyword,
                        replacement : replacements[keyword]
                    });
                }
                else
                    console.error("[EC_Script]: Native script replacement '" + keyword + "' already registered");
            }
        },

        getNativeScriptReplacement : function(keyword)
        {
            for (var i = 0; i < this.nativeScriptReplacements.length; i++)
            {
                if (this.nativeScriptReplacements[i].keyword.toLowerCase() === keyword.toLowerCase())
                    return this.nativeScriptReplacements[i];
            }
            return undefined;
        },

        localScriptReplacement : [],

        /**
            Registers a local replacement file for .webtundrajs scripts. Essentially allows you
            to use a local script for development/debug purpouses.
        */
        registerLocalScriptReplacement : function(scriptRefKeyword, replacementScriptRef)
        {
            this.localScriptReplacement.push({
                "keyword"     : scriptRefKeyword,
                "replacement" : replacementScriptRef
            });
        }
    },

    reset : function()
    {
        if (this.scriptAsset != null)
            this.scriptAsset.stop(this.parentEntity, this);
        this.scriptAsset = null;

        if (this.appInstanceStartedSub)
        {
            this.appInstanceStartedSub.reset();
            this.appInstanceStartedSub = undefined;
        }
    },

    /**
        Get a callback when the script asset has been loaded. Does not mean script execution, for that see onScriptStarted.

        @method onScriptLoaded
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @param {Number} [priority] The priority level of the event listener (default 0). Listeners with higher priority will
            be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onScriptLoaded : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onMeshLoaded, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Script." + this.parentEntity.id + "." + this.id + ".ScriptLoaded", context, callback);
    },

    /**
        Get a callback when the script is started. This is a convinient way to get hold of the instance object.
        Which allows you to directly call functions in the application and interact with it locally without using Entity actions.

        @method onScriptStarted
        @example
            ent.script.onScriptStarted(function(parentEntity, component, scriptAsset, app) {
                console.log(app.name, "started!");
                app.greet("hello world");
            }.bind(this));
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @param {Number} [priority] The priority level of the event listener (default 0). Listeners with higher priority will
            be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onScriptStarted : function(context, callback, priority)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onMeshLoaded, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Script." + this.parentEntity.id + "." + this.id + ".ScriptStarted", context, callback, priority);
    },

    _scriptLoaded : function(asset)
    {
        if (this.parentEntity == null)
        {
            this.log.warn("_scriptLoaded with null Parent Entity");
            return;
        }
        this.scriptAsset = asset;

        // onScriptLoaded event
        Tundra.events.send("EC_Script." + this.parentEntity.id + "." + this.id + ".ScriptLoaded", this.parentEntity, this, this.scriptAsset);

        if (!this.scriptAsset.running && this.attributes.runOnLoad.get())
        {
            var instance = this.scriptAsset.run(this.parentEntity, this, this.startupApplication);
            if (instance != null)
            {
                if (this.appInstanceStartedSub)
                    this.appInstanceStartedSub.reset();

                this.appInstanceStartedSub = instance.onApplicationStarted(this, function(inst, app)
                {
                    if (this.parentEntity == null)
                    {
                        console.error("Dead script sent a ScriptStarted event", this);
                        return;
                    }

                    // Unsubscribe from the instance start event. We only want to know it once
                    // @todo Figure out what to do with restarts
                    if (this.appInstanceStartedSub)
                    {
                        this.appInstanceStartedSub.reset();
                        this.appInstanceStartedSub = undefined;
                    }

                    // onScriptStarted event
                    Tundra.events.send("EC_Script." + this.parentEntity.id + "." + this.id + ".ScriptStarted", 
                            this.parentEntity, this, this.scriptAsset, app);
                });
            }
        }
    },

    update : function()
    {
        /// @todo EC_Script only runs the first script in the scriptRef list!

        if (!this.scriptsRequested)
        {
            if (this.scriptAsset != null)
                this.scriptAsset.stop(this.parentEntity, this);
            this.scriptAsset = null;

            var scriptRefs = this.attributes.scriptRef.getClone();
            if (scriptRefs.length == 0)
                return;
            if (scriptRefs[0] === undefined || scriptRefs[0] === "")
                return;
            this.scriptsRequested = true;

            if (this.attributes.runMode.get() === EC_Script.RunMode.Server)
            {
                this.log.debug("Skipping loading and execution of Server only Tundra application '" + scriptRefs[0] + "'");
                return;
            }

            var scriptReference = scriptRefs[0];
            var suffix = scriptReference.substring(scriptReference.lastIndexOf(".")).toLowerCase();
            var shouldRun = false;

            var printFilename = scriptReference.substring(scriptReference.lastIndexOf("/")+1);

            // Inspect if the ref is .webtundrajs and accept it.
            if (suffix === ".webtundrajs")
                shouldRun = true;

            // Check for dynamically registered native script replacements.
            // This is a easy way to replace a web client script with a native EC_Script ref
            // without having to modify the scene or add two client side scripts to it.
            if (!shouldRun)
            {
                for (var i = 0, len=EC_Script.nativeScriptReplacements.length; i < len; i++)
                {
                    var assetData = EC_Script.nativeScriptReplacements[i];
                    if (printFilename.toLowerCase().indexOf(assetData.keyword.toLowerCase()) !== -1)
                    {
                        if (assetData.replacement != null && assetData.replacement != "")
                        {
                            var replacementPrintRef = assetData.replacement.substring(assetData.replacement.lastIndexOf("/")+1);
                            this.log.infoC("Replacing native Tundra script '" + printFilename + "' with registered script '" + replacementPrintRef + "'");
                            scriptReference = assetData.replacement;
                            shouldRun = true;
                            break;
                        }
                    }
                }
            }
            // Local development replacements
            else
            {
                for (var i = 0, len=EC_Script.localScriptReplacement.length; i < len; i++)
                {
                    var assetData = EC_Script.localScriptReplacement[i];
                    if (printFilename.toLowerCase().indexOf(assetData.keyword.toLowerCase()) !== -1)
                    {
                        if (assetData.replacement != null && assetData.replacement != "")
                        {
                            var replacementPrintRef = assetData.replacement.substring(assetData.replacement.lastIndexOf("/")+1);
                            this.log.infoC("Replacing script '" + printFilename + "' with registered local development script '" + replacementPrintRef + "'");
                            scriptReference = assetData.replacement;
                            shouldRun = true;
                            break;
                        }
                    }
                }
            }

            if (!shouldRun)
            {
                this.log.debug("Skipping loading and execution of native Tundra application '" + printFilename + "'");
                return;
            }

            var transfer = Tundra.asset.requestAsset(scriptReference, "Script");
            if (transfer != null)
                transfer.onCompleted(this, this._scriptLoaded);
        }
    },

    attributeChanged : function(index, name, value)
    {
        // scriptRef
        if (index === 0)
        {
            /// @todo Force the transfer to fetch from web if ref changed!
            this.scriptsRequested = false;
            this.update();
        }
        // runOnLoad
        else if (index === 1)
        {
            // @todo This will not emit the onScriptStarted event! See _scriptLoaded.
            if (this.scriptAsset != null && !this.scriptAsset.running && value === true)
                this.scriptAsset.run(this.parentEntity, this, this.startupApplication);
        }
        // runMode
        else if (index === 2)
        {
        }
        // applicationName
        else if (index === 3)
        {
        }
        // className
        else if (index === 4)
        {
        }
    }
});

Scene.registerComponent(EC_Script);

return EC_Script;

}); // require js
