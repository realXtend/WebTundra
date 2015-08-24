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
        "lib/jquery"                    : { exports : "$" },
        "lib/jquery-ui"                 : [ "lib/jquery" ],
        "lib/jquery.mousewheel"         : [ "lib/jquery" ],
        "lib/jquery.titlealert.min"     : [ "lib/jquery" ],
        "lib/jquery.jgestures"          : [ "lib/jquery" ],
        "lib/jquery.contextmenu"        : [ "lib/jquery" ],
        "lib/three"                     : { exports : "THREE" },
        "lib/three/CSS3DRenderer"       : [ "lib/three" ],
        "lib/three/OBJLoader"           : [ "lib/three" ],
        "lib/polymer.min"               : { exports : "Polymer" }
    }
});

require([
        // Core deps
        "lib/jquery",
        "lib/jquery-ui",
        "lib/jquery.mousewheel",                /// @todo Remove as core dependency (afaik UiAPI)
        "lib/jquery.titlealert.min",            /// @todo Remove as core dependency (afaik UiAPI)
        // Client
        "core/framework/TundraClient",
        // Renderer
        "view/threejs/ThreeJsRenderer",
        // Plugins
        //"plugins/dom-integration/TundraDomIntegrationPlugin", // Disabled by default for performance reasons
        "plugins/login-screen/LoginScreenPlugin"
    ],
    function($, _jqueryUI, _jqueryMW, _jqueryTA,
             Client,
             ThreeJsRenderer,
             //TundraDomIntegrationPlugin, // Disabled by default for performance reasons
             LoginScreenPlugin)
{
    // Create a new Web Rocket client
    var client = new Client({
        container     : "#webtundra-container-custom",
        renderSystem  : ThreeJsRenderer
    });

    // Run application. EC_Script is not yet implemented in the WebTundra SDK
    // so we are just going to ensure the scripts dependencies here and run it.
    $.getScript("../src/application/freecamera.js")
        .done(function( script, textStatus ) {
            var freecamera = new FreeCameraApplication();
            /** Uncomment if you want a local camera to be created and activeted
                before you join a server. */
            //TundraSDK.plugin("LoginScreenPlugin").hide();
            //freecamera.createCamera();
        })
        .fail(function(jqxhr, settings, exception) {
            console.error("Failed to load FreeCamera application:", exception);
        }
    );
});
