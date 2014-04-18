
define([
        "core/framework/TundraSDK",
        "core/framework/ITundraPlugin"
    ], function(TundraSDK, ITundraPlugin) {

/**
    This plugin provides a basic user interface for connecting to a server with a username.

    @class LoginScreenPlugin
    @extends ITundraPlugin
    @constructor
*/
var LoginScreenPlugin = ITundraPlugin.$extend(
{
    __init__ : function()
    {
        this.$super("LoginScreenPlugin");

        /**
            Login properties that will be sent to the server. Application/plugin code can set custom properties to this
            before a connection is made. This property map will be cleared when server connection is disconnected.
            
            Note: 'username' will always be overwritten from the UI controls of this plugin.

            @property loginProperties
            @type Object
        */
        this.loginProperties = {};

        // Private
        this.ui = {};
        this.loadingScreen = null;
        this.transfersPeak = 0;
        this.transfersProgress = -1;
    },

    __classvars__ :
    {
        /**
            If login controls are enabled and should be shown.
                
            @property LoginControlsEnabled
            @type Boolean
            @static
        */
        LoginControlsEnabled : true,
        /** 
            If loading screen is enabled and should be shown.
            
            @property LoadingScreenEnabled
            @type Boolean
            @static
        */
        LoadingScreenEnabled : true,
        /** 
            If loading screen should auto update asset progress.
            This does not disable hiding loading screen after all 
            asset transfers have completed.
            
            @property LoadingScreenAutoUpdateAssetProgress
            @type Boolean
            @static
        */
        LoadingScreenAutoUpdateAssetProgress : true,
        /**
            Text that appears to the loading screen while 
            the world assets are being loaded
            
            @property LoadingScreenConnectingText
            @type String
            @static
        */
        LoadingScreenConnectingText : "Loading Scene",
        /**
            Loading screen header text.
            
            @property LoadingScreenHeaderText
            @type String
            @static
        */
        LoadingScreenHeaderText     : "realXtend WebTundra",
        /** 
            Loading screen header link url.
            
            @property LoadingScreenHeaderLinkUrl
            @type String
            @static
        */
        LoadingScreenHeaderLinkUrl  : "https://github.com/realXtend/WebTundra"
    },

    initialize : function()
    {
        this.framework.client.onConnectionError(this, this.onConnectionError);
        this.framework.client.onConnected(this, this.onConnectedToServer);
        this.framework.client.onDisconnected(this, this.onDisconnectedFromServer);
        this.framework.asset.onActiveAssetTransferCountChanged(this, this.onActiveAssetTransferCountChanged);
        this.framework.ui.onWindowResize(this, this.onWindowResized);

        this.createLoginControls();
        this.showLoadingScreen();
    },

    hide : function()
    {
        this.hideLoginControls();
        this.hideLoadingScreen(true);
    },

    createLoginControls : function()
    {
        if (!LoginScreenPlugin.LoginControlsEnabled)
            return;

        this.ui.loginControls = $("<div/>", {
            id      : "login-controls"
        });
        this.ui.loginHost = $("<input/>", {
            id      : "login-host",
            type    : "text",
            value   : "ws://127.0.0.1:2345"
        });
        this.ui.loginUsername = $("<input/>", {
            id      : "login-username",
            type    : "text",
            value   : "WebTundra User"
        });
        this.ui.loginError = $("<div/>", {
            id      : "login-error",
            css : {
                "padding"     : 15,
                "font-size"   : 16,
                "color"       : "red"
            }
        });
        this.ui.loginButton = $("<button/>", {
            id      : "login-button",
            text    : "Connect",
            css : {
                "font-size"   : 12,
                "font-weight" : "bold"
            }
        }).button();

        this.ui.loginControls.css({
            "position"          : "absolute",
            "top"               : 180,
            "left"              : 0,
            "width"             : "100%",
            "padding"           : 10,
            "border"            : 0,
            "z-index"           : 6,
            "text-align"        : "center",
            "font-family"       : "Arial",
            "font-size"         : 14,
            "font-weight"       : "bold",
            "background-color"  : "transparent"
        });

        var inputs = [ this.ui.loginHost, this.ui.loginUsername, this.ui.loginButton ];
        for (var i = 0; i < inputs.length; i++)
        {
            inputs[i].css({
                "min-width"     : 100,
                "max-height"    : 25,
                "margin-left"   : 6,
                "margin-right"  : 9,
                "padding"       : inputs[i] === this.ui.loginButton ? 0 : 3,
                "border"        : "1px solid lightgrey",
                "border-radius" : 4
            });
        }

        this.ui.loginControls.append("Host");
        this.ui.loginControls.append(this.ui.loginHost);
        this.ui.loginControls.append("Username");
        this.ui.loginControls.append(this.ui.loginUsername);
        this.ui.loginControls.append(this.ui.loginButton);
        this.ui.loginControls.append(this.ui.loginError);
        this.ui.loginControls.fadeIn(1000);

        this.framework.ui.addWidgetToScene(this.ui.loginControls);

        // Login button click
        this.ui.loginButton.click(this.onToggleConnectionState.bind(this));
    },

    onToggleConnectionState : function()
    {
        this.ui.loginError.text("");

        if (!this.framework.client.isConnected())
        {
            // Merge username to the custom login properties.
            if (this.loginProperties === undefined)
                this.loginProperties = {};
            this.loginProperties.username = this.ui.loginUsername.val()

            this.framework.client.connect(this.ui.loginHost.val(), this.loginProperties);
        }
        else
            this.framework.client.disconnect();
    },

    onConnectionError : function(event)
    {
        if (this.ui.loginError !== undefined)
            this.ui.loginError.text("Failed to connect to " + event.target.url);
    },

    onConnectedToServer : function()
    {
        this.updateLoadingScreen(LoginScreenPlugin.LoadingScreenConnectingText, 0);

        if (LoginScreenPlugin.LoginControlsEnabled)
        {
            this.ui.loginHost.attr("disabled", "disabled");
            this.ui.loginUsername.attr("disabled", "disabled");
            this.ui.loginButton.button("option", "label", "Disconnect");

            this.hideLoginControls(false);

            /** This is here to hide the screen if no assets from the scene failed to ever
                get started by AssetAPI. For example it being full of Ogre assets that can't
                be loaded with WebTundra. */
            setTimeout(function() {
                if (this.isLoadingScreenVisible() && this.framework.asset.allTransfersCompleted())
                {
                    this.log.debug("Seems there are no pending asset transfers, hiding loading screen...");
                    this.hideLoadingScreen();
                }
            }.bind(this), 2500);
        }
    },

    onDisconnectedFromServer : function()
    {
        this.showLoadingScreen();

        if (LoginScreenPlugin.LoginControlsEnabled)
        {
            this.ui.loginHost.removeAttr("disabled");
            this.ui.loginUsername.removeAttr("disabled");
            this.ui.loginButton.button("option", "label", "Connect");

            // Reset login properties now
            this.loginProperties = {};

            this.showLoginControls();
        }
    },

    showLoginControls : function()
    {
        this.ui.loginControls.fadeIn(1000);
    },

    hideLoginControls : function(animate)
    {
        if (this.ui.loginControls === undefined)
            return;

        if (animate === undefined || animate === true)
            this.ui.loginControls.fadeOut(500);
        else
            this.ui.loginControls.hide();
    },

    isLoadingScreenVisible : function()
    {
        return (this.loadingScreen != null);
    },

    showLoadingScreen : function()
    {
        if (!LoginScreenPlugin.LoadingScreenEnabled || this.loadingScreen != null)
            return;

        this.loadingScreen = { done: false };
        this.transfersPeak = 0;
        this.transfersProgress = -1;

        this.loadingScreen.screen = $("<div/>", { id : "webtundra-loading-screen" });
        this.loadingScreen.screen.css({
            "position"          : "absolute",
            "width"             : "100%",
            "height"            : "100%",
            "background-color"  : "rgb(248,248,248)"
        });

        if (TundraSDK.browser.isOpera)
            this.loadingScreen.screen.css("background-image", "-o-linear-gradient(rgb(248,248,248),rgb(190,190,190))");
        else if (TundraSDK.browser.isFirefox)
            this.loadingScreen.screen.css("background-image", "-moz-linear-gradient(top, rgb(248,248,248), rgb(190,190,190))");
        else if (TundraSDK.browser.isChrome || TundraSDK.browser.isSafari)
            this.loadingScreen.screen.css("background-image", "-webkit-gradient(linear, left top, left bottom, color-stop(0, rgb(248,248,248)), color-stop(0.8, rgb(190,190,190)))");

        this.loadingScreen.text = $("<div/>", {
            id   : "webtundra-loading-screen-label",
        }).css({
            "color"             : "rgb(50,50,50)",
            "text-align"        : "center",
            "font-family"       : "Verdana",
            "font-weight"       : "bold",
            "font-size"         : "36pt",
            "text-align"        : "center",
            "vertical-align"    : "center",
            "text-decoration"   : "none"
        });
        var rexLink = $("<a/>", {
            text   : LoginScreenPlugin.LoadingScreenHeaderText,
            href   : LoginScreenPlugin.LoadingScreenHeaderLinkUrl,
            target : "_blank"
        });
        rexLink.css({
            "color"             : "rgb(50,50,50)",
            "text-align"        : "center",
            "font-family"       : "Verdana",
            "font-weight"       : "bold",
            "font-size"         : "36pt",
            "text-align"        : "center",
            "vertical-align"    : "bottom",
            "text-decoration"   : "none"
        });
        this.loadingScreen.text.append(rexLink);

        this.loadingScreen.progress = $("<div/>", {
            id   : "webtundra-loading-screen-progress"
        });
        this.loadingScreen.progress.css({
            "color"             : "rgba(50,50,50, 0.0)",
            "text-align"        : "center",
            "font-family"       : "Verdana",
            "font-weight"       : "bold",
            "font-size"         : "80pt",
            "vertical-align"    : "center"
        });
        this.loadingScreen.progress.hide();

        this.loadingScreen.hideButton = $("<div/>", {
            id   : "webtundra-loading-screen-hidebutton",
            html : "Hide Loading Screen"
        });
        this.loadingScreen.hideButton.css({
            "color"             : "rgba(50,50,50,0.6)",
            "font-family"       : "Verdana",
            "font-weight"       : "bold",
            "font-size"         : "7pt",
            "position"          : "absolute",
            "top"               : 5,
            "left"              : 5
        });
        this.loadingScreen.hideButton.click(function(e) {
            /** @todo Evaluate if loading screen can be 
                hidden before server connection open. */
            if (this.loadingScreen.progress.text() != "")
            {
                this.hideLoadingScreen();
                e.preventDefault();
                e.stopPropagation();
            }
        }.bind(this));

        this.loadingScreen.screen.append(this.loadingScreen.hideButton);
        this.loadingScreen.screen.append(this.loadingScreen.text);
        this.loadingScreen.screen.append(this.loadingScreen.progress);

        this.framework.ui.addWidgetToScene(this.loadingScreen.screen);

        this.loadingScreen.text.hide();
        this.loadingScreen.text.fadeIn(1000);

        this.onWindowResized();
    },

    /**
        Updates the scene loading screen with your text and progress percentage. Does nothing if loading screen has been hidden.
        @method updateLoadingScreen
        @param {String} [text=null] Text to show. If null or undefined the current text is kept.
        @param {Number} [progress=null] Progress percentage to show with range 0-100.
    */
    updateLoadingScreen : function(text, progress)
    {
        // We don't have a network connection, this must be triggered from loading startup applications.
        /// @todo Evaluate if we want to do this, local apps might load stuff too to the scene etc.
        if (TundraSDK.framework.client.websocket === null)
            return;

        if (!LoginScreenPlugin.LoadingScreenEnabled || this.loadingScreen == null || this.loadingScreen.done)
            return;

        if (text != null && this.loadingScreen.text != null)
            this.loadingScreen.text.text(text);
        if (progress != null && this.loadingScreen.progress != null)
        {
            if (this.loadingScreen.completedOnce !== undefined && this.loadingScreen.completedOnce === true)
                return;

            var wasVisible = this.loadingScreen.progress.is(":visible");
            if (progress < 100)
            {
                var stop = progress/100.0;
                if (stop > 0.9) stop = 0.9;
                this.loadingScreen.progress.html(progress + "<span style='font-size: 20pt;color:rgba(50,50,50," + stop + ");'>%</span>");
                this.loadingScreen.progress.css("color", "rgba(242,154,41, " + stop + ")");
            }
            else
            {
                this.loadingScreen.completedOnce = true;
                this.loadingScreen.text.html("Loading completed<br><span style='color:rgba(50,50,50, 0.4);font-size: 28pt';>Please wait</span>");
                this.loadingScreen.progress.text("");
                this.loadingScreen.progress.hide();
                this.onWindowResized();
            }

            if (!wasVisible)
            {
                this.loadingScreen.progress.show();
                this.onWindowResized();
            }
        }
    },

    /**
        Hides the loading screen revealing the 3D rendering. Does nothing if the loading screen is already hidden.
        @method hideLoadingScreen
    */
    hideLoadingScreen : function(ignoreConnectedState)
    {
        if (ignoreConnectedState === undefined)
            ignoreConnectedState = false;

        // We don't have a network connection, this must be triggered from loading startup applications.
        if (!ignoreConnectedState && TundraSDK.framework.client.websocket === null)
            return;

        if (this.loadingScreen == null || this.loadingScreen.done)
            return;

        this.transfersPeak = 0;
        this.transfersProgress = -1;

        this.loadingScreen.done = true;
        this.loadingScreen.hideButton.remove();

        var that = this;
        this.loadingScreen.screen.fadeOut(2000, function() {
            that.loadingScreen.screen.remove();
            that.loadingScreen.screen = null;
            that.loadingScreen = null;
            that.onWindowResized();
        });
    },

    onWindowResized : function()
    {
        if (this.loadingScreen != null && !this.loadingScreen.done)
        {
            this.loadingScreen.screen.position({
                my : "left top",
                at : "left top",
                of : this.loadingScreen.screen.parent()
            });

            this.loadingScreen.text.position({
                my : "left top",
                at : "left top+100",
                of : this.loadingScreen.screen
            });

            this.loadingScreen.progress.position({
                my : "left top",
                at : "left bottom+25",
                of : this.loadingScreen.text
            });
        }
    },

    onActiveAssetTransferCountChanged : function(numTransfers)
    {
        if (!LoginScreenPlugin.LoadingScreenEnabled || this.loadingScreen == null || this.loadingScreen.done)
            return;

        if (this.transfersPeak < numTransfers)
            this.transfersPeak = numTransfers;

        if (LoginScreenPlugin.LoadingScreenAutoUpdateAssetProgress && this.transfersPeak > 0)
        {
            // Don' let the progress go below last previously set %
            var progress = Number(100 - (numTransfers / this.transfersPeak) * 100);
            if (progress > this.transfersProgress)
            {
                this.transfersProgress = progress;
                this.updateLoadingScreen(null, progress.toFixed(0));
            }
        }
        if (numTransfers === 0)
        {
            // Put a slight delay on transfers completed and hiding the UI
            setTimeout(function() {
                if (this.framework.asset.allTransfersCompleted())
                    this.hideLoadingScreen();
            }.bind(this), 500)
        }
    }
});

TundraSDK.registerPlugin(new LoginScreenPlugin());

return LoginScreenPlugin;

}); // require js
