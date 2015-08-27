
define([
        "core/framework/Tundra"
    ], function(Tundra) {

/**
    Singlegon that provides frame stats.

    Adapted from https://github.com/mrdoob/stats.js/blob/master/src/Stats.js

    @namespace
    @global
*/
var FrameStats =
{
    ms     : 0.0,
    msMin  : Infinity,
    msMax  : 0.0,

    /**
        Last measured FPS.
        @var {Number}
    */
    fps    : 0.0,
    /**
        Min FPS.
        @var {Number}
    */
    fpsMin : Infinity,
    /**
        Max FPS.
        @var {Number}
    */
    fpsMax : 0.0,

    frames : 0,

    startTime : performance.now(),
    prevTime  : performance.now(),

    // Do NOT call this function in your code, invoked by Tundra framework.
    _tick : function()
    {
        // performance.now is polyfilled in TundraPolyfills.js that is part of core Tundra
        var time = performance.now();

        this.ms = time - this.startTime;
        this.msMin = Math.min(this.msMin, this.ms);
        this.msMax = Math.max(this.msMax, this.ms);
        this.frames++;

        // Update 4 times a second
        if (time > this.prevTime + 250.0)
        {
            this.fps = (this.frames * 1000.0) / (time - this.prevTime);
            this.fpsMin = Math.min(this.fpsMin, this.fps);
            this.fpsMax = Math.max(this.fpsMax, this.fps);

            this.prevTime = time;
            this.frames = 0;
        }

        return time;
    },

    // Do NOT call this function in your code, invoked by Tundra framework.
    _update : function()
    {
        this.startTime = this._tick();
    }
};

return FrameStats;

}); // require js
