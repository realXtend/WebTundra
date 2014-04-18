
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
        "lib/jquery",
        "lib/jquery-ui",
        "lib/jquery.mousewheel",                /// @todo Remove as core dependency (afaik UiAPI)
        "lib/jquery.titlealert.min",            /// @todo Remove as core dependency (afaik UiAPI)
        // Client
        "core/framework/TundraClient",
        // Renderer
        "view/threejs/ThreeJsRenderer",
        // Plugins
        "plugins/login-screen/LoginScreenPlugin",
        "plugins/asset-redirect/AssetRedirectPlugin"
    ],
    function($, _jqueryUI, _jqueryMW, _jqueryTA,
             Client,
             ThreeJsRenderer,
             LoginScreenPlugin)
{
    // Setup loading screen
    LoginScreenPlugin.LoadingScreenHeaderText = "WebTundra Physics2 Example";
    LoginScreenPlugin.LoadingScreenHeaderLinkUrl = "https://github.com/realXtend/tundra/tree/tundra2/bin/scenes/Physics2";

    // Create a new Web Rocket client
    var client = new Client({
        container     : "#webtundra-container-custom",
        renderSystem  : ThreeJsRenderer
    });

    var redirectPlugin = TundraSDK.plugin("AssetRedirectPlugin");
    redirectPlugin.registerAssetTypeSwap(".mesh", ".json", "ThreeJsonMesh");
    redirectPlugin.setupDefaultStorage();

    var freecamera = null;

    $.getScript("../../src/application/freecamera.js")
        .done(function( script, textStatus ) {
            freecamera = new FreeCameraApplication();
        })
        .fail(function(jqxhr, settings, exception) {
            console.error("Failed to load FreeCamera application:", exception);
        }
    );

    client.onConnected(null, function() {
        if (freecamera && freecamera.cameraEntity)
            freecamera.cameraEntity.placeable.setPosition(0, 8.50, 28.50);
    });
});
