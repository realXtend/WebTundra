
define([
        "lib/classy",
        "lib/jquery.contextmenu",
        //"lib/polymer.min", // disabled for now!
        "core/framework/TundraSDK"
    ], function(Class, jQueryContextMenu, /*Polymer,*/ TundraSDK) {

/**
    UiAPI that is accessible from {{#crossLink "TundraClient/ui:property"}}TundraClient.ui{{/crossLink}}

    Provides utilities to add your widget to the 2D DOM scene, lets you add shortcuts to the WebTundra taskbar etc.
    @class UiAPI
    @constructor
*/
var UiAPI = Class.$extend(
{
    __init__ : function(params)
    {
        this.tabActive = true;

        this.buttons = [];
        this.numContextMenus = 0;

        this.createTaskbar(params.taskbar);
        this.createConsole(params.console);

        // Hide scroll bars
        $("html").css("overflow", "hidden");
        $("body").css("overflow", "hidden");

        window.addEventListener("resize", this.onWindowResizeDOM, false);

        var that = this;
        $(window).focus(function()
        {
            if (!that.tabActive)
                that.tabActive = true;
        });
        $(window).blur(function()
        {
            if (that.tabActive)
                that.tabActive = false;
        });

        TundraSDK.framework.client.onConnected(this, this.onConnected);
        TundraSDK.framework.client.onDisconnected(this, this.onDisconnected);
    },

    postInitialize : function()
    {
        // FPS counter
        this.fps = $("<div/>", { id : "webtundra-fps" });
        this.fps.css({
            "background-color"  : "transparent",
            "position"          : "absolute",
            "color"             : "black",
            "font-family"       : "Arial",
            "font-size"         : "18pt",
            "font-weight"       : "bold",
            "z-index"           : parseInt(this.console != null ? this.console.css("z-index") : "49") + 1
        });
        this.fps.width(60);
        this.fps.height(30);
        this.fps.fpsFrames = 0;
        this.fps.fpsTime = 0;
        this.fps.alwaysShow = (typeof require === "function");
        this.fps.hide();
        this.fps.cachedVisible = false;

        this.addWidgetToScene(this.fps);

        // Arrage UI elements
        this.onWindowResizeInternal();

        // Register console command
        TundraSDK.framework.console.registerCommand("clear", "Clears the console messages", null, this, this.clearConsole);
        TundraSDK.framework.console.registerCommand("showFps", "Toggles if FPS counter is shown", null, this, function() {
            this.fps.alwaysShow = !this.fps.alwaysShow;
            if (this.fps.alwaysShow)
            {
                if (!this.fps.cachedVisible)
                {
                    this.fps.fadeIn();
                    this.fps.cachedVisible = true;
                }
            }
            else if (this.console != null && !this.console.is(":visible"))
            {
                this.fps.fadeOut();
                this.fps.cachedVisible = false;
            }
        });
    },

    reset : function()
    {
        // Remove created buttons
        for (var i = 0; i < this.buttons.length; i++)
            this.buttons[i].remove();
        this.buttons = [];

        // Remove created context menus
        for (var i = 0; i < this.numContextMenus; i++)
        {
            var contextMenu = $("#webtundra-context-menu-" + i);
            if (contextMenu != null) contextMenu.remove();
        }
        this.numContextMenus = 0;

        // Arrage UI elements
        this.onWindowResizeInternal();
    },

    onConnected : function()
    {
        TundraSDK.framework.input.onKeyPress(this, this.onKeyPress);
        TundraSDK.framework.frame.onUpdate(this, this.onUpdate);

        if (this.fps.alwaysShow && !this.fps.cachedVisible)
        {
            this.fps.fadeIn();
            this.fps.cachedVisible = true;
        }
    },

    onDisconnected : function()
    {
        if (this.console != null && this.console.is(":visible"))
            this.toggleConsole();
        this.clearConsole();
    },

    createTaskbar : function(create)
    {
        if (this.taskbar != null)
            return;

        // Default to true for taskbar creation
        if (create === undefined || create === null)
            create = true;
        this.taskbar = (create ? $("<div/>") : null);
        if (this.taskbar == null)
            return;

        this.taskbar.attr("id", "webtundra-taskbar");
        this.taskbar.css({
            "position" : "absolute",
            "top" : 0,
            "padding"  : 0,
            "margin"   : 0,
            "height"   : 30,
            "width"    : "100%",
            "border"   : 0,
            "border-top"        : "1px solid gray",
            "background-color"  : "rgb(248,248,248)",
            "box-shadow"        : "inset 0 0 7px gray, 0 0 7px gray, inset 0 0px 0px 0px gray;"
        });

        if (TundraSDK.browser.isOpera)
            this.taskbar.css("background-image", "-o-linear-gradient(rgb(248,248,248),rgb(190,190,190))");
        else if (TundraSDK.browser.isFirefox)
        {
            this.taskbar.css({
                "background-image" : "-moz-linear-gradient(top, rgb(248,248,248), rgb(190,190,190))",
                "-moz-box-shadow"  : "inset 0 0 0px gray, 0 0 5px gray"
            });
        }
        else if (TundraSDK.browser.isChrome || TundraSDK.browser.isSafari)
        {
            this.taskbar.css({
                "background-image"   : "-webkit-gradient(linear, left top, left bottom, color-stop(0, rgb(248,248,248)), color-stop(0.8, rgb(190,190,190)))",
                "-webkit-box-shadow" : "0 0 7px gray"
            });
        }

        this.addWidgetToScene(this.taskbar);
        this.taskbar.hide();
    },

    createConsole : function(create)
    {
        if (this.console != null)
            return;

        // Default to true for taskbar creation
        if (create === undefined || create === null)
            create = true;
        this.console = (create ? $("<div/>") : null);
        if (this.console == null)
            return;

        this.console.attr("id", "webtundra-console");
        this.console.css({
            "position"          : "absolute",
            "height"            : 0,
            "width"             : "100%",
            "white-space"       : "pre",
            "margin"            : 0,
            "padding"           : 0,
            "padding-top"       : 5,
            "padding-bottom"    : 5,
            "border"            : 0,
            "overflow"          : "auto",
            "font-family"       : "Courier New",
            "font-size"         : "10pt",
            "color"             : "rgb(50,50,50)",
            "background-color"  : "rgba(248,248,248, 0.5)",
            "z-index"           : 100 // Make console be above all widgets added via UiAPI.addWidgetToScene.
        });

        this.consoleInput = $("<input/>", {
            id   : "webtundra-console-input",
            type : "text"
        });
        this.consoleInput.data("data", {
            history : [],
            index   : 0
        });
        this.consoleInput.css({
            "position"          : "absolute",
            "color"             : "rgb(20,20,20)",
            "background-color"  : "rgba(248,248,248, 0.8)",
            "border"            : 1,
            "border-top"        : "1px solid gray",
            "border-bottom"     : "1px solid gray",
            "padding-left"      : 5,
            "font-family"       : "Courier New",
            "font-size"         : "10pt",
            "height"            : 20,
            "width"             : "100%",
            "z-index"           : 100
        });
        this.consoleInput.focus(function() {
            $(this).css("background-color", "white")
        }).blur(function() {
            $(this).css("background-color", "rgba(248,248,248, 0.8)")
        }).keydown(function(e) {
            // tab
            if (e.which == 9)
            {
                var suggestion = TundraSDK.framework.console.commandSuggestion($(this).val());
                if (suggestion != null && suggestion !== $(this).val())
                    $(this).val(suggestion);
                e.preventDefault();
                return false;
            }
            // up and down arrow
            else if (e.which == 38 || e.which == 40)
            {
                var d = $(this).data("data");
                d.index += (e.which == 38 ? 1 : -1);
                if (d.index >= d.history.length)
                    d.index = d.history.length - 1;
                var command = (d.index >= 0 ? d.history[d.index] : "")
                if (d.index < -1) d.index = -1;
                $(this).val(command);
                e.preventDefault();
                return false;
            }
        }).keypress(function(e) {
            // enter
            if (e.which == 13)
            {
                var rawCommand = $(this).val();
                if (rawCommand == "")
                    return;
                if (TundraSDK.framework.console.executeCommandRaw(rawCommand))
                {
                    $(this).data("data").history.unshift(rawCommand);
                    $(this).data("data").index = -1;
                }
                $(this).val("");
                e.preventDefault();
                return false;
            }
        });

        if (TundraSDK.browser.isOpera)
            this.console.css("background-image", "-o-linear-gradient(rgba(190,190,190,0.5), rgba(248,248,248,0.5))");
        else if (TundraSDK.browser.isFirefox)
        {
            this.console.css({
                "background-image" : "-moz-linear-gradient(top, rgba(190,190,190,0.5), rgba(248,248,248,0.5))",
                "-moz-box-shadow"  : "inset 0 0 0px gray, 0 0 5px gray"
            });
        }
        else if (TundraSDK.browser.isChrome || TundraSDK.browser.isSafari)
        {
            this.console.css({
                "background-image"   : "-webkit-gradient(linear, left top, left bottom, color-stop(0, rgba(190,190,190,0.8)), color-stop(0.8, rgba(248,248,248,0.8)))",
                "-webkit-box-shadow" : "0 0 7px gray"
            });
        }

        this.addWidgetToScene([this.console, this.consoleInput]);
        this.console.hide();
        this.consoleInput.hide();
    },

    onUpdate : function(frametime)
    {
        if (!this.fps.cachedVisible)
            return;

        this.fps.fpsFrames++;
        this.fps.fpsTime += frametime;

        if (this.fps.fpsTime >= 1.0)
        {
            var fps = Math.round(this.fps.fpsFrames / this.fps.fpsTime);
            this.fps.html(fps + " <span style='font-size:8pt;color:black;'>FPS</span>");
            this.fps.css("color", fps >= 30 ? "green" : "red");

            this.fps.fpsFrames = 0;
            this.fps.fpsTime = 0;
        }
    },

    /**
        Clears the UI console log. Invoked by the 'clear' console command.
        @method clearConsole
    */
    clearConsole : function()
    {
        if (this.console != null)
            this.console.empty();
    },

    /**
        Registers a callback for rendering surface resize.

            function onWindowResize(width, height)
            {
                // width == Number
                // height == Number
            }

            TundraSDK.framework.ui.onWindowResize(null, onWindowResize);

        @method onWindowResize
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onWindowResize : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("UiAPI.WindowResize", context, callback);
    },

    /**
        Registers a callback for clear focus events. This event is fired when we want to clear focus from all DOM elements eg. input fields.

            TundraSDK.framework.ui.onWindowResize(null, function() {
                // I should not unfocus any input DOM elements
            });

        @method onClearFocus
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onClearFocus : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("UiAPI.ClearFocus", context, callback);
    },

    /**
        Sends clear focus event
        @method clearFocus
    */
    clearFocus : function()
    {
        TundraSDK.framework.events.send("UiAPI.ClearFocus");
    },

    /**
        Adds a single or collection of HTML string, element or jQuery to the 2D UI scene.
        @method addWidgetToScene
        @param {HTML String|Element|jQuery|Array} widgetElement Widget to add or an array of widgets.
        @return {Boolean} If (all elements) added successfully.
    */
    addWidgetToScene : function(widgetElement)
    {
        var widgets = (!Array.isArray(widgetElement) ? [widgetElement] : widgetElement);
        var succeeded = true;
        for (var i = 0; i < widgets.length; ++i)
        {
            var we = $(widgets[i]);
            if (we == null || we == undefined)
            {
                console.error("[UiAPI]: Invalid input widget could not be added to the scene.");
                succeeded = false;
                continue;
            }
            var zIndex = we.css("z-index");
            if (typeof zIndex === "string")
                zIndex = parseInt(zIndex);
            if (isNaN(zIndex) || zIndex == null || zIndex == undefined || typeof zIndex !== "number")
                zIndex = 0;
            if (zIndex < 5)
                we.css("z-index", 5);

            TundraSDK.framework.client.container.append(we);
        }
        return succeeded;
    },

    /**
        Adds a polymer web component to the 2D UI scene.
        @method addWebComponentToScene
        @param {String tag name} (must contain dash (-) in tag name) web component tag name to be added.
        @param {String url} url to the web component content to be fetched and added to created element.
        @param {Function} callback Function to be called.
    */
    addWebComponentToScene : function(tagName, webComponentUrl, context, callback)
    {

        if (tagName == null || tagName.indexOf("-") == -1)
        {
            console.error("[UiAPI]: Web component tag name must contain dash (-).");
        }

        var transfer = TundraSDK.framework.asset.requestAsset(webComponentUrl, "Text");
        if (transfer != null)
        {
            transfer.onCompleted(null, function(textAsset)
            {
                var element = document.createElement(tagName);
                element.innerHTML = textAsset.data;
                $("body").append(element);

                if (typeof context === "function")
                    context(element);
                else
                    callback.call(context, element);
            });
        }
    },

    /**
        Adds a new action to the UiAPI toolbar and returns the created DOM element.
        @method addAction
        @param {String} tooltip Tooltip text that is shown when the action is hovered.
        @param {String} [backgroundUrl=null] URL to a image that should be the background. 24x24 or 32x32 icons are recommended.
        @param {Number} [width=32] Width of the action. This gives you possibility for customizations depending on your image size.
        @return {jQuery Element|nu.l} Element if taskbar is enabled and add succeeded, otherwise null.
    */
    addAction : function(tooltip, backgroundUrl, width, upgradeToButton)
    {
        if (this.taskbar == null)
            return null;

        if (width == null)
            width = 32;

        var index = this.buttons.length;
        var name = "taskbar-button-" + index;
        var button = $("<div/>", {
            id    : name,
            title : (tooltip != null ? tooltip : "")
        });
        if (upgradeToButton === undefined || upgradeToButton === true)
            button.button();
        button.tooltip();

        // Style sheets
        button.height(30);
        button.width(width);
        button.css({
            "padding"           : 0,
            "margin"            : 0,
            "width"             : width,
            "min-width"         : width,
            "max-width"         : width,
            "background-color"  : "transparent",
            "border-color"      : "transparent"
        });
        if (backgroundUrl != null && backgroundUrl != "")
        {
            button.css({
                "background-image"    : "url(" + backgroundUrl + ")",
                "background-repeat"   : "no-repeat",
                "background-position" : "center"
            });
        }

        button.fadeIn();

        // Add and track
        this.taskbar.append(button);
        this.buttons.push(button);

        if (!this.taskbar.is(":visible"))
            this.taskbar.fadeIn();

        // Reposition buttons
        this.onWindowResizeInternal();

        return button;
    },

    addContextMenu : function(targetElement, disableNativeContextMenu, useLeftClick, showMenuHandler, hideMenuHandler)
    {
        if (disableNativeContextMenu === undefined)
            disableNativeContextMenu = true;
        if (useLeftClick === undefined)
            useLeftClick = false;

        var id = "webtundra-context-menu-" + this.numContextMenus;
        this.numContextMenus++

        targetElement = $(targetElement);
        targetElement.contextMenu(id, {},
        {
            disable_native_context_menu : disableNativeContextMenu,
            leftClick : useLeftClick,
            showMenu  : showMenuHandler,
            hideMenu  : hideMenuHandler
        });

        var contextMenu = $("#" + id);
        contextMenu.css({
            "background-color": "#F2F2F2",
            "border": "1px solid #999999",
            "list-style-type": "none",
            "margin": 0,
            "padding": 0
        });
        return contextMenu;
    },

    addContextMenuItems : function(contextMenu, items)
    {
        items = Array.isArray(items) ? items : [ items ];
        for (var i = 0; i < items.length; i++)
        {
            var itemData = items[i];
            var parent = $('<li/>');
            var item = $('<a href="#">' + itemData.name + '</a>');
            item.css({
                "font-family"       : "Arial",
                "font-size"         : "12pt",
                "background-color"  : "#F2F2F2",
                "color"             : "#333333",
                "text-decoration"   : "none",
                "display"           : "block",
                "padding"           : 5
            });
            // Hover in
            item.hover(function() {
                $(this).css({
                    "background-color" : "rgb(150,150,150)",
                    "color" : "rgb(255,255,255)"
                });
            // Hover out
            }, function() {
                $(this).css({
                    "background-color" : "#F2F2F2",
                    "color"   : "#333333"
                });
            });
            item.data("itemName", itemData.name);
            item.on("click", itemData.callback);
            parent.append(item);
            contextMenu.append(parent);
        }
    },

    onKeyPress : function(event)
    {
        if (this.console != null && event.key === "1" && event.targetNodeName !== "input")
        {
            if (this.consoleInput.is(":visible") && this.consoleInput.is(":focus"))
                return;
            this.toggleConsole();
        }
    },

    /**
        Toggles visibility of the UI console.
        @method toggleConsole
        @param {Boolean} [visible=!currentlyVisible]
    */
    toggleConsole : function(visible)
    {
        if (this.console == null)
            return;

        var isVisible = this.console.is(":visible");
        if (visible === undefined || visible === null)
            visible = !isVisible;
        if (visible == isVisible)
            return;

        if (!isVisible)
        {
            this.console.height(0);
            this.console.show();
            this.consoleInput.show();
            if (!this.fps.is(":visible"))
                this.fps.fadeIn();
        }
        else if (!this.fps.alwaysShow)
            this.fps.fadeOut();

        var that = this;
        this.console.animate(
        {
            height: !isVisible ? 250 : 0
        },
        {
            duration : 250,
            easing   : "swing",
            progress : function () {
                that.onWindowResizeInternal();
            },
            complete : !isVisible ?
                function () {
                    that.console.animate({ scrollTop: that.console.prop("scrollHeight") }, 350);
                    that.consoleInput.focus();
                    that.onWindowResizeInternal();
                } :
                function () {
                    that.console.scrollTop(0);
                    that.console.hide();
                    that.consoleInput.trigger("blur");
                    that.consoleInput.hide();
                    that.onWindowResizeInternal();
                }
        });
    },

    onWindowResizeDOM : function(event)
    {
        TundraSDK.framework.ui.onWindowResizeInternal(event);

        var element = TundraSDK.framework.client.container;
        if (element != null)
            TundraSDK.framework.events.send("UiAPI.WindowResize", element.width(), element.height());
    },

    onWindowResizeInternal : function(event)
    {
        if (this.taskbar != null)
        {
            this.taskbar.position({
                my: "left bottom",
                at: "left bottom",
                of: this.taskbar.parent()
            });

            if (this.buttons.length > 0)
            {
                var totalwidth = 0;
                for (var i = this.buttons.length - 1; i >= 0; i--)
                    totalwidth += this.buttons[i].width();

                this.buttons[0].position({
                    my: "left",
                    at: "right-" + totalwidth,
                    of: this.taskbar
                });

                var target = "#" + this.buttons[0].attr("id");

                for (var i = 1; i < this.buttons.length; i++)
                {
                    this.buttons[i].position({
                        my: "left",
                        at: "right",
                        of: target,
                        collision: "fit"
                    });
                    target = this.buttons[i];
                }
            }
        }

        if (this.console != null)
        {
            if (this.console.is(":visible"))
            {
                this.console.position({
                    my : "left top",
                    at : "left top",
                    of : this.console.parent()
                });
            }
            if (this.consoleInput.is(":visible"))
            {
                this.consoleInput.position({
                    my : "left top",
                    at : "left bottom",
                    of : this.console
                });
            }
        }

        if (this.fps !== undefined && this.fps.is(":visible"))
        {
            this.fps.position({
                my : "right top",
                at : "right-20 top",
                of : TundraSDK.framework.client.container
            });
        }
    }
});

return UiAPI;

}); // require js
