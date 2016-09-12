
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/TundraLogging",
        "core/frame/FrameStats",
        "core/frame/FrameLimiter",
        "core/frame/FrameProfiler" // Don't remove, included to the build
    ], function(Tundra, ITundraAPI, TundraLogging, FrameStats, FrameLimiter, FrameProfiler) {

var FrameAPI = ITundraAPI.$extend(
/** @lends FrameAPI.prototype */
{
    /**
        FrameAPI provides frame updates and single shot callbacks.
        Use the events provided from this API if your application requires updating every frame update

        FrameAPI is a singleton and available from {@link Tundra.frame}}

        @constructs
        @extends ITundraAPI
        @private
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        this.currentWallClockTime = 0.0;
        this.currentFrameNumber = 0;
        this.delayedExecutes = [];

        if (typeof options.limit === "number")
        {
            if (options.limit >= 1 && options.limit <= 59)
                this.limiter = new FrameLimiter(1.0/options.limit);
            else
                this.log.warn("Option 'limit' valid range is 1-59, configured:", options.limit);
        }

        /**
            Frame statistics
            @var {FrameStats}
        */
        this.stats = FrameStats;
        /**
            Profiler
            @var {FrameProfiler}
        */
        this.profiler = new FrameProfiler();
    },

    // ITundraAPI override
    reset : function()
    {
        // Remove all callbacks attached to the frame updates.
        // This happens on disconnect, the running apps must not get any updates
        // if they are left running in the global js context and do not correctly
        // unsub from frame updates.
        Tundra.events.remove("FrameAPI.Update");
        Tundra.events.remove("FrameAPI.PostFrameUpdate");
    },

    /**
        Enable FPS limiter. This is for debugging purpouses only, do not
        call this function in production. The browser will schedule max 60 FPS
        updates automaticlly
        @param {Number} fps - FPS target 1-59. Anything else will disable the limiter.
    */
    setLimit : function(fps)
    {
        if (typeof fps === "number" && fps >= 1 && fps <= 59)
            this.limiter = new FrameLimiter(1.0/fps);
        else
            this.limiter = undefined;
    },

    _limit : function(frametime)
    {
        if (this.limiter !== undefined)
            return this.limiter.shouldUpdate(frametime);
        return true;
    },

    // Called by TundraClient on each frame.
    _update : function(frametime)
    {
        this.stats._update();

        // Advance wall clock time
        this.currentWallClockTime += frametime;

        // Fire events
        Tundra.events.send("FrameAPI.Update", frametime);

        this._updateDelayedExecutes(frametime);

        // Protect against someone setting the frame number to negative.
        // No one should screw with this anyways.
        this.currentFrameNumber++;
        if (this.currentFrameNumber < 0)
            this.currentFrameNumber = 0;
    },

    _updateDelayedExecutes : function(frametime)
    {
        if (this.delayedExecutes.length === 0)
            return;

        // Fire delayed executes
        for (var i=0; i<this.delayedExecutes.length; ++i)
        {
            this.delayedExecutes[i].timeLeft -= frametime;
            if (this.delayedExecutes[i].timeLeft <= 0.0)
            {
                var data = this.delayedExecutes[i];
                this.delayedExecutes.splice(i, 1);
                i--;

                this._postDelayedExecute(data);
            }
        };
    },

    _postDelayedExecute : function(data)
    {
        try
        {
            // Callback was not defined, but context is a function: invoke it.
            // Always use the function as the context if one was not provided.
            if (typeof data.callback !== "function" && typeof data.context === "function")
                data.context.call(data.context, data.param);
            else
                data.callback.call(data.context != null ? data.context : data.callback, data.param);
        }
        catch(e)
        {
            TundraLogging.getLogger("FrameAPI").error("Failed to invoke callback for delayed execute:", e);
        }
    },

    // Called by TundraClient on each frame.
    _preRender : function(frametime)
    {
        Tundra.events.send("FrameAPI.PreRender", frametime);
    },

    // Called by TundraClient on each frame.
    _postUpdate : function(frametime)
    {
        Tundra.events.send("FrameAPI.PostFrameUpdate", frametime);
    },

    /**
        Returns the current application wall clock time in seconds.

        @return {Number}
    */
    wallClockTime : function()
    {
        return this.currentWallClockTime;
    },

    /**
        Returns the current application frame number.

        @return {Number}
    */
    frameNumber : function()
    {
        return this.currentFrameNumber;
    },

    /**
        Registers a callback for frame updates.
        @subscribes

        * @example
        * function onFrameUpdate(frametime)
        * {
        *     // frametime == time since last frame update in seconds
        * }
        * Tundra.frame.onUpdate(null, onFrameUpdate);

    */
    onUpdate : function(context, callback)
    {
        return Tundra.events.subscribe("FrameAPI.Update", context, callback);
    },

    /**
        Registers a callback for pre render frame updates.
        @subscribes

        * @example
        * function onPreRender(frametime)
        * {
        *    // frametime == time since last frame update in seconds
        * }
        * Tundra.frame.onPreRender(null, onFrameUpdate);
    */
    onPreRender : function(context, callback)
    {
        return Tundra.events.subscribe("FrameAPI.PreRender", context, callback);
    },

    /**
        Registers a callback for post frame updates. Meaning that the normal update has been fired,
        all APIs and the renderer has been updated for this frame.

        @subscribes

        * @example
        * function onPostFrameUpdate(frametime)
        * {
        *     // frametime == time since last frame update in seconds
        * }
        * Tundra.frame.onPostFrameUpdate(null, onPostFrameUpdate);
    */
    onPostFrameUpdate : function(context, callback)
    {
        return Tundra.events.subscribe("FrameAPI.PostFrameUpdate", context, callback);
    },

    /**
        Registers a delayed callback invocation with context.


        @param {Number} afterSeconds Time in seconds when the after the callback is invoked.
        @param {Object} context Context of in which the <code>callback</code> function is executed. Can be <code>null</code>.
        @param {Function} callback Function to be called.
        @param {Object} [param=undefined] Optional parameter to to the callback.

        * @example
        * function onDelayedExecute(param)
        * {
        *     // this.test == 12
        *     // param == 101
        * }
        * var context = { test : 12 };
        * Tundra.frame.delayedExecute(1.0, context, onDelayedExecute, 101);
    */
    /**
        Registers a delayed callback invocation.

        * @example
        * Tundra.frame.delayedExecute(1.0, function(param) {
        *     console.log(param); // 101
        * }, 101);

        @param {Number} afterSeconds Time in seconds when the after the callback is invoked.
        @param {Function} callback Function to be called.
        @param {Object} [param=undefined] Optional parameter to to the callback.
    */
    delayedExecute : function(afterSeconds, context, callback, param)
    {
        if (typeof afterSeconds !== "number")
        {
            TundraLogging.getLogger("FrameAPI").error("delayedExecute parameter 'afterSeconds' must be a number!");
            return;
        }
        this.delayedExecutes.push({
            timeLeft : afterSeconds,
            context  : context,
            callback : callback,
            param   : (typeof callback !== "function" && param === undefined ? callback : param)
        });
    }
});

return FrameAPI;

}); // require js
