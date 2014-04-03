
define([
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(TundraSDK, TundraLogging) {

/**
    FrameAPI provides frame updates and single shot callbacks.

    @class FrameAPI
    @constructor
*/
var FrameAPI = Class.$extend(
{
    __init__ : function(params)
    {
        this.currentWallClockTime = 0.0;
        this.currentFrameNumber = 0;
        this.delayedExecutes = [];
    },

    // Called by TundraClient on each frame.
    _update : function(frametime)
    {
        // Advance wall clock time
        this.currentWallClockTime += frametime;

        // Fire events
        TundraSDK.framework.events.send("FrameAPI.Update", frametime);

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
    _postUpdate : function(frametime)
    {
        TundraSDK.framework.events.send("FrameAPI.PostFrameUpdate", frametime);
    },

    reset : function()
    {
        // Remove all callbacks attached to the frame updates.
        // This happens on disconnect, the running apps must not get any updates
        // if they are left running in the global js context and do not correctly
        // unsub from frame updates.
        TundraSDK.framework.events.remove("FrameAPI.Update");
        TundraSDK.framework.events.remove("FrameAPI.PostFrameUpdate");
    },

    /**
        Returns the current application wall clock time in seconds.

        @method wallClockTime
        @return {Number}
    */
    wallClockTime : function()
    {
        return this.currentWallClockTime;
    },

    /**
        Returns the current application frame number.

        @method frameNumber
        @return {Number}
    */
    frameNumber : function()
    {
        return this.currentFrameNumber;
    },

    /**
        Registers a callback for frame updates.

            function onFrameUpdate(frametime)
            {
                // frametime == time since last frame update in seconds
            }
            TundraSDK.framework.frame.onUpdate(null, onFrameUpdate);

        @method onUpdate
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onUpdate : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("FrameAPI.Update", context, callback);
    },

    /**
        Registers a callback for post frame updates. Meaning that the normal update has been fired,
        all APIs and the renderer has been updated for this frame.

            function onPostFrameUpdate(frametime)
            {
                // frametime == time since last frame update in seconds
            }
            TundraSDK.framework.frame.onPostFrameUpdate(null, onPostFrameUpdate);

        @method onPostFrameUpdate
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onPostFrameUpdate : function(context, callback)
    {
        return TundraSDK.framework.events.subscribe("FrameAPI.PostFrameUpdate", context, callback);
    },

    /**
        Registers a delayed callback invocation with context.

            function onDelayedExecute(param)
            {
                // this.test == 12
                // param == 101
            }
            var context = { test : 12 };
            TundraSDK.framework.frame.delayedExecute(1.0, context, onDelayedExecute, 101);

        @method delayedExecute
        @param {Number} afterSeconds Time in seconds when the after the callback is invoked.
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @param {Object} [param=undefined] Optional parameter to to the callback.
    */
    /**
        Registers a delayed callback invocation.

            TundraSDK.framework.frame.delayedExecute(1.0, function(param) {
                console.log(param); // 101
            }, 101);

        @method delayedExecute
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
