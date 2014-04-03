
/// todo: check out http://millermedeiros.github.io/js-signals/ for mediator replacement.

define([
        "lib/signals",
        "core/event/EventSubscription"
    ], function(signals, EventSubscription) {

/**
    EventAPI that provides subscribing and unsubscribing from Web Tundra events.

    Usually objects in Web Tundra provide onSomeEvent functions to subscribe, use those if they exist.
    These functions will return you EventSubscription objects that you can pass into EventAPIs unsubscribe functions.

    If you are implementing a function that uses the EventAPI be sure to return the EventSubscription object to the
    caller that gets returned from subscribe().

    @class EventAPI
    @constructor
*/
var EventAPI = Class.$extend(
{
    __init__ : function(params)
    {
        // Private, don't doc.
        //this.mediator = new Mediator();
        this.signals = {};
    },

    /**
        Sends a event to all subscribers.

        You can pass up to 10 data paramers of arbitrary JavaScript type.
        Parameters will be sent until a 'undefined' parameter is found, so don't use it as a parameter because it will
        cut your arguments from that point onward. If 10 parameters is not enough for you use complex objects, the you
        can have whatever data you want in them and the number of args is not a limiting factor.

        In practise only pass the parametrs you want to send(), the rest will automatically be undefined which will mark
        the amount of your parameters sent to the subscribers.

        @example
            var sub = TundraSDK.framework.events.subscribe("MyCustomEvent", null, function(msg, list, isSomething) {
                console.log(msg);         // "Hello Subscriber!"
                console.log(list);        // [ 12, 15 ]
                console.log(isSomething); // false
            });

            TundraSDK.framework.events.send(sub, "Hello Subscriber!", [ 12, 15 ], false);
            TundraSDK.framework.events.send("MyCustomEvent", "Hello Subscriber!", [ 12, 15 ], false);

        @method send
        @param {EventSubscription|String} channel Subscription data or channel name.
        @param {Object} [param1=undefined] Data parameter to be sent.
        @param {Object} [param2=undefined] Data parameter to be sent.
        @param {Object} [param3=undefined] Data parameter to be sent.
        @param {Object} [param4=undefined] Data parameter to be sent.
        @param {Object} [param5=undefined] Data parameter to be sent.
        @param {Object} [param6=undefined] Data parameter to be sent.
        @param {Object} [param7=undefined] Data parameter to be sent.
        @param {Object} [param8=undefined] Data parameter to be sent.
        @param {Object} [param9=undefined] Data parameter to be sent.
        @param {Object} [param10=undefined] Data parameter to be sent.
        @return {EventSubscription} Subscription data.
    */
    send : function(subParam1, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10)
    {
        var channel = (typeof subParam1 == "string" ? subParam1 : subParam1.channel);

        // If the signal is not found, this is not an error.
        // It just means no one has subscribed to it yet, so
        // we dont need to post it.
        var signal = this.signals[channel];
        if (signal === undefined)
            return;

        // Early out
        if (!this._hasActiveListeners(signal))
            return;

        if (param1 === undefined)
            signal.dispatch();
        else if (param2 === undefined)
            signal.dispatch(param1);
        else if (param3 === undefined)
            signal.dispatch(param1, param2);
        else if (param4 === undefined)
            signal.dispatch(param1, param2, param3);
        else if (param5 === undefined)
            signal.dispatch(param1, param2, param3, param4);
        else if (param6 === undefined)
            signal.dispatch(param1, param2, param3, param4, param5);
        else if (param7 === undefined)
            signal.dispatch(param1, param2, param3, param4, param5, param6);
        else if (param8 === undefined)
            signal.dispatch(param1, param2, param3, param4, param5, param6, param7);
        else if (param9 === undefined)
            signal.dispatch(param1, param2, param3, param4, param5, param6, param7, param8);
        else if (param10 === undefined)
            signal.dispatch(param1, param2, param3, param4, param5, param6, param7, param8, param9);
        else
            signal.dispatch(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10);
    },

    /**
        Subsribes a callback to a channel event.
        @example
            var sub = TundraSDK.framework.events.subscribe("MyCustomEvent", null, function(msg, list, isSomething) {
                console.log(msg);         // "Hello Subscriber!"
                console.log(list);        // [ 12, 15 ]
                console.log(isSomething); // false
            });

            TundraSDK.framework.events.send(sub, "Hello Subscriber!", [ 12, 15 ], false);
            TundraSDK.framework.events.send("MyCustomEvent", "Hello Subscriber!", [ 12, 15 ], false);

        @method subscribe
        @param {String} channel Subscription channel name.
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription} Subscription data.
    */
    subscribe : function(channel, context, callback)
    {
        var signal = this.signals[channel];
        if (signal === undefined)
        {
            signal = new signals.Signal();
            signal._eventapi_priority = -1;
            signal._eventapi_id = -1;
            signal._eventapi_subscribers = {};
            this.signals[channel] = signal;
        }
        signal._eventapi_priority++;
        signal._eventapi_id++;

        var binding = signal.add(callback, context, signal._eventapi_priority);
        signal._eventapi_subscribers[signal._eventapi_id] = signal._bindings.length-1;

        //var mediatorSub = this.mediator.subscribe(channel, callback, {}, context);
        //var eventSub = ;
        return new EventSubscription(channel, signal._eventapi_id);
    },

    /**
        Subsribes a callback to a channel event.
        @example
            var sub = TundraSDK.framework.events.subscribe("MyCustomEvent", null, function() {
            });
            // Once you don't want the callbacks anymore.
            TundraSDK.framework.events.unsubscribe(sub);

        @method unsubscribe
        @param {EventSubscription} subscription Subscription data.
        @return {Boolean} If unsubscription was successful.
    */
    /**
        Subsribes a callback to a channel event. Prefer using the EventSubscription overload
        that will reset your sub id so that it cannot be used to unsubscribe again.
        @example
            var sub = TundraSDK.framework.events.subscribe("MyCustomEvent", null, function() {
            });
            // Once you don't want the callbacks anymore.
            TundraSDK.framework.events.unsubscribe(sub.channel, sub.id);
            // ... or
            TundraSDK.framework.events.unsubscribe("MyCustomEvent", sub.id);
            // Manually reset the id so this sub data cannot be used again to unsubscribe.
            sub.id = undefined;

        @method unsubscribe
        @param {String} channel Subscription channel name.
        @param {String} id Subscription id.
        @return {Boolean} If unsubscription was successful.
    */
    unsubscribe : function(param1, param2)
    {
        var channel = undefined;
        var id = undefined;
        if (param1 instanceof EventSubscription)
        {
            channel = param1.channel;
            id = param1.id;

            // Mark that this sub has now been unsubbed.
            // This data should go back to the callers object
            // and if it calls this function again, nothing happens.
            param1.id = undefined;
        }
        else
        {
            channel = param1;
            id = param2;
        }
        if (channel === undefined || channel === null)
            return false;
        if (id === undefined || id === null)
            return false;

        var signal = this.signals[channel];
        if (signal === undefined)
            return false;

        var bindingIndex = signal._eventapi_subscribers[id];
        if (bindingIndex !== undefined && signal._bindings[bindingIndex] !== undefined)
        {
            // We cannot remove the binding until all are unsubscribed.
            // This would break our internal-to-signaljs index tracking.
            // Free and mark as inactive until this happens.
            signal._bindings[bindingIndex]._destroy();
            signal._bindings[bindingIndex].active = false;
            signal._eventapi_subscribers[id] = undefined            

            if (!this._hasActiveListeners(signal))
            {
                signal.dispose();
                signal = undefined;
                delete this.signals[channel];
            }
        }

        return true;
    },

    /**
        Removes all event subscribers from a channel. Be careful with this, best option would be to let your APIs users unsubscribe when they see fit.
        @method remove
        @param {String} channel Subscription channel name.
    */
    remove : function(channel)
    {
        var signal = this.signals[channel];
        if (signal !== undefined)
        {
            signal.dispose();
            signal = undefined;
            delete this.signals[channel];
        }
    },

    _numActiveListeners : function(signal)
    {
        var num = 0;
        for (var i = signal.getNumListeners() - 1; i >= 0; i--) 
        {
            if (signal._bindings[i].active)
                num++;
        };
        return num;
    },

    _hasActiveListeners : function(signal)
    {
        for (var i = signal.getNumListeners() - 1; i >= 0; i--) 
        {
            if (signal._bindings[i].active)
                return true;
        };
        return false;
    }
});

return EventAPI;

}); // require js
