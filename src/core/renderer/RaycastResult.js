
define([
        "lib/classy",
        "lib/three" /// @todo Remove this THREE dependency once we have our own vector type!
    ], function(Class, THREE) {

/**
    Raycast result.

    @class RaycastResult
    @constructor
*/
var RaycastResult = Class.$extend(
{
    __init__ : function()
    {
        /**
            Entity that was hit, null if none.

            @property entity
            @type Entity
        */
        this.entity = null;
        /**
            Component which was hit, null if none.

            @property component
            @type IComponent
        */
        this.component = null;
        /**
            World coordinates of hit position.

            @property pos
            @type THREE.Vector3
        */
        this.pos = new THREE.Vector3(0,0,0);
        /**
            World face normal of hit.

            @property normal
            @type THREE.Vector3
        */
        this.normal = new THREE.Vector3(0,0,0);
        /**
            Submesh index in entity, starting from 0.
            -1 if could not be resolved by the renderer.

            @property submeshIndex
            @type Number
        */
        this.submeshIndex = -1;
        /**
            Face index in submesh. -1 if could not be resolved by the renderer.

            @property faceIndex
            @type Number
        */
        this.faceIndex = -1;
        /**
            UV coords in entity. (0,0) if no texture mapping or
            could not be resolved by the renderer.

            @property uv
            @type THREE.Vector2
        */
        this.uv = new THREE.Vector2(0,0);
        /**
            Distance along the ray to the point of intersection.
            -1 if could not be resolved by the renderer.

            @property distance
            @type Number
        */
        this.distance = -1;
        /**
            The ray used for the raycast. This will be a renderer specific object.

            @property ray
            @type Object
        */
        this.ray = null;
        /**
            Information about the execution.

            @property execution
            @type Object
        */
        this.execution =
        {
            /**
                Error that occurred while executing the raycast.
                Empty string if no error.

                @property execution.error
                @type String
            */
            error : "",
            /**
                Screen position that was used for execution.

                @property execution.screenPos
                @type THREE.Vector2
            */
            screenPos : new THREE.Vector2(0,0),
            /**
                Selection layer that was used for execution.

                @property execution.distance
                @type Number
            */
            selectionLayer : -1
        };
    },

    reset : function()
    {
        this.entity = null;
        this.component = null;
        this.pos.x = 0; this.pos.y = 0; this.pos.z = 0;
        this.normal.x = 0; this.normal.y = 0; this.normal.z = 0;
        this.submeshIndex = -1;
        this.faceIndex = -1;
        this.uv.x = 0; this.uv.y = 0;
        this.distance = -1;
        this.ray = null;
        this.execution.error = "";
        this.execution.screenPos.x = 0; this.execution.screenPos.y = 0;
        this.execution.selectionLayer = -1;
    },

    clone : function()
    {
        var clone = new RaycastResult();
        clone.entity = this.entity;             // object ref
        clone.component = this.component;       // object ref
        clone.pos = this.pos.clone();           // threejs clone
        clone.normal = this.normal.clone();     // threejs clone
        clone.submeshIndex = this.submeshIndex; // js copy
        clone.faceIndex = this.faceIndex;       // js copy
        clone.uv = this.uv.clone();             // threejs clone
        clone.distance = this.distance;         // js copy
        clone.ray = this.ray.clone();           // threjs clone
        clone.execution =
        {
            error           : this.execution.error, // js copy
            screenPos       : this.execution.screenPos.clone(), // threjs clone
            selectionLayer  : this.execution.selectionLayer // js copy
        };
        return clone;
    },

    hasError : function()
    {
        return (this.execution.error !== "");
    },

    setError : function(error)
    {
        this.execution.error = error;
    },

    executionMatches : function(x, y, selectionLayer)
    {
        return (this.execution.screenPos.x === x &&
                this.execution.screenPos.y === y &&
                this.execution.selectionLayer === selectionLayer);
    },

    setExecutionInfo : function(x, y, selectionLayer)
    {
        this.execution.screenPos.x = x;
        this.execution.screenPos.y = y;
        this.execution.selectionLayer = selectionLayer;
    },

    setPosition : function(vector)
    {
        this.pos.x = vector.x;
        this.pos.y = vector.y;
        this.pos.z = vector.z;
    }
});

return RaycastResult;

}); // require js
