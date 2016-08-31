
define([
        "core/framework/Tundra",
        "core/framework/ITundraPlugin",
        "lib/benchmark/benchmark"
    ], function(Tundra, ITundraPlugin, __benchmark__)
{

var BenchmarkPlugin = ITundraPlugin.$extend(
{
    __init__ : function()
    {
        this.$super("BenchmarkPlugin", [ "Benchmark" ]);
        this.suites = {};
    },

    /// ITundraPlugin override
    pluginPropertyName : function()
    {
        return "benchmark";
    },

    /// ITundraPlugin override
    initialize : function(options)
    {

    },

    /// ITundraPlugin override
	postInitialize : function()
    {
	},

    suite: function(name)
    {
        if (this.suites[name])
            return this.suites[name];

        this.suites[name] = new Benchmark.Suite(name);
        return this.suites[name];
    }
});

Tundra.registerPlugin(new BenchmarkPlugin());

return BenchmarkPlugin;

});