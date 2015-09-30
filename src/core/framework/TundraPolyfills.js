
define([], function() {

// Polyfills browser capabilities that WebTunda needs.
// @note This module does not export any functionality.
(function() {

    // Adapted/copied from https://gist.github.com/paulirish/5438650
    if (typeof window.performance === "undefined")
        window.performance = {};

    if (!window.performance.now)
    {
        var nowOffset = Date.now();
        if (performance.timing && performance.timing.navigationStart)
            nowOffset = performance.timing.navigationStart

        window.performance.now = function now() {
            return Date.now() - nowOffset;
        };
    }

})();

return {};

}); // require js
