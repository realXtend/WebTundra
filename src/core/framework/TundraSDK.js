
define([], function() {

/**
    Tundra SDK.
    @module TundraSDK
    @static
*/
var TundraSDK =
{
    /**
        Framework contains the instantiated client and its APIs.

        <b>Note:</b> All the properties are null before a client instance is constructed.
        @class TundraSDK.framework
        @static
    */
    framework :
    {
        /**
            @property client
            @type TundraClient
            @static
        */
        client      : null,
        /**
            @property network
            @type Network
            @static
        */
        network     : null,
        /**
            @property scene
            @type Scene
            @static
        */
        scene       : null,
        /**
            @property renderer
            @type IRenderSystem
            @static
        */
        renderer    : null,
        /**
            @property frame
            @type FrameAPI
            @static
        */
        frame       : null,
        /**
            @property events
            @type EventAPI
            @static
        */
        events      : null,
        /**
            @property asset
            @type AssetAPI
            @static
        */
        asset       : null,
        /**
            @property input
            @type InputAPI
            @static
        */
        input       : null,
        /**
            @property ui
            @type UiAPI
            @static
        */
        ui          : null,
        /**
            @property console
            @type ConsoleAPI
            @static
        */
        console     : null
    },

    /**
        @property plugins
        @type Array<ITundraPlugin>
        @static
    */
    plugins : [],

    /**
        Registers a plugin to the Tundra SDK. These plugins will get loaded to the client once instantiated.
        <b>Note:</b> Does not check if this plugin has already been registered!
        @method registerPlugin
        @param {ITundraPlugin} plugin The instantiated plugin.
    */
    registerPlugin : function(plugin)
    {
        if (plugin === undefined || plugin === null)
            return;
        plugin._setFramework(this.framework);
        this.plugins.push(plugin);
    },

    /**
        Returns a registered plugin by name.
        @method plugin
        @param {String} name Name of the plugin.
        @return {ITundraPlugin|null} The plugin or null if not found. 
    */
    plugin : function(name)
    {
        for (var i = 0; i < this.plugins.length; i++)
            if (this.plugins[i].name === name)
                return this.plugins[i];
        return null;
    },

    /**
        Tundra application contains utilities and properties for setup of dynamic script applications.
        @class TundraSDK.browser
        @static
    */
    browser :
    {
        /**
            If the underlying browser is Google Chrome.
            @property isChrome
            @type Boolean
            @static
        */
        isChrome    : navigator !== undefined ? navigator.userAgent.indexOf("Chrome") > -1 : false,
        /**
            If the underlying browser is Microsoft Internet Explorer.
            @property isExplorer
            @type Boolean
            @static
        */
        isExplorer  : navigator !== undefined ? navigator.userAgent.indexOf("MSIE") > -1 : false,
        /**
            If the underlying browser is Mozilla Firefox.
            @property isFirefox
            @type Boolean
            @static
        */
        isFirefox   : navigator !== undefined ? navigator.userAgent.indexOf("Firefox") > -1 : false,
        /**
            If the underlying browser is Apple Safari.
            @property isSafari
            @type Boolean
            @static
        */
        isSafari    : navigator !== undefined ? navigator.userAgent.indexOf("Safari") > -1 : false,
        /**
            If the underlying browser is Opera.
            @property isOpera
            @type Boolean
            @static
        */
        isOpera     : navigator !== undefined ? (navigator.userAgent.indexOf("Presto") > -1 || 
                                                 navigator.userAgent.indexOf("Opera")  > -1 ||
                                                 navigator.userAgent.indexOf("OPR/")   > -1) : false,
    },

    /**
        Stop debugger when check function fails.

        @property debugOnCheckFail
        @type Boolean
        @default false
        @static
    */
    debugOnCheckFail : false,
    /**
        Stop debugger when check function fails.

        @property debugOnCheckFail
        @type Boolean
        @default false
        @static
    */
    throwOnCheckFail : false,

    checkDefined : function()
    {
        if (!TundraSDK.debugOnCheckFail && !TundraSDK.throwOnCheckFail)
            return;
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] === undefined) {
                if (TundraSDK.debugOnCheckFail)
                    debugger;
                else if (TundraSDK.throwOnCheckFail)
                    throw ("undefined value, arg #" + i);
            }
        }
    },

    check : function()
    {
        if (!TundraSDK.debugOnCheckFail && !TundraSDK.throwOnCheckFail)
            return;

        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] !== true) {
                if (TundraSDK.debugOnCheckFail)
                    debugger;
                else if (TundraSDK.throwOnCheckFail)
                    throw ("untrue value" + arguments[i] + ", arg #" + i);
            }
        }
    }
};

// Global scope exposure of TundraSDK
window.TundraSDK = TundraSDK;

return TundraSDK;

}); // require js
