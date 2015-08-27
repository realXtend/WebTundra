
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/CoreStringUtils"
    ], function(Tundra, ITundraAPI, CoreStringUtils) {

var ConsoleAPI = ITundraAPI.$extend(
/** @lends ConsoleAPI.prototype */
{
    /**
        Provides registering and subscribing console commands.

        ConsoleAPI is a singleton and is accessible from {@link Tundra.console}.

        @constructs
        @extends ITundraAPI
        @private
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        this.commands = [];
    },

    // ITundraAPI override
    initialize : function()
    {
        Tundra.client.onLogInfo(this, this.logInfo);
        Tundra.client.onLogWarning(this, this.logWarning);
        Tundra.client.onLogError(this, this.logError);

        this.registerCommand("help", "Prints all available console commands", null, this, this.help);
    },

    /**
        Prints all available console commands to the UI console. Invoked by the 'help' console command.
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
        for (i = 0; i < this.commands.length; ++i)
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

        var c = Tundra.client;
        if (!c.ui.console)
            return;

        var currentText = c.ui.console.html();
        c.ui.console.html(currentText + "<span style='color:brown;'>" + html + "</span>");
        if (c.ui.console.is(":visible"))
            c.ui.console.animate({ scrollTop: c.ui.console.prop("scrollHeight") }, { queue : false, duration : 350 });
    },

    /**
        Returns the closest matching console command.

        @param {String} name Console command name you want to get suggestion for.
        @return {String|null} `null` if suggestion is the same as input param or no suggestion was found, otherwise the suggestion as a string.
    */
    commandSuggestion : function(name)
    {
        var nameLower = name.toLowerCase();
        for (var i = 0; i < this.commands.length; ++i)
            if (this.commands[i].name.toLowerCase() === nameLower)
                return null;
        for (i = 0; i < this.commands.length; ++i)
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

        @param {String} name Console command name.
        @param {String} description Description on what the command does.
        @param {String|null} parameterDescription Description of the parameters needed for invocation as a string e.g.
        "number, string, boolean". Pass `null` or empty string if you don't want parameters. Note: These are just hints
        to the user, don't make any assumptions about the correctness of the parameters in your callback.
        @param {Object} receiverContext Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} receiverCallback Function to be called. There will be single parameter of an Array to your callback when the
        command is invoked. All the parameters will be of type string. You need to do conversions if needed.
        @return {null|EventSubscription} Subscription data or `null` if failed to subscribe to the command.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * function onDoMagic(parameterArray)
        * {
        *     var str  = parameterArray[0]; // Expecting a string
        *     var num  = parseInt(parameterArray[1]); // Expecting a number
        *     var bool = (parameterArray[2] === "true" ? true : false); // Expecting a boolean
        * }
        *
        * Tundra.console.registerCommand("doMagic", "Does magical things!", "string, number, boolean", null, onDoMagic);
    */
    registerCommand : function(name, description, parameterDescription, receiverContext, receiverCallback)
    {
        if (typeof name !== "string")
        {
            Tundra.client.logError("[ConsoleAPI]: registerCommand 'name' parameter must be a non empty string!", true);
            return null;
        }
        var existing = this.getCommandData(name);
        if (existing)
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

        @param {String} name Console command name.
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called. There will be single parameter of an Array to your callback when the
        command is invoked. All the parameters will be of type string. You need to do conversions if needed.
        @return {null|EventSubscription} Subscription data or null if failed to subscribe to the command.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.

        * @example
        * Tundra.console.registerCommand("doStuff", null, function() {
        *     Tundra.client.logInfo("Doing stuff!");
        * });
    */
    subscribeCommand : function(name, context, callback)
    {
        if (callback === undefined || callback === null)
            return null;

        var commandData = this.getCommandData(name);
        if (commandData)
            return Tundra.events.subscribe(commandData.channel, context, callback);
        return null;
    },

    /**
        Tries to parse a raw string for a console command name and potential parameters and executes it.

        @param {String} Raw console command string with potential parameters e.g. "drawDebug (true, 12)" or "drawDebug true, 12".
        @return {Boolean} If a command could be executed with the input.
    */
    executeCommandRaw : function(str)
    {
        // @todo Use CoreStringUtils.parseCommand
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
        params = (params !== "" ? CoreStringUtils.trim(params).split(",") : []);
        var result = this.executeCommand(name, params);
        if (!result)
            Tundra.client.logError("Could not find console command '" + name + "'");
        return result;
    },

    /**
        Executes a console command by name.

        @param {String} name Console command name to execute.
        @param {Array} parameters Array of parameter strings (or other typed objects if you know the command handler knows how to deal with them).
        @return {Boolean} True if command could be found by the name and was executed, false otherwise.
    */
    executeCommand : function(name, parameters)
    {
        var commandData = this.getCommandData(name);
        if (commandData)
            Tundra.events.send(commandData.channel, parameters);
        return (commandData !== null);
    },

    /**
        Log information to the UI console.

        @param {String} message Message string.
    */
    logInfo : function(message)
    {
        var c = Tundra.client;
        if (c.ui && c.ui.console)
        {
            var currentText = c.ui.console.html();
            c.ui.console.html(currentText + message + "<br />");
            if (c.ui.console.is(":visible"))
                c.ui.console.animate({ scrollTop: c.ui.console.prop("scrollHeight") }, { queue : false, duration : 350 });
        }
    },

    /**
        Log information to the UI console.

        @param {String} message Message string.
    */
    logWarning : function(message)
    {
        var c = Tundra.client;
        if (c.ui && c.ui.console)
        {
            var currentText = c.ui.console.html();
            c.ui.console.html(currentText + "<span style='color: rgb(119,101,0);'>" + message + "</span><br />");
            if (c.ui.console.is(":visible"))
                c.ui.console.animate({ scrollTop: c.ui.console.prop("scrollHeight") }, { queue : false, duration : 350 });
        }
    },

    /**
        Log information to the UI console.

        @param {String} message Message string.
    */
    logError : function(message)
    {
        var c = Tundra.client;
        if (c.ui && c.ui.console)
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
