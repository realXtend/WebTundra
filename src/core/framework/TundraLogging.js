
define([
        "lib/classy",
        "lib/loglevel",
        "core/framework/TundraSDK"
    ], function(Class, log, TundraSDK) {

var _hackLogLevelPending = null;

/**
    Tundra log utility.

    @class TundraLogger
    @constructor
    @param {String} name Log channel name.
*/
var TundraLogger = Class.$extend(
{
    __init__ : function(name)
    {
        this.name = name;
        this.prefix = "[" + name + "]:";
    },

    _createArguments : function(args, includeLineInfo)
    {
        var out = [].slice.call(args);
        out.splice(0, 0, this.prefix);
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
        @method info
    */
    info : function()
    {
        log.info.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
        Logs additionally to the UI console if created.
        @method infoC
    */
    infoC : function()
    {
        var args = this._createArguments(arguments);
        log.info.apply(null, args);
        if (TundraSDK.framework.console != null)
            TundraSDK.framework.console.logInfo(this._createArgumentsString(args));
    },

    /**
        This function takes in any number of objects like console.log().
        @method warn
    */
    warn : function()
    {
        log.warn.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
        Logs additionally to the UI console if created.
        @method warnC
    */
    warnC : function()
    {
        var args = this._createArguments(arguments);
        log.warn.apply(null, args);
        if (TundraSDK.framework.console != null)
            TundraSDK.framework.console.logWarning(this._createArgumentsString(args));
    },

    /**
        This function takes in any number of objects like console.log().
        @method error
    */
    error : function()
    {
        log.error.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
        Logs additionally to the UI console if created.
        @method errorC
    */
    errorC : function()
    {
        var args = this._createArguments(arguments);
        log.error.apply(null, args);
        if (TundraSDK.framework.console != null)
            TundraSDK.framework.console.logError(this._createArgumentsString(args));
    },

    /**
        This function takes in any number of objects like console.log().
        @method debug
    */
    debug : function()
    {
        log.debug.apply(null, this._createArguments(arguments));
    },

    /**
        This function takes in any number of objects like console.log().
        @method trace
    */
    trace : function()
    {
        log.trace.apply(null, this._createArguments(arguments));
    }
});

/**
    Logging utilities.
    @class TundraLogging
    @constructor
*/
var TundraLogging =
{
    /**
        Logging level.
        @property Level
        @static
        @example
            {
                "TRACE"  : 0,
                "DEBUG"  : 1,
                "INFO"   : 2,
                "WARN"   : 3,
                "ERROR"  : 4,
                "SILENT" : 5
            }
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

    loggers : [],

    /**
        Creates/fetches a logger by name, eg. TundraLogging.getLogger("MyRenderer");
        @static
        @method getLogger
        @param {String} name Log channel name.
        @return {TundraLogger}
    */
    getLogger : function(name)
    {
        for (var i = 0; i < this.loggers.length; i++)
        {
            if (this.loggers[i].name === name)
                return this.loggers[i];
        }

        var logger = new TundraLogger(name);
        this.loggers.push(logger);
        return logger;
    },

    /**
        Enable all log levels.
        @static
        @method enableAll
    */
    enableAll : function()
    {
        log.enableAll();
    },

    /**
        Disable all log levels.
        @static
        @method disableAll
    */
    disableAll : function()
    {
        log.disableAll();
    },

    /**
        Set log level.
        @static
        @method setLevel
        @param {TundraLogging.Level} level
    */
    setLevel : function(level)
    {
        log.setLevel(level);
        log.debug("[Logging]: Setting log level to", this.levelString(level));
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

return TundraLogging;

}); // require js
