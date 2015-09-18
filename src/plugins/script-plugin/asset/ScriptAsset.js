
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/asset/IAsset",
        "core/script/IApplication"
    ], function(Class, Tundra, IAsset, IApplication) {

/**
    Represents a WebTundra JavaScript instance.

    @class ScriptAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var ScriptInstance = Class.$extend(
{
    __init__ : function(entity, component)
    {
        /**
            Parent entity id.
            @property entityId
            @type Number
        */
        this.entityId = entity.id;
        /**
            Parent entity id.
            @property componentId
            @type Number
        */
        this.componentId = component.id;
        /**
            IApplication instance.
            @property application
            @type IApplication
        */
        this.application = null;
        this.startupApplication = false;
    },

    setApplication : function(application)
    {
        this.application = application;
        this.startupApplication = application.startupApplication;

        Tundra.events.send("ScriptInstance." + this.entityId + "." + this.componentId + ".ScriptStarted", this, this.application);
    },

    isRunning : function()
    {
        return (this.application != null);
    },

    isStartupApplication : function()
    {
        return this.startupApplication;
    },

    stop : function()
    {
        if (!this.isRunning() || this.isStartupApplication())
            return false;

        /* @todo Should this be done in some destroy function. This looks like not the right place to do this
           if we some day have script restarts and the same listeners should be notified of the second start event.
           This remove will clear all existing listeners! */
        Tundra.events.remove("ScriptInstance." + this.entityId + "." + this.componentId + ".ScriptStarted", this, this.application);

        if (typeof this.application._onScriptDestroyed === "function")
        {
            try
            {
                this.application._onScriptDestroyed();
            }
            catch(e)
            {
                console.error("ScriptInstance.onScriptDestroyed threw exception:", e.stack || e);
            }
        }

        delete this.application;
        this.application = null;

        return true;
    },

    onApplicationStarted : function(context, callback)
    {
        // @todo What if already running?
        return Tundra.events.subscribe("ScriptInstance." + this.entityId + "." + this.componentId + ".ScriptStarted", context, callback);
    }
});

