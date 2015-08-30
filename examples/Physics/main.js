
require.config({
    // Module name
    name    : "main",
    
    // Base for all RequireJS paths
    baseUrl : "../../src",

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
        "lib/three",
        "lib/jquery",
        "lib/jquery-ui",
        "lib/jquery.mousewheel",                /// @todo Remove as core dependency (afaik UiAPI)
        "lib/jquery.titlealert.min",            /// @todo Remove as core dependency (afaik UiAPI)
        // Client
        "core/framework/TundraClient",
        "core/scene/EntityAction",
        // Renderer
        "view/threejs/ThreeJsRenderer",
        // Plugins
        "plugins/physics/AmmoPhysics"
    ],
    function(THREE, $, _jqueryUI, _jqueryMW, _jqueryTA,
             Client,
             EntityAction,
             ThreeJsRenderer,
             LoginScreenPlugin)
{
    // Create client
    var client = new Client({
        container     : "#webtundra-container-custom",
        renderSystem  : ThreeJsRenderer
    });
    
    var physics = TundraSDK.plugin("AmmoPhysics");

    // App variables
    var freecamera = null;
    var instructions = null;

    // Start freecam app
    $.getScript("physics.js")
        .done(function( script, textStatus ) {
            freecamera = new PhysicsApplication();
        })
        .fail(function(jqxhr, settings, exception) {
            console.error("Failed to load FreeCamera application:", exception);
        }
    );
});
