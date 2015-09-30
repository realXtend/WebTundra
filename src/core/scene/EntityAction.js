
define([
        "lib/classy",
    ], function(Class) {

// @todo Move entity action related utility functions to this class (as static in __classvars__)

var EntityAction = Class.$extend(
/** @lends EntityAction.prototype */
{
    /**
        Represents an executable command on an Entity.

        Components (and other instances) can listen to these actions by using {{#crossLink "Entity/onEntityAction:method"}}Entity.onEntityAction(){{/crossLink}}.
        Actions allow more complicated in-world logic to be built in slightly more data-driven fashion.
        Actions cannot be created directly, they're created under the hood by calling {{#crossLink "Entity/exec:method"}}Entity.exec(){{/crossLink}}.

        Use {@link EntityAction.Local}, {@link EntityAction.Server} and {@link EntityAction.Peers} static properties when performing {@link Entity#exec}.

        @constructs
    */
    __init__ : function()
    {
        /**
            @var {String}
        */
        this.name = undefined;
        /**
            @var {EntityAction.Type}
        */
        this.executionType = EntityAction.Invalid;
        /**
            @var {Array.<Object>}
        */
        this.parameters = [];
        /**
            @var {Entity}
        */
        this.entity = undefined;
        /**
            @var {Number}
        */
        this.entityId = undefined;
    },

    __classvars__ :
    {
        /**
            @static
            @type {Number}
            @default 0
        */
        Invalid       : 0,
        /**
            Execute entity action locally.
            @static
            @type {Number}
            @default 1
        */
        Local         : 1,
        /**
            Execute entity action on server.
            @static
            @type {Number}
            @default 2
        */
        Server        : 2,
        /**
            Execute entity action on all peer clients.
            @static
            @type {Number}
            @default 4
        */
        Peers         : 4
    }
});

return EntityAction;

}); // require js