/**
    Represents a WebTundra JavaScript asset.

    @class ScriptAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var ScriptAsset = IAsset.$extend(
{
    __init__ : function(name)
    {
        this.$super(name, "ScriptAsset");

        /**
            The loaded script content as a string.
            @property script
            @type String
        */
        this.script = null;
        /**
            Instances of this script.
            @property instances
            @type Array<ScriptInstance>
        */
        this.instances = [];
    },

    _getInstance : function(parentEntity, parentComponent)
    {
        if (parentEntity == null || parentComponent == null)
            return null;
        for (var i = 0; i < this.instances.length; i++)
        {
            if (this.instances[i].entityId === parentEntity.id &&
                this.instances[i].componentId === parentComponent.id)
                return this.instances[i];
        }
        return null;
    },

    _stopAndRemoveInstance : function(parentEntity, parentComponent)
    {
        if (parentEntity == null || parentComponent == null)
            return;
        for (var i = 0; i < this.instances.length; i++)
        {
            if (this.instances[i].entityId === parentEntity.id &&
                this.instances[i].componentId === parentComponent.id)
            {
                if (this.instances[i].stop())
                    this.log.debug("Stopped instance of " + this.name + " (Entity: " + parentEntity.toString() + ", Component: " + parentComponent.toString() + ")");
                // Never unload startup applications
                if (!this.instances[i].isStartupApplication())
                    this.instances.splice(i, 1);
                return;
            }
        }
    },

    _getOrCreateInstance : function(parentEntity, parentComponent)
    {
        var instance = this._getInstance(parentEntity, parentComponent);
        if (instance == null)
        {
            this.log.debug("Creating instance of " + this.name + " (Entity: " + parentEntity.toString() + ", Component: " + parentComponent.toString() + ")");
            instance = new ScriptInstance(parentEntity, parentComponent);
            this.instances.push(instance);
        }
        return instance;
    },

    _setApplication : function(application)
    {
        var instance = this._getInstance(application.entity, application.component);
        if (instance != null && !Tundra.usingRequireJS())
        {
            /** This function is called in IApplication ctor end. The actualy apps ctor
                has not been ran yet. Do a random async wait here before setting app
                and triggering the onApplicationStarted event (that then goes to EC_Script.onScriptStarted).
                @todo Fix this to be proper when script does not use requirejs. */
            setTimeout(function() {
                instance.setApplication(application);
            }, 10);
        }
    },

    requireJsModuleName : function()
    {
        return "lib/require.webtundrajs.loader!" + this.name;
    },

    isLoaded : function()
    {
        return (this.script !== null);
    },

    isRunning : function(parentEntity, parentComponent)
    {
        var instance = this._getInstance(parentEntity, parentComponent);
        return (instance != null && instance.application != null);
    },

    deserializeFromData : function(data, dataType, transfer)
    {
        this.script = data;
    },

    unload : function()
    {
        this.script = null;
        this.stop();
    },

    /**
        Runs the script in the global JavaScript context. If the script is already running or loading failed this function does nothing.
        Executing the script might be instantenious or there might be dependency modules to be loaded, depending on the scripts technology choices.
        You can monitor actual execution start from the returned ScriptInstance.

        @todo Reloading apps during runtime is probably broken in terms of the "started" signaling.

        @method run
        @param {Entity} parentEntity Parent entity that gets set to a global data object that gets read and stored with IApplication during loading.
        @param {IComponent} parentComponent Parent component.
        @return {ScriptInstance} Created script instance.
    */
    run : function(parentEntity, parentComponent, isStartupApplication)
    {
        var instance = null;

        if (!this.isLoaded())
            return instance;
        /// @todo Support reloads with 4th param 'forceRestart'
        if (this.isRunning(parentEntity, parentComponent))
            return instance;

        if (parentEntity === undefined || parentEntity === null)
        {
            this.log.error("Tried to run script " + this.name + " with null parent Entity");
            return instance;
        }
        if (parentComponent === undefined || parentComponent === null)
        {
            this.log.error("Tried to run script " + this.name + " with null parent EC_Script");
            return instance;
        }
        if (isStartupApplication === undefined || isStartupApplication === null)
            isStartupApplication = false;

        // Detect if this is a RequireJS application.
        if (Tundra.usingRequireJS() && this.script.indexOf("define(") !== -1)
        {
            instance = this._getOrCreateInstance(parentEntity, parentComponent);

            var that = this;
            require([this.requireJsModuleName()], function(Application)
            {
                IApplication._setupStatic(parentEntity, parentComponent, that.name, isStartupApplication /* script asset instance is left out in requirejs case on purpose */);

                try
                {
                    instance.setApplication(new Application());
                }
                catch(e)
                {
                    that.log.error(that.name + " instance requirejs execution failed: " + e);
                    that.log.error(typeof Application, Application);
                    if (e.stack !== undefined)
                        console.error(e.stack);
                    that.script = null;
                    that._stopAndRemoveInstance(parentEntity, parentComponent);
                }

                IApplication._resetStatic();
            });
        }
        // Otherwise run global eval on the script.
        else
        {
            instance = this._getOrCreateInstance(parentEntity, parentComponent);
            IApplication._setupStatic(parentEntity, parentComponent, this.name, isStartupApplication, this);

            try
            {
                $.globalEval(this.script);
            }
            catch(e)
            {
                this.log.error(this.name + " instance eval execution failed: " + e);
                if (e.stack !== undefined)
                    console.error(e.stack);
                this.script = null;
                this._stopAndRemoveInstance(parentEntity, parentComponent);
            }

            IApplication._resetStatic();
        }
        return instance;
    },

    stop : function(parentEntity, parentComponent)
    {
        // Stop one instance
        if (parentEntity !== undefined && parentComponent !== undefined)
            this._stopAndRemoveInstance(parentEntity, parentComponent);
        else
        {
            // Stop all non startup application instances and undefine the require js module
            var anyStopped = false;
            for (var i = 0; i < this.instances.length; i++)
            {
                if (this.instances[i].stop())
                    anyStopped = true;
                if (!this.instances[i].isStartupApplication())
                {
                    this.instances.splice(i, 1);
                    i--;
                }
            }

            if (anyStopped && this.instances.length === 0)
                this.log.debug("Stopped all running instances of " + this.name);

            if (this.instances.length === 0 && Tundra.usingRequireJS())
                requirejs.undef(this.requireJsModuleName());
        }
    }
});

return ScriptAsset;

}); // require js
