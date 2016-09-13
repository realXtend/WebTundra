
define([
        "lib/classy"
    ], function(Class, TundraLogging, Transform) {

var AttributeInterpolationData = Class.$extend(
/** @lends AttributeInterpolationData.prototype */
{
    /**
        @constructs
    */
    __init__ : function(data)
    {
        this.previous = undefined;
        this.current = undefined;

        this.previousCanCopy = false;
        this.currentCanCopy = false;
    },

    change : function(current)
    {
        if (this.current)
        {
            if (!this.previousCanCopy)
            {
                this.previous = this.current.clone();
                this.previousCanCopy = (typeof this.previous.copy === "function");
            }
            else
                this.previous.copy(this.current);
        }

        if (!this.currentCanCopy)
        {
            this.current = current.clone();
            this.currentCanCopy = (typeof this.current.copy === "function");
        }
        else
            this.current.copy(current);
    },

    reset : function()
    {
        this.previous = undefined;
        this.current = undefined;
    }
});

return AttributeInterpolationData;

}); // require js
