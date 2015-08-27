
define([
        "lib/classy",
        "core/framework/Tundra"
    ], function(Class, Tundra) {

var FrameProfiler = Class.$extend(
/** @lends FrameProfiler.prototype */
{
    /**
        Utility for profiling user defined code scopes.

        @constructs
        @param {String} name
    */
    __init__ : function(name)
    {
        this.name = name;
        this.scopes = {};

        this.Scope = function(name)
        {
            this.name = name;
            this.groupFunc = undefined;
            this.decimals = 4;
            this.count = 0;
            this.time = 0;
            this.spent = 0.0;
            this.spentTotal = 0.0;
        };

        this.Scope.prototype.group = function(name, collapsed)
        {
            if (typeof name === "boolean" && collapsed === undefined)
            {
                collapsed = name;
                name = undefined;
            }
            collapsed = (typeof collapsed === "boolean" ? collapsed : false);

            this.groupFunc = console.group;
            if (typeof this.groupFunc === "function" && typeof console.groupEnd === "function")
            {
                if (collapsed && typeof console.groupCollapsed)
                    this.groupFunc = console.groupCollapsed;
                this.groupFunc.call(console, name || this.name);

                this.count++;
            }
            else
                this.groupFunc = undefined;

            return this.start();
        },

        this.Scope.prototype.groupEnd = function(name)
        {
            if (this.time !== 0)
                this.report();

            if (this.groupFunc)
                console.groupEnd();

            return this;
        },

        this.Scope.prototype.start = function()
        {
            this.time = performance.now();
            if (!this.groupFunc)
                this.count++;

            return this;
        };

        this.Scope.prototype.end = function()
        {
            this.spent = (performance.now() - this.time);
            this.spentTotal += this.spent;
            this.time = 0;

            return this;
        };

        this.Scope.prototype.report = function()
        {
            if (this.count === 0)
                return;
            if (this.time !== 0)
                this.end();

            if (arguments.length === 0)
            {
                console.debug(
                    "FrameProfiler." + this.name,
                    "   count", this.count,
                    "   msec", this.spent.toFixed(4), "/", this.spentTotal.toFixed(2)
                );
            }
            else
            {
                var args = [
                    "FrameProfiler." + this.name,
                    "   count", this.count,
                    "   msec", this.spent.toFixed(4), "/", this.spentTotal.toFixed(2),
                    "   "
                ];
                for (var i = 0; i < arguments.length; i++)
                    args.push(arguments[i]);
                console.debug.apply(console, args);
            }

            return this;
        };
    },

    scope : function(name)
    {
        if (typeof name !== "string" || name === "")
            name = this.name || "";

        var scope = this.scopes[name.toLowerCase()];
        if (scope === undefined)
        {
            scope = this.scopes[name.toLowerCase()] = new this.Scope(name);
        }
        return scope;
    },

    group : function(name, title, collapse)
    {
        if (typeof name !== "string" || name === "")
            name = this.name || "";
        if (typeof title === "string")
            name += "." + title;
        return this.scope(name).group(title, collapse);
    },

    groupEnd : function(name)
    {
        return this.scope(name).groupEnd();
    },

    start : function(name)
    {
        return this.scope(name).start();
    },

    end : function(name)
    {
        return this.scope(name).end();
    },

    report : function(name)
    {
        return this.scope(name).report();
    }
});

Tundra.Classes.FrameProfiler = FrameProfiler;

return FrameProfiler;

}); // require js
