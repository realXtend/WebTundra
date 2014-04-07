
define([], function() {

/**
    String utilities.
    @class CoreStringUtils
    @constructor
*/
var CoreStringUtils =
{
    /**
        Returns if str1 starts with str2.
        @method startsWith
        @param {String} str1 String to examine.
        @param {String} str2 String to match to the start of str1.
        @param {Boolean} ignoreCase Case sensitivity.
        @return {Boolean}
    */
    startsWith : function(str1, str2, ignoreCase)
    {
        if (ignoreCase === true)
            return (str1.toLowerCase().indexOf(str2.toLowerCase()) === 0);
        else
            return (str1.indexOf(str2) === 0);
    },

    /**
        Returns if str1 ends with str2.
        @method endsWith
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
        Trims all white space from input string.
        @method trim
        @param {String} str String to trim.
        @return {String} Resulting string.
    */
    trim : function(str)
    {
        return (str.trim ? str.trim() : str.replace(/^\s+/, '').replace(/\s+$/, ''));
    },
   
    /**
        Trims all white space from the left end of input string.
        @method trimLeft
        @param {String} str String to trim.
        @return {String} Resulting string.
    */
    trimLeft : function(str)
    {
        return (str.trimLeft ? str.trimLeft() : str.replace(/^\s+/, ''));
    },

    /**
        Trims all instances of trimStr from the left side of the string.
        @method trimStringLeft
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
        @method trimRight
        @param {String} str String to trim.
        @return {String} Resulting string.
    */
    trimRight : function(str)
    {
        return (str.trimRight ? str.trimRight() : str.replace(/\s+$/, ''));
    },

    /**
        Trims all instances of trimStr from the left side of the string.
        @method trimStringRight
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
        @method readLine
        @param {String} str Source string for the operation.
        @param {String} [separator=undefined] Custom string separator where to break the string.
        @param {Boolean} [tabBreaks=false] If tab '\t' should break the string.
        @param {Boolean} [trimResult=false] Trim the start and end of the result string.
        @return {String} The resulting string. If nothing can be found to break with, the original string is returned.
    */
    readLine : function(str, separator, tabBreaks, trimResult)
    {
        if (tabBreaks === undefined)
            tabBreaks = false;
        if (trimResult === undefined)
            trimResult = false;

        var indexSplit = null;
        var indexEnd1 = str.indexOf("\n");
        var indexEnd2 = str.indexOf("\r\n");
        var indexEnd3 = (tabBreaks === true ? str.indexOf("\t") : -1);
        var indexCustom = (separator != null ? str.indexOf(separator) : -1);
        if (indexSplit == null || (indexEnd1 !== -1 && indexEnd1 < indexSplit))
            indexSplit = indexEnd1;
        if (indexSplit == null || (indexEnd2 !== -1 && indexEnd2 < indexSplit))
            indexSplit = indexEnd2;
        if (indexSplit == null || (indexEnd3 !== -1 && indexEnd3 < indexSplit))
            indexSplit = indexEnd3;
        if (indexSplit == null || (indexCustom !== -1 && indexCustom < indexSplit))
            indexSplit = indexCustom;
        var ret = (indexSplit !== -1 ? str.substring(0, indexSplit) : "");
        if (trimResult === true)
            ret = this.trim(ret);
        return ret;
    },

    /**
        Returns the lower-cased file extension including the starting dot, eg. ".png".

        @param {String} str Input string.
        @return {String}
    */
    extension : function(str)
    {
        return str.substring(str.lastIndexOf(".")).toLowerCase();
    },

    /**
        This function removes comments from text input. Useful for all
        sorts of text based core/script pre-processing to remove comments.

            - Lines that contain '//' will be replaced with empty string.
              - Must have only whitespace before the '//' characters.
            - Block comments /<asterix> comment <asterix>/ will be replaced with empty string.

        @method removeComments
        @param {String} str Input string.
        @return {String} Result string.
    */
    removeComments : function(str)
    {
        if (str == null || str.length === 0)
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

        // Forward slash comments.
        // - There have only whitespace before the // characters.
        // - The whole matched line will be replaced with empty string.
        var forwardSlashCommentRegExp = /^\s*\/\/.*/gm;
        if (forwardSlashCommentRegExp.test(str))
            str = str.replace(forwardSlashCommentRegExp, "");

        return str;
    }
};

return CoreStringUtils;

}); // require js
