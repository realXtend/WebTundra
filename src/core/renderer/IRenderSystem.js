
define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging"
    ], function(Class, TundraSDK, TundraLogging) {

/**
    Render system interface. Can be selected via client startup parameters.

    Implementations can optionally be to register with {{#crossLink "TundraClient/registerRenderSystem:method"}}TundraClient.registerRenderSystem{{/crossLink}}.
    This way the renderer can be loaded by name. Usually selecting the renderer is done by passing the renderer to client startup parameters.

    @class IRenderSystem
    @constructor
    @param {String} name Render system name.
*/
var IRenderSystem = Class.$extend(
{
    __init__ : function(name)
    {
        this.name = name;
    },

    __classvars__ :
    {
        register : function(clientPrototype)
        {
            var renderer = new this();
            if (clientPrototype.registerRenderSystem(renderer))
                return renderer;
            return null;
        }
    },

    _load : function(params)
    {
        TundraLogging.getLogger("IRenderSystem").info("Loading " + this.name + " render system");
        this.load(params);
    },

    /**
        Loads the render system.

        @method load
        @param {Object} params Client startup parameters.
    */
    load : function(params)
    {
    },

    _unload : function()
    {
        TundraLogging.getLogger("IRenderSystem").info("Unloading " + this.name + " render system");
        this.unload();
    },

    /**
        Unloads the render system.

        @method unload
    */
    unload : function()
    {
    },

    /**
        Called after all modules are loaded and all APIs have been post initialized.

        @method postInitialize
    */
    postInitialize : function()
    {
    },

    /**
        Set active camera component.

        @method setActiveCamera
        @param {EC_Camera} cameraComponent
    */
    setActiveCamera : function(cameraComponent)
    {
        TundraLogging.getLogger("IRenderSystem").warn("setActiveCamera() not implemented.");
    },

    /**
        Get the active camera component.

        @method activeCamera
        @return {EC_Camera}
    */
    activeCamera : function()
    {
        TundraLogging.getLogger("IRenderSystem").warn("activeCamera() not implemented.");
        return null;
    },

    /**
        Get the active camera entity.

        @method activeCameraEntity
        @return {Entity}
    */
    activeCameraEntity : function()
    {
        TundraLogging.getLogger("IRenderSystem").warn("activeCameraEntity() not implemented.");
        return null;
    },

    /**
        Create a new scene node for this renderer.

        @method createSceneNode
        @return {Object}
    */
    createSceneNode : function()
    {
        TundraLogging.getLogger("IRenderSystem").warn("createSceneNode() not implemented.");
        return null;
    },

    /**
        Update scene node with a Transform.

        @method createSceneNode
        @param {Object} sceneNode Node to update.
        @param {Transform} transform Transform to set to node.
    */
    updateSceneNode : function(sceneNode, transform)
    {
        TundraLogging.getLogger("IRenderSystem").warn("updateSceneNode() not implemented.");
    },

    /**
        Executes a raycast from origin to direction. Returns all hit objects.

        @method raycastAllFrom
        @param {Object} origin Rendering system implementation specific object. Usually a float3 vector.
        @param {Object} direction Rendering system implementation specific object. Usually a normalized float3 directional vector.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @return {Array<RaycastResult>}
    */
    raycastAllFrom : function(origin, direction, selectionLayer)
    {
        TundraLogging.getLogger("IRenderSystem").warn("raycastAllFrom() not implemented.");
        return null;
    },

    /**
        Executes a raycast from origin to direction. Returns first hit object.

        @method raycastFrom
        @param {Object} origin Rendering system implementation specific object. Usually a float3 vector.
        @param {Object} direction Rendering system implementation specific object. Usually a normalized float3 directional vector.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @return {RaycastResult}
    */
    raycastFrom : function(origin, direction, selectionLayer)
    {
        TundraLogging.getLogger("IRenderSystem").warn("raycastFrom() not implemented.");
        return null;
    },

    /**
        Executes a raycast to the renderers scene using the currently active camera 
        and screen coordinates. Returns all hit objects.

        @method raycastAll
        @param {Number} [x=current-mouse-x] Screen x coordinate.
        @param {Number} [y=current-mouse-y] Screen y coordinate.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @return {Array<RaycastResult>}
    */
    raycastAll : function(x, y, selectionLayer)
    {
        TundraLogging.getLogger("IRenderSystem").warn("raycastAll() not implemented.");
        return null;
    },

    /**
        Executes a raycast to the renderers scene using the currently active camera 
        and screen coordinates. Returns the first hit object.

        @method raycast
        @param {Number} [x=current-mouse-x] Screen x coordinate.
        @param {Number} [y=current-mouse-y] Screen y coordinate.
        @param {Number} [selectionLayer=1] Entity selection layer.
        @return {RaycastResult}
    */
    raycast : function(x, y, selectionLayer)
    {
        TundraLogging.getLogger("IRenderSystem").warn("raycast() not implemented.");
        return null;
    }
});

return IRenderSystem;

}); // require js
