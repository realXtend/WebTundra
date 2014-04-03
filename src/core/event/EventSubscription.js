
define(function() {

/**
    Event subscription data object returned from {{#crossLink "EventAPI/subscribe:method"}}{{/crossLink}}.

    @class EventSubscription
    @constructor
    @param {String} channel Subscription channel name.
    @param {String} id Subscription id.
*/
var EventSubscription = Class.$extend(
{
    __init__ : function(channel, id)
    {
        /**
            Subscription channel name.
            @property channel
            @type String
        */
        this.channel = channel;
        /**
            Subscription id.
            @property id
            @type String
        */
        this.id = id;
    }
});

return EventSubscription;

}); // require js
