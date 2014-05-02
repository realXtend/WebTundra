// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2014
 */

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
        // Renderer
        "view/threejs/ThreeJsRenderer",
        // Plugins
        "plugins/scene-parser/SceneParserPlugin",
        "plugins/asset-redirect/AssetRedirectPlugin"
    ],
    function(THREE, $, _jqueryUI, _jqueryMW, _jqueryTA,
             Client,
             ThreeJsRenderer,
             SceneParserPlugin,
             AssetRedirectPlugin)
{
    // Create client
    var client = new Client({
        container     : "#webtundra-container-custom",
        renderSystem  : ThreeJsRenderer
    });

    // Configure asset redirects.
    var redirectPlugin = TundraSDK.plugin("AssetRedirectPlugin");
    redirectPlugin.registerAssetTypeSwap(".mesh", ".json", "ThreeJsonMesh");
    redirectPlugin.setupDefaultStorage();

    // App variables
    var freecamera = null;
//    var instructions = null;

/*
    // Connected to server
    client.onConnected(null, function() {
        // Setup initial camera position
        if (freecamera && freecamera.cameraEntity)
            freecamera.cameraEntity.placeable.setPosition(0, 8.50, 28.50);

        instructions = $("<div/>", { 
            text : "Click on the top sphere to start the physics simulation",
            css : {
                "position": "absolute",
                "width": 360,
                "background-color": "white",
                "top": 10,
                "left": 10,
                "padding": 10,
                "border-radius": 10,
                "text-align": "center"
            }
        });
        client.ui.addWidgetToScene(instructions);
        instructions.hide();
        instructions.fadeIn(5000);
*/
        var dirLight = new THREE.DirectionalLight();
        client.renderer.scene.add(dirLight);
//    });

    var sceneParserPlugin = TundraSDK.plugin("SceneParserPlugin");
    var xml3dParser = sceneParserPlugin.newXML3DParser(client.scene);
    $(document).ready(function() {
        xml3dParser.parseDocXml3D(document);

        // Start freecam app - after xml3d parsing because that actually creates the camera for us (from the <view> declaration)
        $.getScript("../../src/application/freecamera.js")
            .done(function( script, textStatus ) {
                freecamera = new FreeCameraApplication();
                freecamera.cameraEntity = TundraSDK.framework.renderer.activeCamera().parentEntity;
                freecamera.createCamera(); //doesn't actually create as we just created it but hooks event listeners etc
            })
            .fail(function(jqxhr, settings, exception) {
                console.error("Failed to load FreeCamera application:", exception);
            }
            );
    });
});
