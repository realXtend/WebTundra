
define([
        "lib/classy",
        "core/framework/Tundra"
    ], function(Class, Tundra) {

var FrameLimiter = Class.$extend(
/** @lends FrameLimiter.prototype */
{
    /**
        Utility for handling fixed frame updates at a user defined FPS.

        @constructs
        @param {Number} step - Update step in seconds
    */
    __init__ : function(step)
    {
        /**
            Update step in seconds at which interval updates are executed.
            @var {Number}
        */
        this.step = (typeof step === "number" ? step : 0.0);

        // Private
        this.t = 0.0;
        this.time = performance.now();
    },

    /**
        Advances the time from wall clock time.
        This is useful when you want to use FrameLimiter but don't have
        information about the frametime diff that is provided by FrameAPI.onUpdate.

        This function will be automatically called in shouldUpdate if you don't pass
        a frametime.
    */
    tick : function()
    {
        var now = performance.now();
        this.t += ((performance.now() - this.time) / 1000.0); // msec to sec
        this.time = now;
    },

    /**
        Returns if you should update on this frame.

        @param {Number} [frametime] Time since last update in seconds. If not a number
        frametime will be automatically calculated with the update function.
        @return {Boolean} `true` if user defined step has been reached.
    */
    shouldUpdate : function(frametime)
    {
        if (typeof frametime === "number")
            this.t += frametime;
        else
            this.tick();

        if (this.t >= this.step)
        {
            this.t = (this.t % this.step);
            return true;
        }
        return false;
    }
});

Tundra.Classes.FrameLimiter = FrameLimiter;

return FrameLimiter;

}); // require js
