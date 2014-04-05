

var tundra = tundra || {};

tundra.createWebTundraClient = function(params) {
    if (params === undefined || params === null)
        params = {};
    if (params.renderSystem === undefined)
        params.renderSystem = ThreeJsRenderer;

    // Instantiate the client
    tundra.client = new TundraClient({
        container              : params.container,
        renderSystem           : params.renderSystem,
        asset                  : params.asset,
        applications           : params.applications
    });
    tundra.TundraSDK = TundraSDK;

    return tundra.client;
}

