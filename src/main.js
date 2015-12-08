/**
    This is the main entry point script for RequireJS.

    The file declares all the dependencies, paths and modules that it needs to be ran.
    For the core SDK we depend on the TundraClient, the renderer that we want to use
    and any optional plugins.

    RequireJS will make sure all these dependencies can be found and loads them in
    the correct order for everyones dependencies to be satisfied. Once this is done
    the function we pass to 'require' will be invoked and the application can start
    its execution.
*/
require.config({
    // Module name
    name    : "main",
    
    // Base for all RequireJS paths
    baseUrl : "../src",

    /** Shims for dependency load order. Eg. jquery-ui depends jquery to be loaded so it can attach itself.
        'exports' is a way to note what the module will export to the global window object. */
    shim    :
    {
        "lib/jquery-ui"                 : [ "jquery" ],
        "lib/jquery.mousewheel"         : [ "jquery" ],
        "lib/jquery.titlealert.min"     : [ "jquery" ],
        "lib/jquery.jgestures"          : [ "jquery" ],
        "lib/jquery.contextmenu"        : [ "jquery" ],
        "lib/three"                     : { exports : "THREE" },
        "lib/three/DDSLoader"           : [ "lib/three" ],
        "lib/three/CSS3DRenderer"       : [ "lib/three" ],
        "lib/three/OBJLoader"           : [ "lib/three" ],
        "lib/polymer.min"               : { exports : "Polymer" },
        "lib/ammo"                      : { exports : "Ammo" }
    },
    paths :
    {
        "jquery"            : "lib/jquery",

    }
});

require([
        // Core deps
        "jquery",
        "lib/jquery-ui",
        "lib/jquery.mousewheel",                /// @todo Remove as core dependency (afaik UiAPI)
        "lib/jquery.titlealert.min",            /// @todo Remove as core dependency (afaik UiAPI)
        // Client
        "core/framework/Tundra",
        "core/framework/TundraClient",
        "core/framework/CoreStringUtils",
        // Renderer
        "view/threejs/ThreeJsRenderer",
        // Needed components on this page
        "entity-components/EC_Script",
        // Plugins
        //"plugins/dom-integration/TundraDomIntegrationPlugin", // Disabled by default for performance reasons
        "plugins/login-screen/LoginScreenPlugin",
        "plugins/ogre-plugin/OgrePlugin",
        "plugins/script-plugin/ScriptPlugin",
        "plugins/audio/AudioPlugin"
        //"plugins/physics/AmmoPhysics", // Disabled by default as server typically simulates physics; client-side physics can be performance-heavy

    ],
    function($, _jqueryUI, _jqueryMW, _jqueryTA,
             Tundra,
             Client,
             CoreStringUtils,
             ThreeJsRenderer,
             EC_Script,
             //TundraDomIntegrationPlugin, // Disabled by default for performance reasons
             LoginScreenPlugin,
             OgrePlugin,
             ScriptPlugin, AudioPlugin /*, AmmoPhysics*/)
    {
        var createClient = function()
        {
            // Create a new WebTundra client
            new Client({
                Tundra : {
                    requirejs : true,
                    polymer   : (typeof Polymer === "function"),
                    deprecatedWarnings : true
                },
                TundraClient : {
                    renderer  : ThreeJsRenderer,
                    container : "#webtundra-container-custom",
                    loglevel  : "debug",
                    applications : {
                        "Freecamera" : "webtundra-applications://freecamera.webtundrajs",
                        "Editor" : "webtundra-applications://editor/WebTundraEditor.webtundrajs"
                    }
                },
                AssetAPI : {
                    storages : {
                        "webtundra-applications://" : "../src/application",
                        "webtundra-examples://" : "../html/examples"
                    }
                },
                FrameAPI : {
                    limit : undefined,
                },
                UiAPI : {
                    fps : true,
                },
                Renderer : {
                    logarithmicDepthBuffer : CoreStringUtils.queryValueBool("logdepth")
                },
                plugins : {
                    LoginScreenPlugin : {
                        loginControlsEnabled : true,
                        loadingScreenEnabled : true,
                        headerText     : "realXtend WebTundra",
                        headerLinkUrl  : "http://realxtend.org",
                        connectingText : "Loading 3D Space"
                    }
                }
            });

            var example = CoreStringUtils.queryValue("example");
            if (example != "")
            {
                jQuery.ajax({
                    type: "GET",
                    url: "examples/" + example + "/scene.txml",
                    dataType: "xml",
                    success: function(txmlDoc) {
                        Tundra.scene.deserializeFromXml(txmlDoc);
                    }
                });
            }
        };

        /* Single place to change your server host entry point.
           Will be used for proxy detection and tundra server.
           Define this to your LAN IP to allow other people to
           use your web-tundra login page, server and proxy.
           eg. mobile phone connecting to your dev environment. */
        Tundra.DeveloperServerHost = window.location.hostname || "127.0.0.1";

        // Wait for polymer if loaded
        if (typeof Polymer === "function")
            Polymer.whenReady(createClient);
        else
            createClient();
});
