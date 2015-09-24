
define([
        "lib/classy",
    ], function(Class) {

var AttributeChange = Class.$extend(
/** @lends AttributeChange.prototype */
{
    /**
        AttributeChange contains enumeration of attribute/component change types for replication.

        * @example
        * var changeMode = AttributeChange.LocalOnly;

        @constructs
    */
    __init__ : function()
    {
    },

    __classvars__ :
    {
        /**
            Use the current sync method specified in the IComponent this attribute is part of.

            @static
            @var {Number}
            @default 0
        */
        Default         : 0,
        /**
            The value will be changed, but no notifications will be sent (even locally).
            This is useful when you are doing batch updates of several attributes at a
            time and want to minimize the amount of re-processing that is done.

            @static
            @var {Number}
            @default 1
        */
        Disconnected    : 1,
        /**
            The value change will be signalled locally immediately after the change occurs,
            but it is not sent to the network.

            @static
            @var {Number}
            @default 2
        */
        LocalOnly       : 2,
        /**
            Replicate: After changing the value, the change will be signalled locally and this
            change is transmitted to the network as well.

            @static
            @var {Number}
            @default 3
        */
        Replicate       : 3
    }
});

return AttributeChange;

}); // require js
