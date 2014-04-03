
define([
        "lib/classy",
    ], function(Class) {

/// @todo Move entity action related utility functions to this class (as static in __classvars__)

/**
    Dummy class containing enumeration of attribute/component change types for replication.
    <pre>var changeMode = AttributeChange.LocalOnly;</pre>
    @class AttributeChange
*/
var EntityAction = Class.$extend(
{
    __init__ : function()
    {
        this.name = undefined;
        this.executionTypeName = undefined;
        this.executionType = EntityAction.Invalid;
        this.parameters = [];

        this.entity = undefined;
        this.entityId = undefined;
    },

    __classvars__ :
    {
        /**
            @property Invalid
            @final
            @static
            @type Number
            @default 0
        */
        Invalid       : 0,
        /**
            Execute entity action locally.
            @property Local
            @final
            @static
            @type Number
            @default 1
        */
        Local         : 1,
        /**
            Execute entity action on server.
            @property Server
            @final
            @static
            @type Number
            @default 2
        */
        Server        : 2,
        /**
            Execute entity action on all peer clients.
            @property Peers
            @final
            @static
            @type Number
            @default 4
        */
        Peers         : 4
    }
});

return EntityAction;

}); // require js
