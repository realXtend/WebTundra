
define([
        "lib/classy",
        "core/framework/CoreStringUtils",
        "core/framework/TundraLogging",
        "core/frame/AsyncHelper"
    ], function(Class, CoreStringUtils, TundraLogging, AsyncHelper) {

var WebSocketTester = Class.$extend(
/** @lends WebSocketTester.prototype */
{
    /**
        WebSocket connection tester.

        @constructs
    */
    __init__ : function()
    {
        this.log = TundraLogging.getLogger("WebSocketTester");
        this.timing = new AsyncHelper("WebSocketTester", this);
    },

    /**
        @param {String} eventName Available event names 'connected', 'disconnected', 'error', 'message'
        @return {jQuery.Promise}
    */
    on : function(eventName)
    {
        eventName = eventName.trim().toLowerCase();
        if (eventName === "connected" && this.isConnected())
            return this.timing.deferImmediate(eventName, true, {});
        return this.timing.defer(eventName);
    },

    /**
        @param {String} url
        @param {Object} options
    */
    connect : function(url, options)
    {
        this.options = $.extend({
            message : "", // Message to send after connected
            disconnectOnFirstMessage : true,
            showDialogOnError : true
        }, options);

        url = url.trim();
        if (CoreStringUtils.startsWith(url, "http://", true))
            url = url.substring(7);
        else if (CoreStringUtils.startsWith(url, "https://", true))
            url = url.substring(8);
        if (!CoreStringUtils.startsWith(url, "ws://") && !CoreStringUtils.startsWith(url, "wss://"))
            url = "ws://" + url;

        this.websocket = new WebSocket(url);
        this.websocket.onopen = this.onOpened.bind(this);
        this.websocket.onerror = this.onError.bind(this);
        this.websocket.onclose = this.onClosed.bind(this);
        this.websocket.onmessage = this.onMessage.bind(this);
    },

    /**
        @function
    */
    disconnect : function()
    {
        if (this.websocket !== undefined)
            this.websocket.close();
        this.websocket = undefined;
    },

    /**
        @return {Boolean}
    */
    isConnected : function()
    {
        if (this.websocket === undefined)
            return false;
        else if (this.websocket.readyState !== 3) // CLOSED
            return true;
        return false;
    },

    /**
        @param {String} msg
    */
    send : function(msg)
    {
        if (this.websocket !== undefined)
            this.websocket.send(msg);
    },

    onOpened : function(e)
    {
        this.log.debug("connected");
        this._dispatch("connected", true, e);

        if (typeof this.options.message === "string" && this.options.message !== "")
        {
            this.send(this.options.message)
            this.options.message = undefined;
        }
    },

    onError : function(e)
    {
        this.log.debug("error", e);
        this._dispatch("error", true, e);

        if (this.options.showDialogOnError === true)
        {
            Tundra.ui.openModalDialog({
                heading : "Restricted Network",
                html : '<div>Check your firewall settings or contact your network administrator.<div>' +
                       '</div>',
                icon : "warning",
                iconColor : "rgb(207, 190, 16)"
            });
        }
    },

    onClosed : function(e)
    {
        this.log.debug("disconnected");
        this._dispatch("disconnected", true, e);
    },

    onMessage : function(e)
    {
        this.log.debug("message", e);
        this._dispatch("message", true, e);

        if (this.options.disconnectOnFirstMessage === true)
            this.disconnect();
    },

    _dispatch : function(name, success, e)
    {
        try
        {
            this.timing.resolve(name, success, e)
        }
        catch(ex)
        {
            this.log.error("Exception in '" + name + "' handlers:", ex);
        }
    }
});

return WebSocketTester;

}); // require js
