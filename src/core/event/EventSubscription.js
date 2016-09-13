
define([
        "lib/classy",
        "core/framework/Tundra"
    ],
    function(Class, Tundra) {

var EventSubscription = Class.$extend(
/** @lends EventSubscription.prototype */
{
    /**
        Event subscription returned from {@link EventAPI#subscribe}.
        This object is read only, modifying it has not effect on the prior subscribtion.

        @constructs
        @param {String} channel
        @param {String} id
        @param {Number} [priority]
    */
    __init__ : function(channel, id, priority)
    {
        /**
            Subscription channel name.
            @var {String}
        */
        this.channel = channel;
        /**
            Subscription id.
            @var {String}
        */
        this.id = id;
        /**
            Subscription priority.
            @var {Number}
        */
        this.priority = priority;
    },

    /**
        Reset and unsubscribe.
    */
    reset : function()
    {
        Tundra.events.unsubscribe(this);
    },

    /**
        Returns if the subscribtion is currently active.

        @return {Boolean}
    */
    isActive : function()
    {
        return (this.id !== undefined);
    }
});

return EventSubscription;

}); // require js
