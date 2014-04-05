
define([
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(IComponent, Attribute) {

/**
    Script component.
    @class EC_Script
    @extends IComponent
    @constructor
*/
var EC_Script = IComponent.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @property scriptRef (attribute)
            @type Attribute
        */
        this.declareAttribute(0, "scriptRef", [], Attribute.AssetReferenceList);
        /**
            @property runOnLoad (attribute)
            @type Attribute
        */
        this.declareAttribute(1, "runOnLoad", false, Attribute.Bool);
        /**
            @example
                if (ent.script.runMode === EC_Script.RunMode.Both)
                    ...;
                else if (ent.script.runMode === EC_Script.RunMode.Client)
                    ...;
                else if (ent.script.runMode === EC_Script.RunMode.Server)
                    ...;
            @property runMode (attribute)
            @type Attribute
        */
        this.declareAttribute(2, "runMode", EC_Script.RunMode.Both, Attribute.Int);
        /**
            @property applicationName (attribute)
            @type Attribute
        */
        this.declareAttribute(3, "applicationName", "", Attribute.String);
        /**
            @property className (attribute)
            @type Attribute
        */
        this.declareAttribute(4, "className", "", Attribute.String);
    },

    __classvars__ :
    {
        /**
            Script run mode enumeration.
            @property RunMode
            @static
            @example
                {
                    Both   : 0,
                    Client : 1,
                    Server : 2
                };
        */
        RunMode :
        {
            Both   : 0,
            Client : 1,
            Server : 2
        },

        nativeScriptReplacements : [],

        /**
            Register an web client script to replace certain native Tundra script ref.
            Useful for register hot swapping apps so you don't have to add two client scripts to your scene.
            The keyword will be matched against the script file name only, not the full URL. Comparison is case-insensitive.
            @static
            @method registerNativeScriptReplacement
            @param {String} Script ref keyword, if this keyword is found from a scriptref it will be replaced.
            @param {String} Replacement script ref.
        */
        registerNativeScriptReplacement : function(scriptRefKeyword, replacementScriptRef)
        {
            this.nativeScriptReplacements.push({
                "keyword"     : scriptRefKeyword,
                "replacement" : replacementScriptRef
            });
        },

        localScriptReplacement : [],

        /**
            Registers a local replacement file for .webtundrajs scripts. Essentially allows you
            to use a local script for development/debug purpouses.
        */
        registerLocalScriptReplacement : function(scriptRefKeyword, replacementScriptRef)
        {
            this.localScriptReplacement.push({
                "keyword"     : scriptRefKeyword,
                "replacement" : replacementScriptRef
            });
        }
    }
});

return EC_Script;

}); // require js
