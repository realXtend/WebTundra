
define([
        "lib/signals",
        "core/framework/ITundraAPI",
        "core/event/EventSubscription"
    ], function(signals, ITundraAPI, EventSubscription) {

var EventAPI = ITundraAPI.$extend(
/** @lends EventAPI.prototype */
{
    /**
        In the WebTundra naming convention, objects in WebTundra that provide events have methods, whose names start with the preposition "on" (for example `object.onSomeEvent()`). Use those if provided by the class,
        and if creating new ones, be sure to name your methods with an appropriate description of what has happened or what is about to happen (for example `onEventAboutToHappen` or `onEventHappened`)
        These functions will return you an {{#crossLink "EventSubscription"}}{{/crossLink}} object that you can use to manage the subscription.

        When implementing your own event via the `EventAPI`, be sure to return the `EventSubscription` object to the
        caller that gets returned from  {{#crossLink "EventAPI/subscribe:method"}}{{/crossLink}}.

        When subscribing you can optionally specify a priority to control the order in which the handler functions are invoked.
        If wanting to suppress the event you are handling in an event callback, return `false` from the callback.

        EventAPI is a singleton and is accessible from {@link Tundra.events}.

        @constructs
        @extends ITundraAPI
        @summary EventAPI provides subscribing to, and unsubscribing from WebTundra events.

        * @example
        * // Provide a wrapper method for your event subscribtion in your object as follows
        * onIncremented : function(context, callback, priority)
        * {
        *     // Name your channel with an identifer that is unique. Preferred way of channel naming is `ClassName.EventName` as shown below.
        *     return Tundra.events.subscribe("Counter.Increment", context, callback, priority);
        * },
        *
        * // The following function will increment `value`, and then send the `Counter.Increment` event to all subscribers.
        * increment : function()
        * {
        *     this.value++;
        *     // You can send any number of parameters to the event subscribers.
        *     Tundra.events.send("Counter.Increment", this.value, { something: this.someOtherState.x });
        * }
    */
    __init__ : function(name, options, globalOptions)
    {
        this.$super(name, options);

        this.signals = {};

        // Turn on verbose logging for each sub/unsub event
        this.debugging = false;
    },

    /**
        Sends an event to all subscribers.

        You can pass up to 10 data parameters of arbitrary JavaScript types.
        If 10 parameters is not enough for you, complex objects can be used to have whatever data you want in them and the number of arguments is not a limiting factor.

        In practice only pass the parameters you want to send(), the rest will automatically be undefined which will mark
        the amount of your parameters sent to the subscribers.

        @param {String|EventSubscription} event Channel name or `EventSubscription` where channel will be resolved.
        @param {Object} [param=undefined] You can pass in any number of parameters as data after the channel to the sent event.
        Parameters will be sent until an `undefined` parameter is found, so don't use it as a parameter because it will
        cut your arguments from that point onward.
        @return {Boolean} `true` if event propagation was stopped at some point, `false` otherwise.

        * @example
        * // The following snippet will create an event named `MyCustomEvent`, attach an anonymous function as a listener,
        * // and send the event by using both an EventSubscription object and event name
        * var sub = Tundra.events.subscribe("MyCustomEvent", null, function(msg, list, isSomething) {
        *     console.log(msg);         // "Hello Subscriber!"
        *     console.log(list);        // [ 12, 15 ]
        *     console.log(isSomething); // false
        * });
        *
        * Tundra.events.send(sub, "Hello Subscriber!", [ 12, 15 ], false);
        * Tundra.events.send("MyCustomEvent", "Hello Subscriber!", [ 12, 15 ], false);
    */
    send : function(name)
    {
        var _name = (typeof name === "string" ? name : name.channel);
        if (typeof _name !== "string")
        {
            this.log.error("send: First parameter must be a channel name or a EventSubscription object:", _name);
            return false;
        }

        // Not an error if not found, no one just has not subscribed to it yet.
        var signal = this.signals[_name];
        if (signal === undefined || !signal.hasActiveBindings())
            return false;

        /* Drop 'name' from arguments. Unusual code due to world around for V8 "bug".
           https://code.google.com/p/v8/issues/detail?id=3037
           https://github.com/jashkenas/coffeescript/issues/3274
           https://github.com/joyent/node/commit/7ced966a32dd18b4de2768f41796af76638341f9 */
        this._args = [];
        if (arguments.length > 1)
        {
            for (var i = 1; i < arguments.length; i++)
                this._args.push(arguments[i]);
        }
        //this._args = [].slice.call(arguments, 1); // <-- triggers unoptimizations for v8

        signal.dispatch.apply(signal, this._args);

        return (!signal._shouldPropagate);
    },

    _args : [],

    /**
        Subscribes a callback to an event identified by `channel`.

        @param {String} channel Subscription channel name. Preferred naming is <code>ClassName.EventName</code>
        @param {Object} context Context of in which the callback function is executed. Can be <code>null</code>.
        @param {Function} callback Function to be called. Return <code>false</code> inside the function to suppress the event.
        @param {Number} [priority] The priority level of the event listener (default 0). Listeners with higher priority will
            be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they subscribed.
        @return {EventSubscription} Subscription data.

        * @example
        * var sub = Tundra.events.subscribe("MyCustomEvent", function(msg, list, isSomething) {
        *     console.log(msg);         // "Hello Subscriber"
        *     console.log(list);        // [ 12, 15 ]
        *     console.log(isSomething); // false
        * });
        *
        * // There are two options for defining a context for the callback function.
        * // One is by giving the context as an argument to `subscribe`
        * var sub2 = Tundra.events.subscribe("MyCustomEvent", this, function() {
        *     console.log("with context", this.someState, arguments);
        *     this.doSomething();
        * });
        * // The other is by binding it to the function object, just as it is done in pure Javascript
        * var sub3 = Tundra.events.subscribe("MyCustomEvent", function() {
        *     console.log("with bind",arguments);
        *     this.doSomething();
        * }.bind(this));
        *
        * // The handler can also be a non-anonymous function
        * var sub4 = Tundra.events.subscribe("MyCustomEvent", this, this.onCustomEvent);
        * var sub5 = Tundra.events.subscribe("MyCustomEvent", this.onCustomEvent.bind(this));
        *
        * // Send the event by calling `send` somewhere in your code
        * Tundra.events.send("MyCustomEvent", "Hello Subscriber!", [ 12, 15 ], false);
    */
    subscribe : function(channel, context, callback, priority)
    {
        /* Allow passing only the callback without a explicit context.
           Swap params if 'context' is a function and callback is not.
           In this case also no thet callback may be the priority. */
        if (typeof context === "function" && typeof callback !== "function")
        {
            if (typeof callback === "number" && typeof priority !== "number")
                priority = callback;

            callback = context;
            context = undefined;
        }
        priority = (typeof priority === "number" ? priority : 0);

        var signal = this._getOrCreateSignal(channel);
        return signal.subscribe(callback, context, priority);
    },

    _getOrCreateSignal : function(channel)
    {
        var signal = this.signals[channel];
        if (signal !== undefined)
            return signal;
        return this._createSignal(channel);
    },

    _createSignal : function(channel)
    {
        var signal = new signals.Signal();
        signal.tundra = { subIndex : 0, channel : channel, debugging : this.debugging };

        signal.subscribe = function(callback, context, priority)
        {
            var id = (++this.tundra.subIndex);

            var subscription = new EventSubscription(this.tundra.channel, id);

            var binding = this.add(callback, context, priority);
            binding.tundra = { id : id, subscription : subscription };

            if (this.tundra.debugging === true)
                console.debug("subscribed  ", binding.tundra.subscription.id, this.tundra.channel);

            return subscription;
        };

        signal.unsubscribe = function(id)
        {
            for (var bi = this._bindings.length - 1; bi >= 0; bi--)
            {
                var binding = this._bindings[bi];
                if (binding.tundra.id === id)
                {
                    // tundra state
                    if (binding.tundra.subscription instanceof EventSubscription)
                    {
                        if (this.tundra.debugging === true)
                            console.debug("unsubscribed", binding.tundra.subscription.id, this.tundra.channel);
                        binding.tundra.subscription.id = undefined;
                    }
                    binding.tundra = {};

                    // signals.js state
                    binding._destroy();
                    binding.active = false;

                    this._bindings.splice(bi, 1);
                    return true;
                }
            }
            return false;
        };

        signal.aboutToDispose = function()
        {
            for (var bi = this._bindings.length - 1; bi >= 0; bi--)
            {
                var binding = this._bindings[bi];

                // tundra state
                if (binding.tundra.subscription instanceof EventSubscription)
                {
                    if (this.tundra.debugging === true)
                        console.debug("unsubscribed ALL", binding.tundra.subscription.id, this.tundra.channel);
                    binding.tundra.subscription.id = undefined;
                }
                binding.tundra = {};
            }
        };

        signal.numBindings = function()
        {
            return this._bindings.length
        };

        signal.hasActiveBindings = function()
        {
            for (var bi = this._bindings.length - 1; bi >= 0; bi--)
            {
                if (this._bindings[bi].active === true)
                    return true;
            }
            return false;
        };

        signal.numActiveBindings = function()
        {
            var num = 0;
            for (var bi = this._bindings.length - 1; bi >= 0; bi--)
            {
                if (this._bindings[bi].active === true)
                    num++;
            }
            return num;
        };

        signal.numSubscribtions = function()
        {
            var num = 0;
            for (var bi = this._bindings.length - 1; bi >= 0; bi--)
            {
                var binding = this._bindings[bi];
                if (binding.tundra.subscription instanceof EventSubscription)
                    num++;
            }
            return num;
        };

        signal.hasActiveSubscribtions = function()
        {
            for (var bi = this._bindings.length - 1; bi >= 0; bi--)
            {
                var binding = this._bindings[bi];
                if (binding.tundra.subscription instanceof EventSubscription && typeof binding.tundra.subscription.id === "number")
                    return true;
            }
            return false;
        };

        signal.numActiveSubscribtions = function()
        {
            var num = 0;
            for (var bi = this._bindings.length - 1; bi >= 0; bi--)
            {
                var binding = this._bindings[bi];
                if (binding.tundra.subscription instanceof EventSubscription && typeof binding.tundra.subscription.id === "number")
                    num++;
            }
            return num;
        };

        this.signals[channel] = signal;
        return signal;
    },

    /**
        Unsubscribes a callback from a channel.

        @param {EventSubscription|String} sub `EvebtSubscription` object or channel name.
        @param {String} [id] Subscription id if first parameter is not a `EventSubscription` object.
        @return {Boolean} `true` if unsubscription was successful, `false` otherwise.

        * @example
        * var sub = Tundra.events.subscribe("MyCustomEvent", myCustonContext, function() {
        *     console.log("event occurred");
        * });
        * // Once you don't want the callbacks anymore prefer using the subscribtion API.
        * sub.reset();
        * // Or use EventAPI directly
        * Tundra.events.unsubscribe(sub);

        * // Your subscribtion has now been invalidated by reseting the id,
        * // you must subscribe again to receive events. It is still safe
        * // to call ubsubscribe with the inactivated subscribtion.
        * sub = Tundra.events.subscribe("MyCustomEvent", ...);

        * // Event senders may at any point unsubscribe all listeners if they see fit.
        * // This is many times the case for per server connection or per Scene/Entity/Component/Attribute
        * // events when the sender is reseted or restroyed. You can check if your subscribtion is still active.
        * if (!sub.isActive())
        *     sub = Tundra.events.subscribe(...);
    */
    unsubscribe : function(param1, param2)
    {
        var channel = param1, id = param2;

        if (param1 instanceof EventSubscription)
        {
            channel = param1.channel;
            id = param1.id;
        }
        if (typeof channel !== "string" || typeof id !== "number")
            return false;

        var signal = this.signals[channel];
        if (signal === undefined)
            return false;

        var result = signal.unsubscribe(id);
        if (result && !signal.hasActiveBindings())
        {
            if (this.debugging === true)
                console.debug("disposing empty channel", signal.tundra.channel);

            signal.dispose();
            signal = undefined;
            delete this.signals[channel];
        }

        if (result && param1 instanceof EventSubscription)
            param1.id = undefined;

        return result;
    },

    /**
        Removes all event subscribers from a channel. Use with caution, best option would be to let your APIs users unsubscribe when they see fit.
        However sometimes event senders want to reset all the subscribers, for example when disconnecting from a server.

        @param {String} channel Subscription channel name.
        @return {Boolean} `true` if channel was found, `false` otherwise.
    */
    remove : function(channel)
    {
        var signal = this.signals[channel];
        if (signal !== undefined)
        {
            signal.aboutToDispose();
            signal.dispose();
            signal = undefined;

            delete this.signals[channel];
            return true;
        }
        return false;
    },

    /**
        Prints current subscribtion state to console for debug inspection.
    */
    dumpState : function()
    {
        var numSubscribtions = 0;
        for (var channel in this.signals)
        {
            var signal = this.signals[channel];
            numSubscribtions += signal.numActiveSubscribtions();

            console.debug({ bindings : signal.numBindings(), active_b : signal.numActiveBindings(),
                            subs     : signal.numSubscribtions(), active_s : signal.numActiveSubscribtions()
                          }, channel);

            // These should always match or you most likely have a bug somewhere!
            if (signal.numBindings() !== signal.numActiveBindings() || signal.numSubscribtions() !== signal.numActiveSubscribtions())
                console.warn("Number of listeners do not match up. EventAPI internals might have a bug?");
        }
        console.debug("Total signals", Object.keys(this.signals).length, "Total subscriptions", numSubscribtions);
    }
});

return EventAPI;

}); // require js
