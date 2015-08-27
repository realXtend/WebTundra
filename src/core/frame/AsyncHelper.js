
define([
        "lib/classy",
        "core/framework/Tundra",
        "core/framework/TundraLogging"
    ], function(Class, Tundra, TundraLogging) {

var AsyncHelper = Class.$extend(
/** @lends AsyncHelper.prototype */
{
    /**
        The AsyncHelper is used to manage asynchronous operations.
        If your application needs making aynchronous calls (most common example is making GET/POST HTTP calls), use this helper as described in
        the methods {@link AsyncHelper#async|async} and {@link AsyncHelper#defer|defer}.

        @constructs
        @param {String} [name] Name for logging
        @param {Object} [defaultContext] Default context for all callback execution.
    */
    __init__ : function(name, defaultContext)
    {
        this.name = (typeof name === "string" && name !== "" ? "AsyncHelper." + name : "AsyncHelper");

        this.handles = {};
        this.deferred = {};
        this.data = {};
        this.defaultContext = defaultContext || this;
    },

    __classvars__ :
    {
        /**
            Static version accessible from {{#crossLink "AsyncHelper/async:method"}}AsyncHelper.async(){{/crossLink}}

            @static
            @param {Function} callback
            @param {Object} [data=undefined] If a number and timeout is omitted, this will become the timeout.
            @param {Number} [timeout=undefined] If omitted or zero requestAnimationFrame is used to schedule the event
            at the next 'paint' event of the browser.
            @return {Number} Handle that can be used to cancel via {{#crossLink "AsyncHelper/cancel:method"}}AsyncHelper.cancel(){{/crossLink}}
        */
        async : function(callback, data, timeout)
        {
            if (typeof callback !== "function")
            {
                console.error("AsyncHelper.async: 'callback' is not a function:", callback);
                return false;
            }

            // 'data' can also be the timeout
            if (typeof data === "number" && typeof timeout !== "number")
            {
                timeout = data;
                data = undefined;
            }

            // Wrap callback and arguments. Data may be anything, also an array or undefined.
            var args = (data && data.length) ? data : [ data ];
            var fn = function() {
                callback.apply(this, args);
            }.bind(this);

            var useTimeout = (typeof timeout === "number" && timeout > 0);
            var handle     = (useTimeout ? setTimeout(fn, timeout) : requestAnimationFrame(fn));

            return (useTimeout ? handle : ~handle);
        },

        /**
            Static version accessible from {{#crossLink "AsyncHelper/cancel:method"}}AsyncHelper.cancel(){{/crossLink}}

            @static
            @param {Number} handle Handle previously returned by static {{#crossLink "AsyncHelper/async:method"}}AsyncHelper.async(){{/crossLink}}
        */
        cancel : function(handle)
        {
            if (typeof handle === "number")
            {
                if (handle < 0)
                    cancelAnimationFrame(~handle);
                else
                    clearTimeout(handle);
            }
        }
    },

    /**
       Schedule an async callback.
       You may call this function multiple times with the same event name, the previous scheduled callback will be cleared
       automatically.

       * @example
       * // With data and explicit timeout
       * helper.async("thing completed", function(data) {
       *     console.log(data.id, "completed a second ago as",
       *         data.success, "still pending", this.state.pending);
       * }.bind(this), { id : thingId, success : true }, 1000);
       *
       * // Without data, on next browser 'paint'
       * helper.async("xxx", function() {
       *     console.log("pending", this.state.pending);
       * }.bind(this));
       *
       * // Single argument, if a number a explicit number must be set as timeout
       * helper.async("yyy", function(myBool, myString, myNumber) {
       *     console.log(myNumber)
       * }.bind(this), 54321, 0);
       *
       * // Multiple arguments
       * helper.async("zzz", function(myBool, myString, myNumber) {
       *     console.log(myBool, myString, myNumber);
       * .bind(this), [ true, "something", 12345 ]);
       *
       * // Multiple invocations with the same name
       * // will cancel any previous scheduled operations.
       * helper.async("my task", function() {
       *     console.log("i will never execute");
       * }, 50);
       * helper.async("my task", function() {
       *     console.log("i was scheduled 2 seconds ago");
       * }, 2000);

        @param {String} name Event name
        @param {Function} callback
        @param {Object} [data=undefined] If a `number` and `timeout` is omitted, this will become the `timeout`.
        @param {Number} [timeout=undefined] If omitted or zero, `requestAnimationFrame` is used to schedule the event
        at the next `paint` event of the browser.
        @return {Boolean} `true` if the operation was scheduled.
    */
    async : function(name, callback, data, timeout)
    {
        if (typeof name !== "string" || name.trim() === "")
        {
            TundraLogging.get(this.name).error("async: 'name' is invalid:", name);
            return false;
        }
        if (typeof callback !== "function")
        {
            TundraLogging.get(this.name).error("async: 'callback' is not a function:", callback);
            return false;
        }
        this.cancel(name);

        // 'data' can also be the timeout
        if (typeof data === "number" && typeof timeout !== "number")
        {
            timeout = data;
            data = undefined;
        }

        // Wrap callback and arguments. Data may be anything, also an array or undefined.
        var args = (data && data.length) ? data : [ data ];
        var fn = this._wrap(name, callback, args);

        var useTimeout = (typeof timeout === "number" && timeout > 0);
        var handle     = (useTimeout ? setTimeout(fn, timeout) : requestAnimationFrame(fn));

        this.handles[name] = (useTimeout ? handle : ~handle);
        return true;
    },

    /**
        Returns if a async is currently registered.

        @return {Boolean}
    */
    hasAsync : function(name)
    {
        return (this.handles[name] !== undefined);
    },

    /**
        Returns the number of currently registered asyncs.

        @return {Number}
    */
    numAsync : function()
    {
        return Object.keys(this.handles).length;
    },

    /**
        Shedule a jQuery deferred promise. This function is similar to async
        but provides the promise API of done/fail/always from jQuery.

        You may call this function multiple times with the same event name.
        All returned promises will be tied to the same deferred object.

        Once you are ready to complete the event, call the resolve function
        with the event name. Subsequent calls after resolving will create a
        new deferred object, resulting in the previous handlers not being
        called when the event is resolved again.

        Passing in the optional 'beforeStart' enables you to add logic to the deferred statement.
        The function is only used if this is a new defer statement, othewise discarded.

        If your deferred source is called very frequently and you are worried about the performance
        of creating anonymous function all the time, you can use the below example.
        It is a good practise to do this in any case.

        * @example
        * // Example of defer without functionality
        * // eg. waiting for something to happen
        * // You can combine this with deferImmediate
        * // to handle completed states.
        * pendingChanged : function(pending) {
        *     this.pending = pending;
        *     if (this.pending === 0)
        *         this.helper.resolve("all done");
        * },
        * onAllDone : function()
        * {
        *     if (this.pending > 0)
        *         return helper.defer("all done");
        *     else
        *         return helper.deferImmediate("all done");
        * },
        * // Example of defer with functionality
        * // eg. executing something to happen and you need to wait for it
        * authenticaUser : function()
        * {
        *     if (!this.helper.hasDefer("user.auth"))
        *     {
        *         return this.helper.defer("user.auth", function(defer) {
        *             // Call some async operation with earlier provided credentials
        *             this.auth(this.user.name, this.user.password).done(function(tokens) {
        *                 // Resolve the defer you returned from authenticaUser()
        *                 // @note You must use AsyncHelper.resolve to remove it from its state
        *                 // do not execute defer.resolve/reject()!
        *                 this.helper.resolve("user.auth", true, tokens);
        *             }.bind(this)).fail(function(error) {
        *                 // Reject (fail) the defer you returned from authenticaUser()
        *                 this.helper.resolve("user.auth", false, error);
        *             }.bind(this));
        *         }.bind(this));
        *     }
        *     // The above operation is already in progress.
        *     // Return a promise tied to it.
        *     return this.helper.defer("user.auth");
        * }

        @param {String} name Event name
        @param {Function} [beforeStart] Function that will get called. Useful to add the defer
        @return {jQuery.Promise}
    */
    defer : function(name, beforeStart)
    {
        if (typeof name !== "string" || name.trim() === "")
        {
            TundraLogging.get(this.name).error("defer: 'name' is invalid:", name);
            return $.Deferred().promise();
        }

        var defer = this.deferred[name];
        if (defer !== undefined)
            return defer.promise();

        var data = this._createDefer(name, beforeStart);
        return data.promise;
    },

    /**
        Returns if a deferred is currently registered.

        @return {Boolean}
    */
    hasDefer : function(name)
    {
        return (this.deferred[name] !== undefined);
    },

    /**
        Returns the number of currently registered defers.

        @return {Number}
    */
    numDefers : function()
    {
        return Object.keys(this.deferred).length;
    },

    /**
        Shedule a jQuery deferred promise that will be immediately resolved.

        @param {String} name Event name
        @param {Boolean} success True to immediately resolve into promise.done, false to immediately reject into promise.fail().
        @return {jQuery.Promise}
    */
    deferImmediate : function(name, success)
    {
        var promise = this.defer(name);
        this.resolve.apply(this, arguments);
        return promise;
    },

    /**
        Resolve a jQuery deferred promise.

        @param {String} name Event name
        @param {Boolean} success True to resolve into promise.done, false to reject into promise.fail().
    */
    resolve : function(name, success)
    {
        if (typeof name !== "string" || name.trim() === "")
        {
            TundraLogging.get(this.name).error("resolve: 'name' is invalid:", name);
            return false;
        }

        var defer = this.deferred[name];
        if (defer === undefined)
            return;

        delete this.deferred[name];

        var args = [];
        if (arguments.length > 2)
        {
            for (var i = 2; i < arguments.length; i++)
                args.push(arguments[i]);
        }

        if (success !== false)
            defer.resolve.apply(defer, args);
        else
            defer.reject.apply(defer, args);
    },

    /**
        Cancel a scheduled async or deferred operation.

        <b>Note:</b> You should not use same event names for sync and, defer calls if you do this function will cancel them both.

        @param {String} name Name previously used in sync or defer.
    */
    cancel : function(name)
    {
        if (typeof name !== "string" || name.trim() === "")
        {
            TundraLogging.get(this.name).error("cancel: 'name' is invalid:", name);
            return false;
        }

        var handle = this.handles[name];
        if (handle !== undefined)
        {
            if (handle < 0)
                cancelAnimationFrame(~handle);
            else
                clearTimeout(handle);
        }

        delete this.handles[name];
        delete this.deferred[name];

        return (handle !== undefined);
    },

    /**
        Makes one `master` deferred from given arbitrary number of deferres / promises that:
        will be resolved when all the promises are resolved, and
        will be rejected if any of the promises is rejected

        <b>Note:</b> Arguments can be mix of both promises and deferred names.
              If a deferred does not exist for a given name, it will be created.

        @example
            // This snipped demonstrates how 'when()' should be used
            var helper = new AsyncHelper("myAppAsyncHelper", this);
            helper.defer("fetchData1");
            helper.defer("fetchData2");

            var allDataFetched = helper.when("fetchData1", "fetchData2");
            allDataFetched.done(function(data1, data2)
            {
                // This is called after both defers are resolved
                console.log(data1); // prints 'fetchedData1'
                console.log(data2); // prints 'fetchedData2'
            })
            .fail(function());

            helper.resolve("fetchData1", true, "fetchedData1");
            helper.resolve("fetchData2", true, "fetchedData2");

        @param {...deferNames}
        @return {jQuery.Promise}
    */
    when : function()
    {
        var args = [];
        for (var i = 0; i < arguments.length; ++i)
        {
            if (typeof arguments[i] === "string")
                args.push(this.defer(arguments[i]));
            else if ($.isFunction(arguments[i].promise))
                args.push(arguments[i]);
        }

        return $.when.apply(this.defaultContext || this, args);
    },

    _createDefer : function(name, beforeStart)
    {
        // beforeStart is allowed be be undefined
        var data = { isNew : (this.deferred[name] === undefined) };
        if (beforeStart !== undefined && typeof beforeStart !== "function")
            beforeStart = undefined;
        data.defer = $.Deferred(beforeStart);
        data.promise = data.defer.promise();
        if (data.isNew)
            this.deferred[name] = data.defer;
        return data;
    },

    _wrap : function(name, method, args)
    {
        return function() {
            delete this.handles[name];
            method.apply(this.defaultContext || this, args);
        }.bind(this);
    }
});

Tundra.Classes.AsyncHelper = AsyncHelper;

return AsyncHelper;

}); // require js
