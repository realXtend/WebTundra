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
        "plugins/dom-integration/TundraDomIntegrationPlugin"
        // Input plugins
        //"core/input/InputGamepadPlugin",      /// @todo Check that this works and enable.
        //"core/input/InputTouchPlugin",        /// @todo Check that this works and enable.

    ],
    function($, _jqueryUI, _jqueryMW, _jqueryTA,
             Client,
             ThreeJsRenderer,
             TundraDomIntegrationPlugin
             //InputGamepadPlugin,
             //InputTouchPlugin
             )
{
    /** Set to true if you dont want loading screen, login controls
        and want a free camera to be created when apge loads.
        Enabled local app development without the need to tweak the client/APIs.
        @todo Make this clean by removing load screen from core and making it a plugin.
        @todo Additionally make ICameraApplication listing in TundraClient a plugin, the
        client is not the right place for it. */
    var localApp = false;

    // Create a new Web Rocket client
    var client = new Client({
        container              : "#webtundra-container-custom",
        renderSystem           : ThreeJsRenderer,
        asset : {
            localStoragePath   : "",
            scriptPostFix      : ""
        },
        loadingScreen : !localApp
    });

    // Run application. EC_Script is not yet implemented in the WebTundra SDK
    // so we are just going to ensure the scripts dependencies here and run it.
    $.getScript("../src/application/freecamera.js")
        .done(function( script, textStatus ) {
            var freecamera = new FreeCameraApplication();
            if (localApp)
                freecamera.createCamera();
        })
        .fail(function( jqxhr, settings, exception ) {
            console.error(exception);
        }
    );

    // Create login widgets
    var loginControls = $("<div/>", {
        id      : "login-controls"
    });
    var loginHost = $("<input/>", {
        id      : "login-host",
        type    : "text",
        value   : "ws://127.0.0.1:2345"
    });
    var loginUsername = $("<input/>", {
        id      : "login-username",
        type    : "text",
        value   : "WebTundra User"
    });
    var loginButton = $("<button/>", {
        id : "login-button",
        text : "Connect",
        css : {
            "font-size"   : 12,
        }
    }).button();

    loginControls.css({
        "position"  : "absolute",
        "top"       : 160,
        "left"      : 0,
        "width"     : "100%",
        "padding"   : 10,
        "border"    : 0,
        "z-index"   : 6,
        "text-align"  : "center",
        "font-family" : "Arial",
        "font-size"   : 14,
        "font-weight" : "bold",
        "background-color" : "transparent"
    });

    var inputs = [ loginHost, loginUsername, loginButton ];
    for (var i = 0; i < inputs.length; i++)
    {
        inputs[i].css({
            "min-width"     : 100,
            "max-height"    : 25,
            "margin-left"   : 6,
            "margin-right"  : 9,
            "padding"       : inputs[i] === loginButton ? 0 : 3,
            "border"        : "1px solid lightgrey",
            "border-radius" : 4
        });
    }

    loginControls.append("Host");
    loginControls.append(loginHost);
    loginControls.append("Username");
    loginControls.append(loginUsername);
    loginControls.append(loginButton);
    loginControls.fadeIn(1000);

    client.ui.addWidgetToScene(loginControls);

    loginButton.click(function() {
        if (!client.isConnected())
            client.connect(loginHost.val(), { username: loginUsername.val() });
        else
            client.disconnect();
    });

    // Connected to server
    client.onConnected(null, function() {
        loginHost.attr("disabled", "disabled");
        loginUsername.attr("disabled", "disabled");
        loginButton.text("Disconnect");
        loginControls.hide();

        client.ui.hideLoadingScreen();
    });

    // Disconnected from server
    client.onDisconnected(null, function() {
        loginHost.removeAttr("disabled");
        loginUsername.removeAttr("disabled");
        loginButton.text("Connect");
        loginControls.fadeIn(1000);
    });

    if (localApp)
        loginControls.hide();
});
