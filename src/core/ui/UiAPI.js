
define([
        "lib/jquery.contextmenu",
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/CoreStringUtils",
        "core/frame/AsyncHelper"
    ], function(jQueryContextMenu, Tundra, ITundraAPI, CoreStringUtils, AsyncHelper) {

var UiAPI = ITundraAPI.$extend(
/** @lends UiAPI.prototype */
{
    /**
        Provides utilities to add your widget to the 2D DOM scene.

        UiAPI is a singleton and accessible from {@link Tundra.ui}.

        @constructs
        @extends ITundraAPI
        @private
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        this.tabActive = true;
        this.timing = new AsyncHelper("UiAPI", this);

        this.buttons = [];
        this.numContextMenus = 0;

        this.createTaskbar(this.options.taskbar);
        this.createConsole(this.options.console);

        this.onWindowResizeDOM();
        window.addEventListener("resize", this.onWindowResizeDOM.bind(this), false);

        $(window).focus(function() {
            this.tabActive = true;
            Tundra.events.send("UiAPI.TabFocusChanged", true);
        }.bind(this)).blur(function() {
            this.tabActive = false;
            Tundra.events.send("UiAPI.TabFocusChanged", false);
        }.bind(this));

        Tundra.client.onConnected(this, this.onConnected);
        Tundra.client.onDisconnected(this, this.onDisconnected);
    },

    __classvars__ :
    {
        getDefaultOptions : function()
        {
            return {
                taskbar : true,
                console : true,
                fps     : false
            };
        }
    },

    initialize : function()
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
        Tundra.console.registerCommand("clear", "Clears the console messages", null, this, this.clearConsole);
        Tundra.console.registerCommand("showFps", "Toggles if FPS counter is shown", null, this, function() {
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

        // Disconnect action
        this.buttonDisconnect = this.addAction("Disconnect", Tundra.asset.getLocalAssetPath("img/icon-disconnect.png"));
        this.buttonDisconnect.click(function(e) {
            Tundra.client.disconnect();
            e.stopPropagation();
            e.preventDefault();
        });

        // Console toggle action. Only on dev mode.
        if (Tundra.usingRequireJS())
        {
            this.buttonConsole = this.addAction("Console", Tundra.asset.getLocalAssetPath("img/icon-console.png"));
            this.buttonConsole.click(function(e) {
                this.toggleConsole();
                e.preventDefault();
                e.stopPropagation();
            }.bind(this));
        }

        // Arrage UI elements
        this.onWindowResizeInternal();
    },

    onConnected : function()
    {
        Tundra.input.onKeyPress(this, this.onKeyPress);
    },

    onDisconnected : function()
    {
        if (this.console.is(":visible"))
            this.toggleConsole();
        this.clearConsole();
    },

    topZIndex : function()
    {
        var highestInternalIndex = (this.console != null ? this.console.css("z-index") : 5);
        if (typeof highestInternalIndex === "string" && highestInternalIndex !== "auto" && highestInternalIndex.length > 0)
            return parseInt(highestInternalIndex) + 50;
        else
            return 150;
    },

    createTaskbar : function(create)
    {
        if (this.taskbar != null)
            return;

        // Default to true for taskbar creation
        if (create === undefined || create === null)
            create = true;
        if (!create)
        {
            this.taskbar = null;
            return;
        }

        this.taskbar = $("<div/>");

        this.taskbar.attr("id", "webtundra-taskbar");
        this.taskbar.css({
            "position" : "absolute",
            "left"     : 0,
            "bottom"   : 0,
            "padding"  : 0,
            "margin"   : 0,
            "height"   : (Tundra.browser.isMobile() ? 36 : 30),
            "width"    : "100%",
            "border"   : 0,
            "border-top"        : "1px solid gray",
            "background-color"  : "rgb(248,248,248)",
            "box-shadow"        : "inset 0 0 7px gray, 0 0 7px gray, inset 0 0px 0px 0px gray;",
            "user-select"       : "none"
        });

        if (Tundra.browser.isMobile())
        {
            this.taskbar.css({
                "background-color" : "transparent",
                "border-top" : 0,
                "box-shadow" : "none"
            });
        }
        else
        {
            if (Tundra.browser.isOpera)
                this.taskbar.css("background-image", "-o-linear-gradient(rgb(248,248,248),rgb(190,190,190))");
            else if (Tundra.browser.isFirefox)
            {
                this.taskbar.css({
                    "background-image" : "-moz-linear-gradient(top, rgb(248,248,248), rgb(190,190,190))",
                    "-moz-box-shadow"  : "inset 0 0 0px gray, 0 0 5px gray"
                });
            }
            else if (Tundra.browser.isChrome || Tundra.browser.isSafari)
            {
                this.taskbar.css({
                    "background-image"   : "-webkit-gradient(linear, left top, left bottom, color-stop(0, rgb(248,248,248)), color-stop(0.8, rgb(190,190,190)))",
                    "-webkit-box-shadow" : "0 0 7px gray"
                });
            }
        }

        this.add(this.taskbar);
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
            "color"             : "#444",
            "background-color"  : "rgba(255, 255, 255, 0.8)",
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
            "color"             : "#444",
            "background-color"  : "rgba(221, 221, 221, 0.8)",
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
            $(this).css("background-color", "white");
        }).blur(function() {
            $(this).css("background-color", "rgba(248,248,248, 0.8)");
            if (Tundra.browser.isMobile())
                Tundra.ui.toggleConsole(false);
        }).keydown(function(e) {
            // tab
            if (e.which == 9)
            {
                var suggestion = Tundra.console.commandSuggestion($(this).val());
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
            if (e.which == 13) // enter
            {
                var rawCommand = $(this).val();
                if (rawCommand == "")
                    return;
                if (Tundra.console.executeCommandRaw(rawCommand))
                {
                    $(this).data("data").history.unshift(rawCommand);
                    $(this).data("data").index = -1;
                }
                $(this).val("");
                e.preventDefault();
                return false;
            }
        }).keyup(function(e) {
            if (e.keyCode == 27) // esc
                this.toggleConsole();
        }.bind(this));

        this.addWidgetToScene([this.console, this.consoleInput]);
        this.console.hide();
        this.consoleInput.hide();
    },

    /**
        Clears the UI console log. Invoked by the 'clear' console command.

    */
    clearConsole : function()
    {
        this.console.empty();
    },

    /**
        Registers a callback for rendering surface resize.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.ui.onWindowResize(function(width, height) {
        *     // width && height == Number
        * });
    */
    onWindowResize : function(context, callback)
    {
        return Tundra.events.subscribe("UiAPI.WindowResize", context, callback);
    },

    /**
        Registers a callback for tab focus changes.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.ui.onTabFocusChanged(this, function(focused) {
        *     console.log("tundra focus:", focused)
        * });
    */
    onTabFocusChanged : function(context, callback)
    {
        return Tundra.events.subscribe("UiAPI.TabFocusChanged", context, callback);
    },

    /**
        Registers a callback for clear focus events. This event is fired when we want to clear focus from all DOM elements e.g. input fields.

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.ui.onWindowResize(null, function() {
        *     // I should not unfocus any input DOM elements
        * });
    */
    onClearFocus : function(context, callback)
    {
        return Tundra.events.subscribe("UiAPI.ClearFocus", context, callback);
    },

    /**
        Sends clear focus event
    */
    clearFocus : function()
    {
        Tundra.events.send("UiAPI.ClearFocus");
    },

    addWidgetToScene : function(element)
    {
        this.add(element);
    },

    /**
        Add DOM to the 2D UI scene. In practice the input will be appended to the TundraClient container
        and 'z-index' CSS property is force to be at least five (5) so that it wont be under any rendering.

        Accepted input: HTML Element, HTML string, jQuery.Element or an array of of these types.

        Styling: Relative layout will not work very well inside the 2D UI scene on top of the 3D scene.
        You should prefer using `absolute` or `fixed` positioning and user Tundra.client.container as your
        reference for 2D UI scene width/height etc.

        @param {Object} element Input element(s).
        @return {Boolean} If all elements added successfully.
    */
    add : function(element)
    {
        var elements = (!Array.isArray(element) ? [ element ] : element);
        var succeeded = true;
        for (var i = 0; i < elements.length; ++i)
        {
            var iter = $(elements[i]);
            if (iter == null || iter == undefined)
            {
                console.error("[UiAPI]: Invalid input widget could not be added to the scene.");
                succeeded = false;
                continue;
            }
            var zIndex = iter.css("z-index");
            if (typeof zIndex === "string" && zIndex !== "")
                zIndex = parseInt(zIndex);
            if (typeof zIndex !== "number" || isNaN(zIndex))
                zIndex = 0;
            if (zIndex < 5)
                iter.css("z-index", 5);

            Tundra.client.container.append(iter);
        }
        return succeeded;
    },

    /**
        Adds a polymer web component to the 2D UI scene.
        @param {String} tagName (must contain dash (-) in tag name) web component tag name to be added.
        @param {String} url Url to the web component content to be fetched and added to created element.
        @param {Object} context The context in which the function will be called.
        @param {Function} callback Function to be called.
    */
    addWebComponentToScene : function(tagName, webComponentUrl, context, callback)
    {

        if (tagName == null || tagName.indexOf("-") == -1)
        {
            console.error("[UiAPI]: Web component tag name must contain dash (-).");
        }

        var transfer = Tundra.asset.requestAsset(webComponentUrl, "Text");
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

        @param {String} tooltip Tooltip text that is shown when the action is hovered.
        @param {String} [iconOrIconURL=null] URL to a image that should be the background.
        @param {Number} [width=32] Width of the action. This gives you possibility for customizations depending on your image size.
        @return {jQuery.Element|null} Element if taskbar is enabled and add succeeded, otherwise `null`.
    */
    addAction : function(tooltip, iconOrIconURL, width, upgradeToButton)
    {
        if (this.taskbar == null)
            return null;

        var height = this.taskbar.height();
        if (width == null)
            width = 32;
        if (Tundra.browser.isMobile())
        {
            if (width < 40)
                width = 40;
        }

        var index = this.buttons.length;
        var name = "taskbar-button-" + index;
        var button = $("<div/>", {
            id    : name,
            title : (tooltip != null ? tooltip : "")
        });
        if (upgradeToButton === undefined || upgradeToButton === true)
            button.button();
        button.tooltip();
        if (Tundra.browser.isMobile())
            button.tooltip("disable");

        // Style sheets
        button.height(height);
        button.width(width);
        button.css({            "padding"           : 0,
            "margin"            : 0,
            "width"             : width,
            "min-width"         : width,
            "max-width"         : width,
            "background-color"  : "transparent",
            "border"            : 0,
            "border-radius"     : 0,
            "border-color"      : "transparent"
        });
        if (Tundra.browser.isMobile())
            button.css("background-color", "rgba(230, 230, 230, 0.8)");

        if (iconOrIconURL != null && iconOrIconURL != "")
        {
            button.css({
                "background-image"    : "url(" + iconOrIconURL + ")",
                "background-repeat"   : "no-repeat",
                "background-position" : "center"
            });
        }

        button.fadeIn();

        // Add and track
        this.taskbar.append(button);
        this.buttons.push(button);

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
                "font-size"         : 20,
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

        @param {Boolean} [visible]
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
        }

        if (!Tundra.browser.isMobile())
        {
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
        }
        else
        {
            if (visible)
            {
                this.console.show();
                this.console.animate({ scrollTop: this.console.prop("scrollHeight") }, 350);
                this.consoleInput.focus();
                this.onWindowResizeInternal();
            }
            else
            {
                this.console.scrollTop(0);
                this.console.hide();
                this.consoleInput.trigger("blur");
                this.consoleInput.hide();
                this.onWindowResizeInternal();
            }
        }
    },

    /**
        Returns the client container width.

        @return {Number}
    */
    width : function()
    {
        return Tundra.client.container.width();
    },

    /**
        Returns the client container height.

        @return {Number}
    */
    height : function()
    {
        return Tundra.client.container.height();
    },

    refresh : function()
    {
        this.onWindowResizeDOM();
        this.timing.async("refresh", this.onWindowResizeDOM);
    },

    onWindowResizeDOM : function(event)
    {
        this.onWindowResizeInternal();

        if (Tundra.container)
            Tundra.events.send("UiAPI.WindowResize", Tundra.container.width(), Tundra.container.height());
    },

    onWindowResizeInternal : function()
    {
        if (this.taskbar != null && this.buttons.length > 0)
        {
            var totalwidth = 0;
            for (var i = this.buttons.length - 1; i >= 0; i--)
                totalwidth += this.buttons[i].width();

            this.buttons[0].position({
                my: "left",
                at: "right-" + totalwidth,
                of: this.taskbar
            });

            var target = this.buttons[0];
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
        if (this.console != null)
        {
            if (this.console.is(":visible"))
            {
                this.console.position({
                    my : "left top",
                    at : "left top",
                    of : this.console.parent()
                });
                if (Tundra.browser.isMobile())
                    this.console.outerHeight(this.height() - this.consoleInput.outerHeight());
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
    }
});

return UiAPI;

}); // require js
