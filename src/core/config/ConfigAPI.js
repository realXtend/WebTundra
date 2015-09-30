
define([
        "core/framework/Tundra",
        "core/framework/ITundraAPI",
        "core/framework/TundraLogging"
    ], function(Tundra, ITundraAPI, TundraLogging) {

var ConfigAPI = ITundraAPI.$extend(
/** @lends ConfigAPI.prototype */
{
    /**
        ConfigAPI serves to write configuration information that will be stored inside the local storage of the browser. The config data is distinguishable by section and key.
        As a name convention, a section can be the name of your application, while the key can be a descriptive name of the config data you are storing.

        For more information on local storages visit <a href="http://www.w3schools.com/html/html5_webstorage.asp"> the W3Schools section for local storage</a>.

        ConfigAPI is a singleton and is accessible from {@link Tundra.config}.

        @constructs
        @extends ITundraAPI
        @private
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        /**
            If local storage is supported in the executing browser.
            @var {Boolean}
        */
        this.supported = (window.localStorage !== undefined);
        if (!this.supported)
            this.log.warn("Browser does not support 'localStorage', disabling functionality.");
    },

    /**
        Read all values of a config section. This is more efficient than reading single values.

        @param {String} section Section name.
        @return {Object}
    */
    readSection : function(section)
    {
        if (typeof section !== "string" || section.trim() === "")
        {
            this.log.error("readSection: Invalid 'section':", section);
            return {};
        }
        else if (!this.supported)
            return {};

        // We store things as strings and parse them back to objects
        var sectionValue = localStorage.getItem("webtundra." + section);
        if (typeof sectionValue === "string")
        {
            try
            {
                return JSON.parse(sectionValue);
            }
            catch(e)
            {
                this.log.error("readSection: failed to parse object from section '" + section + "' value '" + sectionValue + "': " + e);
                if (e.stack)
                    console.error(e.stack);
            }
        }
        return {};
    },

    /**
        Read a single value from a config section.

        @param {String} section Section name
        @param {String} key Key
        @param {String} defaultValue The value that will be returned if section.key value is not defined in config.
        @return {Object}
    */
    read : function(section, key, defaultValue)
    {
        if (typeof key !== "string" || key.trim() === "")
        {
            this.log.error("read: Invalid 'key':", key);
            return defaultValue;
        }
        else if (!this.supported)
            return defaultValue;

        var config = this.readSection(section);
        if (typeof config !== "object")
            return defaultValue;

        // 'null' is a valid value
        return (config[key] !== undefined ? config[key] : defaultValue);
    },

    /**
        Write an object to the section level. This is useful for writing multiple keys per section, or deleting all data associated with a section.

        @param {String} section Section name
        @param {Object} obj Object to be written.
        @return {Boolean} `true` if write succeeded.
    */
    writeSection : function(section, obj)
    {
        if (typeof section !== "string" || section.trim() === "")
        {
            this.log.error("writeSection: Invalid 'section':", section);
            return false;
        }
        else if (obj === null || typeof obj !== "object" || Array.isArray(obj))
        {
            this.log.error("writeSection: Invalid parameter 'obj' not type of 'object' instead is '" + (Array.isArray(obj) ? "Array" : typeof obj) + "'", obj);
            if (obj === null || obj === undefined)
                this.log.error("You used undefined or null, if you wish to reset/remove the section pass in a empty object literal '{}' instead");
            return false;
        }
        else if (!this.supported)
            return false;

        try
        {
            localStorage.setItem("webtundra." + section, JSON.stringify(obj));
            return true;
        }
        catch(e)
        {
            this.log.error("writeSection: " + e);
            if (e.stack)
                console.error(e.stack);
        }
        return false;
    },

    /**
        Writes a single value to a config section.

        @param {String} section Section name
        @param {String} key Key
        @param {Object} value If `undefined` the key will be removed.
        @return {Boolean} `true` if write succeeded.
    */
    write : function(section, key, value)
    {
        if (typeof key !== "string" || key.trim() === "")
        {
            this.log.error("write: Invalid 'key':", key);
            return false;
        }
        else if (!this.supported)
            return false;

        var config = this.readSection(section);
        if (value !== undefined)
            config[key] = value;
        else
            delete config[key];
        return this.writeSection(section, config);
    },

    /**
        Checks if section.key value exists.

        @param {String} section Section name
        @param {String} key Key
        @return {Boolean} Returns `false` if the value is `undefined`
        or `section` does not exist, otherwise `true`.
    */
    valueExists : function(section, key)
    {
        if (typeof key !== "string" || key.trim() === "")
        {
            this.log.error("valueExists: Invalid 'key':", key);
            return false;
        }
        else if (!this.supported)
            return false;

        var config = this.readSection(section);
        return (config[key] !== undefined);
    }
});

return ConfigAPI;

}); // requirejs
