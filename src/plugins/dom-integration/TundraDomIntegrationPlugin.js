
define([
        "core/framework/TundraSDK",
        "core/framework/ITundraPlugin",
        "plugins/dom-integration/TundraDomIntegration"
    ], function(TundraSDK, ITundraPlugin, TundraDomIntegration) {

var TundraDomIntegrationPlugin = ITundraPlugin.$extend(
{
    __init__ : function()
    {
        this.$super("TundraDomIntegrationPlugin");
    },

    initialize : function()
    {
        this.framework.client.setDomIntegration(new TundraDomIntegration());
    }
});

TundraSDK.registerPlugin(new TundraDomIntegrationPlugin());

return TundraDomIntegrationPlugin;

}); // require js
