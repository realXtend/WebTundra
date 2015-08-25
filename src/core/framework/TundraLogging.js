
define([
        "lib/classy",
        "lib/loglevel",
        "core/framework/Tundra"
    ], function(Class, log, Tundra) {

var TundraLogger = Class.$extend(
/** @lends TundraLogger.prototype */
{
    /**
        @constructs
        @param {String} name Name of the log channel. Prefixed to each printed line.
    */
    __init__ : function(name)
    {
        this.name = name;
        this.prefix = "[" + name + "]:";
    },

    /**
        Returns if debug level is enabled.
        @return {Boolean}
    */
    isDebug : function()
    {
        return (log && log.level <= 1);
    },

    _createArguments : function(args, includeLineInfo)
    {
        var out = [ this.prefix ];
        for (var i = 0, len = args.length; i < len; i++)
            out.push(args[i]);
        if (includeLineInfo === true)
            out.splice(0, 0, this._callerLine());
        return out;
    },

    _createArgumentsString : function(argsArray)
    {
        var parts = [];
        for (var i = 0; i < argsArray.length; i++)
        {
            var obj = argsArray[i];
            if (Array.isArray(obj))
                parts.push("[" + obj.join(", ") + "]");
            else if (typeof obj === "object")
                parts.push(JSON.stringify(obj));
            else
                parts.push(obj.toString());
        }
        return parts.join(" ");
    },

    _callerLineLink : function(numInStack)
    {
        if (numInStack === undefined)
            numInStack = 4;
        var line = (new Error).stack.split("\n")[numInStack];
        line = line.substring(line.indexOf("at ")+3);
        return line.substring(line.lastIndexOf("(")+1, line.length-1);
    },

    /**
        This function takes in any number of objects like console.log().
    */
    info : function()
    {
        log.info.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
        Logs additionally to the UI console if created.
    */
    infoC : function()
    {
        var args = this._createArguments(arguments);
        log.info.apply(null, args);
        if (Tundra.console != null)
            Tundra.console.logInfo(this._createArgumentsString(args));
    },

    /**
        This function takes in any number of objects like console.log().
    */
    warn : function()
    {
        log.warn.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
        Logs additionally to the UI console if created.
    */
    warnC : function()
    {
        var args = this._createArguments(arguments);
        log.warn.apply(null, args);
        if (Tundra.console != null)
            Tundra.console.logWarning(this._createArgumentsString(args));
    },

    /**
        This function takes in any number of objects like console.log().
    */
    error : function()
    {
        log.error.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
        Logs additionally to the UI console if created.
    */
    errorC : function()
    {
        var args = this._createArguments(arguments);
        log.error.apply(null, args);
        if (Tundra.console != null)
            Tundra.console.logError(this._createArgumentsString(args));
    },

    /**
        This function takes in any number of objects like console.log().
    */
    debug : function()
    {
        log.debug.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
    */
    trace : function()
    {
        log.trace.apply(null, this._createArguments(arguments));
    }
});

/**
    Logging utilities.

    @namespace
    @global
*/
var TundraLogging =
{
    /**
        Logging level.
    */
    Level :
    {
        "TRACE"  : 0,
        "DEBUG"  : 1,
        "INFO"   : 2,
        "WARN"   : 3,
        "ERROR"  : 4,
        "SILENT" : 5
    },

    loggers : {},

    CurrentLevel       : "INFO",
    DebugLevelEnabled  : false,

    /**
        @function
        @deprecated
        @see {@link TundraLogging.get}
    */
    getLogger : function(name)
    {
        return this.get(name);
    },

    /**
        Creates/fetches a logger by name, e.g. TundraLogging.getLogger("MyApp");
        @param {String} name Log channel name.
        @return {TundraLogger}
    */
    get : function(name)
    {
        var logger = this.loggers[name];
        if (logger === undefined)
        {
            logger = this.loggers[name] = new TundraLogger(name);
        }
        return logger;
    },

    /**
        Enable all log levels.
    */
    enableAll : function()
    {
        log.enableAll();
    },

    /**
        Disable all log levels.
    */
    disableAll : function()
    {
        log.disableAll();
    },

    /**
        Set log level.
        @param {TundraLogging.Level} level
    */
    setLevel : function(level)
    {
        if (typeof level === "string")
            level = level.toUpperCase();
        else if (typeof level !== "number")
            return;

        this.CurrentLevel = this.levelString(level);
        this.DebugLevelEnabled = (this.CurrentLevel === "DEBUG" || this.CurrentLevel === "TRACE");

        log.setLevel(level);
        log.debug("[WebTundra]: Setting log level to", this.CurrentLevel);
    },

    levelString : function(level)
    {
        if (typeof level === "string")
            return level;
        else if (typeof level === "number")
        {
            for (var l in TundraLogging.Level)
                if (level === TundraLogging.Level[l])
                    return l;
        }
        return "Invalid loglevel " + level.toString();
    }
};

Tundra.Classes.TundraLogging = TundraLogging;

return TundraLogging;

}); // require js
