
define([
        "lib/three",
        "core/framework/TundraSDK",
        "core/math/Color",
        "entity-components/EC_Fog"
    ], function(THREE, TundraSDK, Color, EC_Fog) {

/**
    Sky component implementation for the three.js render system.

    @class EC_Fog_ThreeJs
    @extends EC_Fog
    @constructor
*/
var EC_Fog_ThreeJs = EC_Fog.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this._activated = false;
    },

    __classvars__ :
    {
        implementationName : "three.js"
    },

    reset : function(forced)
    {
        if (!this._activated && forced !== true)
            return;
        this._activated = false;

        TundraSDK.framework.renderer.scene.fog = null;
        TundraSDK.framework.renderer.renderer.setClearColor(0x000000);

        this._forceMaterialUpdates();
    },

    update : function()
    {
        if (!this._activated && TundraSDK.framework.renderer.scene.fog != null)
        {
            this.log.warn("Fog is already set, only the first initialized fog will be enabled. Inactivating", this.toString());
            return;
        }

        this._forceMaterialUpdates();
        this._createFog(this.mode);
    },

    _forceMaterialUpdates : function()
    {
        // All materials need to be updated (shaders reconfigured) now that fog is 
        // either removed or we are about to change the fog type.
        var meshes = TundraSDK.framework.renderer.getAllMeshes();
        for (var i = 0; i < meshes.length; i++)
        {
            if (meshes[i].material !== undefined && meshes[i].material !== null)
                meshes[i].material.needsUpdate = true;
        }
    },

    _createFog : function(fogMode)
    {
        this.reset(true);

        if (fogMode === EC_Fog.Type.NoFog)
        {
            this._activated = true;
            return;
        }
        
        if (fogMode === EC_Fog.Type.Linear)
            TundraSDK.framework.renderer.scene.fog = new THREE.Fog(this.color.toThreeColor(), this.startDistance, this.endDistance);
        else
            TundraSDK.framework.renderer.scene.fog = new THREE.FogExp2(this.color.toThreeColor(), this.expDensity);

        this._activated = (TundraSDK.framework.renderer.scene.fog != null);
        if (this._activated)
            TundraSDK.framework.renderer.renderer.setClearColor(TundraSDK.framework.renderer.scene.fog.color);
    },

    attributeChanged : function(index, name, value)
    {
        if (!this._activated)
            return;

        // mode
        if (index === 0)
            this._createFog(value);
        // color
        else if (index === 1)
        {
            TundraSDK.framework.renderer.scene.fog.color = value.toThreeColor();
            TundraSDK.framework.renderer.renderer.setClearColor(TundraSDK.framework.renderer.scene.fog.color);
        }
        // startDistance
        else if (index === 2)
            TundraSDK.framework.renderer.scene.fog.near = value;
        // endDistance
        else if (index === 3)
            TundraSDK.framework.renderer.scene.fog.far = value;
        // expDensity
        else if (index === 4)
            TundraSDK.framework.renderer.scene.fog.density = value;
    }
});

return EC_Fog_ThreeJs;

}); // require js