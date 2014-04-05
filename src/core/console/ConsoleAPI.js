
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/CoreStringUtils"
    ], function(Class, TundraSDK, CoreStringUtils) {

/**
    ConsoleAPI that is accessible from {{#crossLink "TundraClient/console:property"}}TundraClient.console{{/crossLink}}

    Provides registering and subscribing console commands.
    @class ConsoleAPI
    @constructor
*/
var ConsoleAPI = Class.$extend(
{
    __init__ : function(params)
    {
        this.commands = [];

        TundraSDK.framework.client.onLogInfo(this, this.logInfo);
        TundraSDK.framework.client.onLogWarning(this, this.logWarning);
        TundraSDK.framework.client.onLogError(this, this.logError);

        this.registerCommand("help", "Prints all available console commands", null, this, this.help);
    },

    /**
        Prints all available console commands to the UI console. Invoked by the 'help' console command.
        @method help
    */
    help : function()
    {
        if (this.commands.length <= 0)
            return;

        var longestCommand = 0;
        for (var i = 0; i < this.commands.length; ++i)
            if (this.commands[i].name.length > longestCommand)
                longestCommand = this.commands[i].name.length;

        var html = "";
        for (var i = 0; i < this.commands.length; ++i)
        {
            var commandData = this.commands[i];
            if (commandData.name === undefined || commandData.name === null)
                continue;
            var prettyName = commandData.name;
            while (prettyName.length < longestCommand)
                prettyName += " ";
            html += "  " + prettyName + (commandData.description !== "" ? " - " + commandData.description : "") + "<br/>";
            if (commandData.parameterDescription !== "")
            {
                var padding = "";
                while (padding.length < longestCommand)
                    padding += " ";
                html += padding + "     <span style='color:black;'>" + commandData.parameterDescription + "</span><br/>";
            }
        }

        var c = TundraSDK.framework.client;
        if (c.ui.console == null)
            return;

        var currentText = c.ui.console.html();
        c.ui.console.html(currentText + "<span style='color:brown;'>" + html + "</span>");
        if (c.ui.console.is(":visible"))
            c.ui.console.animate({ scrollTop: c.ui.console.prop("scrollHeight") }, { queue : false, duration : 350 });
    },

    /**
        Returns the closest matching console command.
        @method commandSuggestion
        @param {String} name Console command name you want to get suggestion for.
        @return {String|null} Null if suggestion is the same as input param or no suggestion was found, otherwise the suggestion as a string.
    */
    commandSuggestion : function(name)
    {
        var nameLower = name.toLowerCase();
        for (var i = 0; i < this.commands.length; ++i)
            if (this.commands[i].name.toLowerCase() === nameLower)
                return null;
        for (var i = 0; i < this.commands.length; ++i)
            if (this.commands[i].name.toLowerCase().indexOf(nameLower) === 0)
                return this.commands[i].name;
        return null;
    },

    getCommandData : function(name)
    {
        var nameLower = name.toLowerCase();
        for (var i = 0; i < this.commands.length; ++i)
            if (this.commands[i].name.toLowerCase() === nameLower)
                return this.commands[i];
        return null;
    },

    /**
        Register a new console command. If a console command with this name (case-insensitive) has already been registered, your callback will be connected.

            function onDoMagic(parameterArray)
            {
                var str  = parameterArray[0]; // Expecting a string
                var num  = parseInt(parameterArray[1]); // Expecting a number
                var bool = (parameterArray[2] === "true" ? true : false); // Expecting a boolean
            }

            TundraSDK.framework.console.registerCommand("doMagic", "Does magical things!", "string, number, boolean", null, onDoMagic);

        @method registerCommand
        @param {String} name Console command name.
        @param {String} description Description on what the command does.
        @param {String|null} parameterDescription Description of the parameters needed for invokation as a string eg.
        "number, string, boolean". Pass in null or empty string if you don't want parameters. Note: These are just hints
        to the user, don't make any assumptions about the correctness of the parameters in your callback.
        @param {Object} receiverContext Context of in which the callback function is executed. Can be null.
        @param {Function} receiverCallback Function to be called. There will be single parameter of an Array to your callback when the
        command is invoked. All the parameters will be of type string. You need to do conversions if needed.
        @return {null|EventSubscription} Subscription data or null if failed to subscribe to the command.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    registerCommand : function(name, description, parameterDescription, receiverContext, receiverCallback)
    {
        if (typeof name !== "string")
        {
            TundraSDK.framework.client.logError("[ConsoleAPI]: registerCommand 'name' parameter must be a non empty string!", true);
            return null;
        }
        var existing = this.getCommandData(name);
        if (existing != null)
            return this.subscribeCommand(name, receiverContext, receiverCallback);

        if (description === undefined || description === null)
            description = "";
        if (parameterDescription === undefined || parameterDescription === null)
            parameterDescription = "";

        var index = this.commands.length;
        this.commands.push({
            "channel"     : "ConsoleAPI." + index,
            "index"       : index,
            "name"        : name,
            "description" : description,
            "parameterDescription" : parameterDescription
        });

        return this.subscribeCommand(name, receiverContext, receiverCallback);
    },

    /**
        Subscribe to a existing console command.

            TundraSDK.framework.console.registerCommand("doStuff", null, function() {
                TundraSDK.framework.client.logInfo("Doing stuff!");
            });

        @method subscribeCommand
        @param {String} name Console command name.
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called. There will be single parameter of an Array to your callback when the
        command is invoked. All the parameters will be of type string. You need to do conversions if needed.
        @return {null|EventSubscription} Subscription data or null if failed to subscribe to the command.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    subscribeCommand : function(name, context, callback)
    {
        if (callback === undefined || callback === null)
            return null;

        var commandData = this.getCommandData(name);
        if (commandData != null)
            return TundraSDK.framework.events.subscribe(commandData.channel, context, callback);
        return null;
    },

    /**
        Tries to parse a raw string for a console command name and potential parameters and executes it.
        @method executeCommandRaw
        @param {String} Raw console command string with porential parameters eg. "drawDebug (true, 12)" or "drawDebug true, 12".
        @return {Boolean} If a command could be executed with the input. */
    executeCommandRaw : function(str)
    {
        str = CoreStringUtils.trim(str);
        var name = str;
        var params = "";
        if (str.indexOf("(") != -1)
        {
            name = CoreStringUtils.trim(str.substring(0, str.indexOf("(")));
            params = CoreStringUtils.trim(str.substring(str.indexOf("(")+1));
        }
        if (params === "" && str.indexOf(" ") != -1)
        {
            name = CoreStringUtils.trim(str.substring(0, str.indexOf(" ")));
            params = CoreStringUtils.trim(str.substring(str.indexOf(" ")+1));
        }
        if (params.indexOf(")") != -1)
            params = params.substring(0, params.indexOf(")"));

        name = CoreStringUtils.trim(name);
        params = (params !== "" ? CoreStringUtils.trim(params).split(",") : [])
        var result = this.executeCommand(name, params);
        if (!result)
            TundraSDK.framework.client.logError("Could not find console command '" + name + "'");
        return result;
    },

    /**
        Executes a console command by name.
        @method executeCommand
        @param {String} name Console command name to execute.
        @param {Array} parameters Array of parameter strings (or other typed objects if you know the command handler knows how to deal with them).
        @return {Boolean} True if command could be found by the name and was executed, false otherwise. */
    executeCommand : function(name, parameters)
    {
        var commandData = this.getCommandData(name);
        if (commandData != null)
            TundraSDK.framework.events.send(commandData.channel, parameters);
        return (commandData != null);
    },

    /**
        Log information to the UI console. See also {{#crossLink "TundraClient/logInfo:method"}}TundraClient.logInfo{{/crossLink}}.
        @method logInfo
        @param {String} message Message string.
    */
    logInfo : function(message)
    {
        var c = TundraSDK.framework.client;
        if (c.ui != null && c.ui.console != null)
        {
            var currentText = c.ui.console.html();
            c.ui.console.html(currentText + message + "<br />");
            if (c.ui.console.is(":visible"))
                c.ui.console.animate({ scrollTop: c.ui.console.prop("scrollHeight") }, { queue : false, duration : 350 });
        }
    },

    /**
        Log information to the UI console. See also {{#crossLink "TundraClient/logWarning:method"}}TundraClient.logWarning{{/crossLink}}.
        @method logWarning
        @param {String} message Message string.
    */
    logWarning : function(message)
    {
        var c = TundraSDK.framework.client;
        if (c.ui != null && c.ui.console != null)
        {
            var currentText = c.ui.console.html();
            c.ui.console.html(currentText + "<span style='color: rgb(119,101,0);'>" + message + "</span><br />");
            if (c.ui.console.is(":visible"))
                c.ui.console.animate({ scrollTop: c.ui.console.prop("scrollHeight") }, { queue : false, duration : 350 });
        }
    },

    /**
        Log information to the UI console. See also {{#crossLink "TundraClient/logError:method"}}TundraClient.logError{{/crossLink}}.
        @method logError
        @param {String} message Message string.
    */
    logError : function(message)
    {
        var c = TundraSDK.framework.client;
        if (c.ui != null && c.ui.console != null)
        {
            var currentText = c.ui.console.html();
            c.ui.console.html(currentText + "<span style='color: red;'>" + message + "</span><br />");
            if (c.ui.console.is(":visible"))
                c.ui.console.animate({ scrollTop : c.ui.console.prop("scrollHeight") }, { queue : false, duration : 350 });
        }
    }
});

return ConsoleAPI;

}); // require js
