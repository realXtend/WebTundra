
define(["core/framework/TundraPolyfills"], function(TundraPolyfills) {

/**
    @namespace
    @global
*/
var Tundra =
{
    /**
        DOM container for Tundra.
        @var {jQuery.Element}
        @readonly
    */
    container   : null,
    /**
        @var {TundraClient}
        @readonly
    */
    client      : null,
    /**
        ConfigAPI instance
        @type {ConfigAPI}
        @readonly
    */
    config      : null,
    /**
        EventAPI instance
        @type {EventAPI}
        @readonly
    */
    events      : null,
    /**
        Network instance
        @type {Network}
        @readonly
    */
    network     : null,
    /**
        FrameAPI instance
        @type {FrameAPI}
        @readonly
    */
    frame       : null,
    /**
        ConsoleAPI instance
        @type {ConsoleAPI}
        @readonly
    */
    console     : null,
    /**
        AssetAPI instance
        @type {AssetAPI}
        @readonly
    */
    asset       : null,
    /**
        InputAPI instance
        @type {InputAPI}
        @readonly
    */
    input       : null,
    /**
        UiAPI instance
        @type {UiAPI}
        @readonly
    */
    ui          : null,
    /**
        Scene instance
        @type {Scene}
        @readonly
    */
    scene       : null,
    /**
        Renderer instance
        @type {IRenderSystem}
        @readonly
    */
    renderer    : null,

    /**
        Returns the core API names.
        @return {Array.<String>}
    */
    APINames : function()
    {
        return [ "Tundra",
                 "TundraClient",
                 "ConfigAPI",
                 "Network",
                 "FrameAPI",
                 "EventAPI",
                 "AssetAPI",
                 "InputAPI",
                 "UiAPI",
                 "ConsoleAPI",
                 "Scene"
        ];
    },

    /// Deprecated. Works for accessing. Please update your code to not use this.
    framework : {},

    /**
        Tundra classes may optionally register themselves to this object.

            Note: This is mainly used for requirejs/polymer development as classes
            are not in the global scope in development mode.

        @type {Object}
    */
    Classes : {},

    /**
        @type {Array.<ITundraPlugin>}
        @readonly
    */
    pluginList : [],

    /**
        @type {Object}
        @readonly
    */
    plugins : {},

    /**
        Registers a plugin to the Tundra SDK. These plugins will get loaded to the client once instantiated.
        <b>Note:</b> Does not check if this plugin has already been registered!

        @param {ITundraPlugin} plugin The instantiated plugin.
    */
    registerPlugin : function(plugin)
    {
        if (plugin === undefined || plugin === null)
            return false;
        plugin._setFramework(this);
        this.pluginList.push(plugin);

        /* "SweetPlugin" -> "sweetPlugin"
           for Tundra.plugins.sweetPlugin.sweet() */
        var propertyName = plugin.pluginPropertyName();
        if (typeof propertyName !== "string" || propertyName === "")
            propertyName = plugin.name;
        if (typeof propertyName === "string" && propertyName !== "")
        {
            propertyName = propertyName.substring(0,1).toLowerCase() + propertyName.substring(1);
            if (this.plugins[propertyName] === undefined)
                this.plugins[propertyName] = plugin;
            else
                console.error("Plugin '" + plugin.name + "' property name '" + propertyName + "' is already reserved in Tundra.plugins. Skipping registration.");
        }
        return true;
    },

    /**
        Returns a registered plugin by name.

        @param {String} name Name of the plugin.
        @return {ITundraPlugin|null} The plugin or null if not found.
    */
    plugin : function(name)
    {
        for (var i = 0; i < this.pluginList.length; i++)
        {
            var plugin = this.pluginList[i];
            if (plugin.name === name)
                return plugin;
            else if (Array.isArray(plugin.nameAliases) && plugin.nameAliases.length > 0)
            {
                for (var nai = 0; nai < plugin.nameAliases.length; nai++)
                {
                    if (plugin.nameAliases[nai] === name)
                        return plugin;
                }
            }
        }
        return null;
    },

    /**
        Returns currently registered plugin names.

        @return {Array<String>}
    */
    pluginNames : function()
    {
        var names = [];
        for (var i = 0; i < this.pluginList.length; i++)
        {
            try
            {
                names.push(this.pluginList[i].name);
            }
            catch(e) {}
        }
        return names;
    },

    loadPlugins : function(options)
    {
        /// @todo Figure out if there is a sensible point where
        /// the plugins should be uninitialized, currently not
        /// done but its part of the interface.

        var i;
        for (i = 0; i < this.pluginList.length; i++)
        {
            if (this.pluginList[i].loaded === true)
                continue;

            try
            {
                var plugin = this.pluginList[i];
                plugin._initialize($.extend({}, options[plugin.name]));
            }
            catch(e)
            {
                console.error("[Tundra]: Failed to initialize " + this.pluginList[i].name + ":", e.toString());
                console.error(e.stack || e);

            }
        }
        // Post init plugins now that all plugins have been loaded.
        for (i = 0; i < Tundra.pluginList.length; i++)
        {
            try
            {
                var plugin = this.pluginList[i];
                plugin._postInitialize($.extend({}, options[plugin.name]));
            }
            catch(e)
            {
                console.error("[Tundra]: Failed to postInitialize " + this.pluginList[i].name + ":", e.toString());
                console.error(e.stack || e);
            }
        }
    },

    /**
        Stop debugger when check function fails.

        @var {Boolean}
        @default false
    */
    debugOnCheckFail : false,

    /**
        Stop debugger when check function fails.

        @type {Boolean}
        @default false
    */
    throwOnCheckFail : false,

    checkDefined : function()
    {
        if (!Tundra.debugOnCheckFail && !Tundra.throwOnCheckFail)
            return;
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] === undefined) {
                if (Tundra.debugOnCheckFail)
                    debugger;
                else if (Tundra.throwOnCheckFail)
                    throw ("undefined value, arg #" + i);
            }
        }
    },

    check : function()
    {
        if (!Tundra.debugOnCheckFail && !Tundra.throwOnCheckFail)
            return;

        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] !== true) {
                if (Tundra.debugOnCheckFail)
                    debugger;
                else if (Tundra.throwOnCheckFail)
                    throw ("untrue value" + arguments[i] + ", arg #" + i);
            }
        }
    },

    noop : function() {},

    /**
        Returns default options
        @return {Object}
    */
    getDefaultOptions : function()
    {
        return {
            requirejs : false,
            polymer   : false,
            deprecatedWarnings : false
        };
    },

    options : {},

    /**
        Returns if the Tundra is currently using requirejs.
        This is intended for certain debugging features in the internals.

        @return {Boolean}
    */
    usingRequireJS : function()
    {
        return (this.options.requirejs === true && typeof require === "function");
    },

    /**
        Returns if Polymer library is available.
        Useful for detecting user interface selection.

        @return {Boolean}
    */
    usingPolymer : function()
    {
        return (this.options.polymer === true && typeof Polymer === "function");
    },

    /* Deprecated. Use AssetAPI.loadDependencies. */
    resolvePolymerResources : function(resources)
    {
        // Always log this out as a reminded for us, it is not a part of official API yet.
        console.warn("DEPRECATED: Tundra.resolvePolymerResources > AssetAPI.loadDependencies");

        var out = [];
        if (!Array.isArray(resources))
            resources = [ resources ];

        for (var i = 0; i < resources.length; i++)
        {
            if (this.asset.isRelativeRef(resources[i]))
                out.push(this.asset.getLocalAssetPath(resources[i]));
            else
                out.push(resources[i]);
        }

        return out;
    },

    /**
        @type {Object}
    */
    browser :
    {
        /**
            If the underlying browser is Google Chrome.
            @type Boolean
        */
        isChrome    : navigator !== undefined ? navigator.userAgent.indexOf("Chrome") > -1 : false,
        /**
            If the underlying browser is Microsoft Internet Explorer.
            @type Boolean
        */
        isExplorer  : navigator !== undefined ? navigator.userAgent.indexOf("MSIE") > -1 : false,
        /**
            If the underlying browser is Mozilla Firefox.
            @type Boolean
        */
        isFirefox   : navigator !== undefined ? navigator.userAgent.indexOf("Firefox") > -1 : false,
        /**
            If the underlying browser is Apple Safari.
            @type Boolean
        */
        isSafari    : navigator !== undefined ? navigator.userAgent.indexOf("Safari") > -1 : false,
        /**
            If the underlying browser is Opera.
            @type Boolean
        */
        isOpera     : navigator !== undefined ? (navigator.userAgent.indexOf("Presto") > -1 ||
                                                 navigator.userAgent.indexOf("Opera")  > -1 ||
                                                 navigator.userAgent.indexOf("OPR/")   > -1) : false,

        // Simple form from http://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
        /**
            If the underlying browser is Android on mobile

            @return {Boolean}
        */
        isMobileAndroid: function()
        {
            var result = navigator.userAgent.match(/Android/i);
            return (result !== undefined && result !== null);
        },

        /**
            If the underlying browser is BlackBerry on mobile

            @return {Boolean}
        */
        isMobileBlackBerry: function()
        {
            var result = navigator.userAgent.match(/BlackBerry/i);
            return (result !== undefined && result !== null);
        },

        /**
            If the underlying browser is running on iOS (iPhone / iPad / iPod etc.)

            @return {Boolean}
        */
        isMobileiOS: function()
        {
            var result = navigator.userAgent.match(/iPhone|iPad|iPod/i);
            return (result !== undefined && result !== null);
        },

        /**
            If the underlying browser is Opera on mobile

            @return {Boolean}
        */
        isMobileOpera: function()
        {
            var result = navigator.userAgent.match(/Opera Mini/i);
            return (result !== undefined && result !== null);
        },

        /**
            If the underlying browser is Windows Mobile

            @return {Boolean}
        */
        isMobileWindows: function()
        {
            var result = navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
            return (result !== undefined && result !== null);
        },

        // @todo Clean this shit up
        _isMobileCached : undefined,

        /**
            Checks if WebTundra is ran on mobile phone

            @return {Boolean}
        */
        isMobile: function()
        {
            if (typeof this._isMobileCached === "boolean")
                return this._isMobileCached;
            this._isMobileCached = (this.isMobileAndroid() || this.isMobileiOS() || this.isMobileBlackBerry() || this.isMobileOpera() || this.isMobileWindows());
            return this._isMobileCached;
        },

        // From http://stackoverflow.com/questions/5916900/detect-version-of-browser
        /**
            Returns the name of the browser as string

            @return {String}
        */
        name : function()
        {
            var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if(/trident/i.test(M[1])){
                tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
                return 'IE '+(tem[1]||'');
                }
            if(M[1]==='Chrome'){
                tem=ua.match(/\bOPR\/(\d+)/)
                if(tem!=null)   {return 'Opera '+tem[1];}
                }
            M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
            if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
            return M[0];
        },

        // From http://stackoverflow.com/questions/5916900/detect-version-of-browser
        /**
            Returns the version of the browser as string

            @return {String}
        */
        version : function()
        {
            var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if(/trident/i.test(M[1])){
                tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
                return 'IE '+(tem[1]||'');
                }
            if(M[1]==='Chrome'){
                tem=ua.match(/\bOPR\/(\d+)/)
                if(tem!=null)   {return 'Opera '+tem[1];}
                }
            M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
            if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
            return M[1];
        }
    }
};

// Expose Tundra to the global scope with 'window'

window.Tundra    = Tundra;
window.TundraSDK = Tundra; // deprecate

// Backwards compatibility, don't document as public API

Object.defineProperties(Tundra.framework,
{
    client    : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.client > Tundra.client");
            return Tundra.client;
        }
    },
    network   : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.network > Tundra.network");
            return Tundra.network;
        }
    },
    scene     : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.scene > Tundra.scene");
            return Tundra.scene;
        }
    },
    renderer  : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.renderer > Tundra.renderer");
            return Tundra.renderer;
        }
    },
    frame     : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.frame > Tundra.frame");
            return Tundra.frame;
        }
    },
    events    : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.events > Tundra.events");
            return Tundra.events;
        }
    },
    asset     : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.asset > Tundra.asset");
            return Tundra.asset;
        }
    },
    input     : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.input > Tundra.input");
            return Tundra.input;
        }
    },
    ui        : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.ui > Tundra.ui");
            return Tundra.ui;
        }
    },
    console   : {
        get   : function() {
            if (Tundra.options.deprecatedWarnings)
                console.warn("DEPRECATED: Tundra.framework.console > Tundra.console");
            return Tundra.console;
        }
    }
});

return Tundra;

}); // require js
