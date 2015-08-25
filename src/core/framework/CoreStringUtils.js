
define([
        "lib/three",
        "core/framework/Tundra"
    ], function(THREE, Tundra) {

/**
    String utilities.

    @namespace
    @global
*/
var CoreStringUtils =
{
    _splitLinesRegExp      : /\r?\n/g,
    _dblFwdSlashRegExp     : /^\s*\/\/.*/gm,
    _whiteSpaceStartRegExp : /^\s+/,
    _whiteSpaceEndRegExp   : /\s+$/,

    /**
        Creates a new UUID
        @return {String}
    */
    uuid : function()
    {
        return THREE.Math.generateUUID();
    },

    formatNumber : function(num)
    {
        return num.toLocaleString("fr-FR"); // fr-FR should be quite safe bet all over the world
    },

    /**
        Returns if str1 starts with str2.

        @param {String} str1 String to examine.
        @param {String} str2 String to match to the start of str1.
        @param {Boolean} ignoreCase Case sensitivity.
        @return {Boolean}
    */
    startsWith : function(str1, str2, ignoreCase)
    {
        return (CoreStringUtils.indexOf(str1, str2, ignoreCase) === 0);
    },

    /**
        Returns if str1 ends with str2.

        @param {String} str1 String to examine.
        @param {String} str2 String to match to the end of str1.
        @param {Boolean} ignoreCase Case sensitivity.
        @return {Boolean}
    */
    endsWith : function(str1, str2, ignoreCase)
    {
        var index = str1.length - str2.length;
        if (ignoreCase === true)
            return (index > -1 && str1.toLowerCase().substring(index) === str2.toLowerCase());
            //return (index >= 0 && str1.toLowerCase().indexOf(str2.toLowerCase(), index) > -1);
        else
            return (index > -1 && str1.substring(index) === str2);
            //return (index >= 0 && str1.indexOf(str2, index) > -1);
    },

    /**
        Returns the index at which str2 is contained inside str1. By default, it is case-sensitive.
        @param {String} str1 String to examine
        @param {String} str2 String to match
        @param {Boolean} [ignoreCase=false] If true, it will do a case-insensitive match
        @return {String}
    */
    indexOf : function(str1, str2, ignoreCase)
    {
        ignoreCase = ignoreCase || false;
        if (ignoreCase)
            return str1.toLowerCase().indexOf(str2.toLowerCase());
        else
            return str1.indexOf(str2);
    },

    /**
        Trims all white space from input string.

        @param {String} str String to trim.
        @return {String} Resulting string.
    */
    trim : function(str)
    {
        return (str.trim ? str.trim() : str.replace(this._whiteSpaceStartRegExp, '').replace(this._whiteSpaceEndRegExp, ''));
    },

    /**
        Trims all white space from the left end of input string.

        @param {String} str String to trim.
        @return {String} Resulting string.
    */
    trimLeft : function(str)
    {
        return (str.trimLeft ? str.trimLeft() : str.replace(this._whiteSpaceStartRegExp, ''));
    },

    /**
        Trims all instances of trimStr from the left side of the string.

        @param {String} str String to trim.
        @param {String} trimStr String to trim.
        @return {String} Resulting string.
    */
    trimStringLeft : function(str, trimStr)
    {
        var trimLen = trimStr.length;
        while (str.length > 0 && str.substring(0, trimLen) === trimStr)
            str = str.substring(trimLen);
        return str;
    },

    /**
        Trims all white space from the right end of input string.

        @param {String} str String to trim.
        @return {String} Resulting string.
    */
    trimRight : function(str)
    {
        return (str.trimRight ? str.trimRight() : str.replace(this._whiteSpaceEndRegExp, ''));
    },

    /**
        Trims all instances of trimStr from the left side of the string.

        @param {String} str String to trim.
        @param {String} trimStr String to trim.
        @return {String} Resulting string.
    */
    trimStringRight : function(str, trimStr)
    {
        var trimLen = trimStr.length;
        while (str.length > 0 && str.substring(str.length-trimLen) === trimStr)
            str = str.substring(0, str.length-trimLen);
        return str;
    },

    /**
        Reads a line until a line ending (\n, \r\n), optionally tab (\t) or a custom string separator.

        @param {String} str Source string for the operation.
        @param {String} [separator=undefined] Custom string separator where to break the string.
        @param {Boolean} [tabBreaks=false] If tab '\t' should break the string.
        @param {Boolean} [trimResult=false] Trim the start and end of the result string.
        @return {String} The resulting string. If nothing can be found to break with, the original string is returned.
    */
    readLine : function(str, separator, tabBreaks, trimResult)
    {
        tabBreaks = (typeof tabBreaks === "boolean" ? tabBreaks : false);
        trimResult = (typeof trimResult === "boolean" ? trimResult : false);

        var indexSplit = -1;
        var indexEnd1 = str.indexOf("\n");
        var indexEnd2 = str.indexOf("\r\n");
        var indexEnd3 = (tabBreaks ? str.indexOf("\t") : -1);
        var indexCustom = (typeof separator === "string" && separator !== "" ? str.indexOf(separator) : -1);
        if (indexSplit === -1 || (indexEnd1 !== -1 && indexEnd1 < indexSplit))
            indexSplit = indexEnd1;
        if (indexSplit === -1 || (indexEnd2 !== -1 && indexEnd2 < indexSplit))
            indexSplit = indexEnd2;
        if (indexSplit === -1 || (indexEnd3 !== -1 && indexEnd3 < indexSplit))
            indexSplit = indexEnd3;
        if (indexSplit === -1 || (indexCustom !== -1 && indexCustom < indexSplit))
            indexSplit = indexCustom;
        var ret = (indexSplit !== -1 ? str.substring(0, indexSplit) : "");
        if (trimResult)
            ret = this.trim(ret);
        return ret;
    },

    /**
        Splits input string with '\n' and '\r\n'.

        @param {String} str Input data.
        @return {Array} Lines as a string array
    */
    splitLines : function(str)
    {
        return str.split(this._splitLinesRegExp);
    },

    /**
        Splits input string with '\n' and '\r\n' and removes empty lines.
        Returns a string that has '\n' line endings, preserving
        the last line ending if there was one.

        @param {String} str Input data.
        @return {String}
    */
    removeEmptyLines : function(str)
    {
        if (typeof str !== "string" || str === "")
            return str;

        var hasEnd = (str[str.length-1] === "\n");
        var lines = this.splitLines(str);
        for (var i = 0; i < lines.length; i++)
        {
            if (this.trim(lines[i]) === "")
            {
                lines.splice(i,1);
                i--;
            }
        }
        return lines.join("\n") + (hasEnd ? "\n" : "");
    },

    /**
        Returns the lower-cased file extension including the prefix dot, e.g. ".png".

        @param {String} str Input string.
        @return {String}
    */
    extension : function(str)
    {
        var trimmed = this.trim(str);
        // Strip query from URLs http(s)://domain.com/path/to/my.jpg?id=123312
        if (this.startsWith(trimmed, "http", true) && trimmed.indexOf("?") !== -1)
            trimmed = trimmed.substring(0, trimmed.indexOf("?"));
        var dotIndex = trimmed.lastIndexOf(".");
        if (dotIndex !== -1)
            return trimmed.substring(dotIndex).toLowerCase();
        // No extension
        return "";
    },

    /**
        This function removes comments from text input. Useful for all
        sorts of text based core/script pre-processing to remove comments.

            - Lines that contain '//' will be replaced with empty string.
              - Must have only whitespace before the '//' characters.
            - Block comments /<asterix> comment <asterix>/ will be replaced with empty string.

        @param {String} str Input string.
        @return {String} Result string.
    */
    removeComments : function(str)
    {
        if (typeof str !== "string" || str === "")
            return str;

        // Block comments /* comment */
        /// @todo Could not find a working js regexp for this. Might be faster.
        var commentBlockIndex = str.indexOf("/*");
        if (commentBlockIndex !== -1)
        {
            var commentBlockEndIndex = str.indexOf("*/", commentBlockIndex+2);
            while (commentBlockIndex !== -1 && commentBlockEndIndex !== -1)
            {
                var preBlock = str.substring(0, commentBlockIndex);
                var postBlock = str.substring(commentBlockEndIndex+2);

                str = preBlock + postBlock;

                commentBlockIndex = str.indexOf("/*");
                if (commentBlockIndex !== -1)
                    commentBlockEndIndex = str.indexOf("*/", commentBlockIndex+2);
            }
        }

        /* Forward slash comments.
           - There have only whitespace before the // characters.
           - The whole matched line will be replaced with empty string. */
        if (this._dblFwdSlashRegExp.test(str))
            str = str.replace(this._dblFwdSlashRegExp, "");

        return str;
    },

    /**
        Returns a query parameter from the current pages

        @param {String} name Name of the query parameter.
        @return {String} Result or empty string if not found.
    */
    queryValue : function(name)
    {
        if (window.location.search === "" || typeof name !== "string" || name === "")
            return "";

        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        var results = regex.exec(window.location.search);
        return (results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " ")));
    },

    /**
        Returns query parameter value as boolean.

        @param {String} name Name of the query parameter.
        @return {Boolean} True if value is "true" or "1". Comparison is case insensitive.
    */
    queryValueBool : function(name)
    {
        var value = this.queryValue(name);
        if (typeof value === "string" && value !== "")
            return (value.toLowerCase() === "true" || value === "1");
        return false;
    },

    /**
        Returns query parameter value as integer.

        @param {String} name Name of the query parameter.
        @param {Number} defaultValue Value returned if an number cannot be parsed or value does not exist.
        @return {Number} Value returned from parseInt if type is number and not NaN.
    */
    queryValueInt : function(name, defaultValue)
    {
        defaultValue = (typeof defaultValue === "number" ? defaultValue : 0);

        var value = this.queryValue(name);
        if (typeof value === "string" && value !== "")
        {
            var num = parseInt(value);
            if (typeof num === "number" && !isNaN(num))
                return num;
        }
        return defaultValue;
    },

    /**
        Returns query parameter value as float.

        @param {String} name Name of the query parameter.
        @param {Number} defaultValue Value returned if an number cannot be parsed or value does not exist.
        @return {Number} Value returned from parseFloat if type is number and not NaN.
    */
    queryValueFloat : function(name, defaultValue)
    {
        defaultValue = (typeof defaultValue === "number" ? defaultValue : 0.0);

        var value = this.queryValue(name);
        if (typeof value === "string" && value !== "")
        {
            var num = parseFloat(value);
            if (typeof num === "number" && !isNaN(num))
                return num;
        }
        return defaultValue;
    },

    /**
        Creates query string from a object.

        @param {Object} options Key value pairs you want to include in the query
        @param {Boolean} [percentEncode=false] If values should be percent encoded.
        @return {String} String prefixed with "?", empty string if options was empty.
    */
    createQueryString : function(options, percentEncode)
    {
        if (typeof options !== "object")
        {
            console.error("CoreStringUtils.query: 'options' must bea object");
            return "";
        }
        percentEncode = (typeof percentEncode === "boolean" ? percentEncode : false);

        var queryValue = "";
        for (var key in options)
        {
            var value = options[key].toString();
            if (percentEncode)
                value = encodeURIComponent(value);

            if (queryValue === "")
                queryValue += "?" + key + "=" + value;
            else
                queryValue += "&" + key + "=" + value;
        }
        return queryValue;
    },

    /**
        Converts the value of a JS "enum" to a corresponding string presentation.

        @param {Object} enumObject Object containing the enum values.
        @param {Number} enumValue Value for which the string presentation is wanted.
        @param {String} notFoundValue Value that is returned if the enumString was not found.
        @return {String} The string presentation value or notFoundValue.
    */
    enumToString : function(enumObject, enumValue, notFoundValue)
    {
        for(var i in enumObject)
            if (enumObject.hasOwnProperty(i) && typeof enumObject[i] === "number" && enumValue === enumObject[i])
                return i;
        return notFoundValue;
    },

    /**
        Converts a string presentation of the name of a JS "enum" to a corresponding value.

        @param {Object} enumObject Object containing the enum values.
        @param {String} enumString String presentation for which the value is wanted.
        @param {Number} notFoundValue Value that is returned if the enumString was not found.
        @param {Boolean} caseSensitive Whether to compare case-sensitively or not.
        @return {Number} The corresponding value or notFoundValue.
    */
    stringToEnum : function(enumObject, enumString, notFoundValue, caseSensitive)
    {
        for(var i in enumObject)
            if (enumObject.hasOwnProperty(i) && typeof enumObject[i] === "number" && enumString.match(new RegExp(i, caseSensitive ? "" : "i")))
                return enumObject[i];
        return notFoundValue;
    },

    /**
        Splits a string of form "MyFunctionName(param1, param2, param3, ...)" into
        a 'command' string "MyFunctionName" and a list of parameters, if such has been provided.

        @param {Object} str Command string. The parameter values can contain parentheses.
        @return {Object} Object containing 'command' (String) and 'parameters' (Array of Strings). properties.
    */
    parseCommand : function(str)
    {
        var ret = { command : "", parameters : [] };

        str = str.trim();
        if (str.length === 0)
            return ret;

        var split = str.indexOf("(");
        if (split == -1)
        {
            ret.command = str;
            return ret;
        }

        ret.command = str.slice(0, split).trim();
        // Take into account the possible ending ")" and strip it away from the parameter list.
        // Remove it only if it's the last character in the string, as f.ex. some code execution console
        // command could contain ')' in the syntax.
        var endOfSplit = str.lastIndexOf(")");
        if (endOfSplit != -1 && endOfSplit == str.length-1)
            str = str.substring(0, endOfSplit);

        ret.parameters = str.substring(split+1).split(",");
        // Trim parameters in order to avoid errors if/when converting strings to other data types.
        for(var i = 0; i < ret.parameters.length; ++i)
            ret.parameters[i] = ret.parameters[i].trim();

        return ret;
    }
};

Tundra.Classes.CoreStringUtils = CoreStringUtils;

return CoreStringUtils;

}); // require js
