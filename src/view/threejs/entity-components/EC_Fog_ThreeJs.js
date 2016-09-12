
define([
        "lib/three",
        "core/framework/Tundra",
        "core/math/Color",
        "entity-components/EC_Fog"
    ], function(THREE, Tundra, Color, EC_Fog) {

var EC_Fog_ThreeJs = EC_Fog.$extend(
/** @lends EC_Fog_ThreeJs.prototype */
{
    /**
        Fog component implementation for the three.js render system.

        @ec_implements EC_Fog
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this._activated = false;
    },

    __classvars__ :
    {
        Implementation : "three.js"
    },

    reset : function(forced)
    {
        if (!this._activated && forced !== true)
            return;
        this._activated = false;

        Tundra.renderer.scene.fog = null;
        Tundra.renderer.renderer.setClearColor(0x000000);

        this._forceMaterialUpdates();
    },

    update : function()
    {
        if (!this._activated && Tundra.renderer.scene.fog != null)
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
        var meshes = Tundra.renderer.getAllMeshes();
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
            Tundra.renderer.scene.fog = new THREE.Fog(this.color.toThreeColor(), this.startDistance, this.endDistance);
        else
            Tundra.renderer.scene.fog = new THREE.FogExp2(this.color.toThreeColor(), this.expDensity);

        this._activated = (Tundra.renderer.scene.fog != null);
        if (this._activated)
            Tundra.renderer.renderer.setClearColor(Tundra.renderer.scene.fog.color);
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
            Tundra.renderer.scene.fog.color = value.toThreeColor();
            Tundra.renderer.renderer.setClearColor(Tundra.renderer.scene.fog.color);
        }
        // startDistance
        else if (index === 2)
            Tundra.renderer.scene.fog.near = value;
        // endDistance
        else if (index === 3)
            Tundra.renderer.scene.fog.far = value;
        // expDensity
        else if (index === 4)
            Tundra.renderer.scene.fog.density = value;
    }
});

return EC_Fog_ThreeJs;

}); // require js