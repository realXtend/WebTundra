
define([
        "lib/classy",
        "lib/three" /// @todo Remove this THREE dependency once we have our own vector type!
    ], function(Class, THREE) {

var RaycastResult = Class.$extend(
/** @lends RaycastResult.prototype */
{
    /**
        A raycast result object, returned by {@link IRenderSystem#raycast}

        When casting a ray into the 3D space, either from point to point in 3D or viewport to 3D world, a RaycastResult object is created
        that will provide information about the intersected objects such as entities hit, the geometry hit, submesh, etc.

        @constructs
    */
    __init__ : function()
    {
        /**
            Entity that was hit, null if none.
            @var {Entity}
        */
        this.entity = null;
        /**
            Component which was hit, null if none.
            @var {IComponent}
        */
        this.component = null;
        /**
            Hit three.js object of which geometry was hit.
            eg. THEE.Mesh, THREE.SkinnedMesh, THREE.Sprite etc.
            @var {THREE.Object3D}
        */
        this.object = null;
        /**
            World coordinates of hit position.
            @var {THREE.Vector3}
        */
        this.pos = new THREE.Vector3(0,0,0);
        /**
            Submesh index in entity, starting from 0.
            -1 if could not be resolved by the renderer.
            @var {Number}
        */
        this.submeshIndex = -1;
        /**
            Hit face.
            @var {THREE.Face3}
        */
        this.face = new THREE.Face3();
        /**
            Distance along the ray to the point of intersection.
            -1 if could not be resolved by the renderer.
            @var {Number}
        */
        this.distance = -1;
        /**
            The ray used for the raycast. This will be a renderer specific object.
            @var {THREE.Ray}
        */
        this.ray = new THREE.Ray();
        /**
            Information about the execution.
            @var {Object}
        */
        this.execution =
        {
            /**
                Error that occurred while executing the raycast.
                Empty string if no error.
                @var {String}
            */
            error : "",
            /**
                Screen position that was used for execution.
                @var {THREE.Vector2}
            */
            screenPos : new THREE.Vector2(0,0),
            /**
                Selection layer that was used for execution.
                @var {Number}
            */
            selectionLayer : -1
        };

        // Internal state
        this._zeroVec = new THREE.Vector3(0,0,0);

        this._uv1 = new THREE.Vector2(0,0);
        this._uv2 = new THREE.Vector2(0,0);
        this._uv1Queried = false;
        this._uv2Queried = false;
    },

    reset : function()
    {
        this.entity = null;
        this.component = null;
        this.object = null;

        this.pos.set(0,0,0);
        this.submeshIndex = -1;

        // Don't clear this any futher, lots of vectors
        this.face.a = -1;
        this.face.b = -1;
        this.face.c = -1;

        this.distance = -1;
        this.ray.origin.set(0,0,0);
        this.ray.direction.set(0,0,0);

        this._uv1.set(0,0);
        this._uv2.set(0,0);
        this._uv1Queried = false;
        this._uv2Queried = false;

        this.execution.error = "";
        this.execution.screenPos.set(0,0);
        this.execution.selectionLayer = -1;
    },

    copyFace : function(src)
    {
        this.face.a = (src ? src.a : -1);
        this.face.b = (src ? src.b : -1);
        this.face.c = (src ? src.c : -1);

        this.face.normal.copy((src ? src.normal : this._zeroVec));
        this.face.color.copy((src ? src.color : this._zeroVec));

        if (!src)
            return;

        // Array refs, should be valid as long as we need the, the raycast result face is not reused or disposed
        this.face.vertexNormals = src.vertexNormals;
        this.face.vertexTangents = src.vertexTangents;
        this.face.vertexColors = src.vertexColors;

        this.face.materialIndex = src.materialIndex;
    },

    /**
        @return {RaycastResult}
    */
    clone : function()
    {
        var clone = new RaycastResult();
        clone.entity = this.entity;             // object ref
        clone.component = this.component;       // object ref
        clone.object = this.object;             // object ref

        clone.pos.copy(this.pos);               // threejs copy
        clone.submeshIndex = this.submeshIndex; // js copy
        clone.face = this.face.clone();         // object ref

        clone.distance = this.distance;         // js copy
        clone.ray.copy(this.ray);               // threjs copy

        clone._uv1.copy(this._uv1);             // threejs copy
        clone._uv2.copy(this._uv2);             // threejs copy

        this._uv1Queried = this._uv1Queried;
        this._uv2Queried = this._uv2Queried;

        clone.execution.error = this.execution.error; // js copy
        clone.execution.screenPos.copy(this.execution.screenPos); // threejs copy
        clone.execution.selectionLayer = this.execution.selectionLayer; // js copy

        return clone;
    },

    /**
        @return {Boolean}
    */
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

    hasValidFace : function()
    {
        return (this.face.a !== -1 && this.face.b !== -1 && this.face.c !== -1);
    },

    /**
        Get normal of raycast hit.

        @return {THREE.Vector3} Vector is zero if could not be resolved, check with .isZero().
    */
    getNormal : function()
    {
        if (this.hasValidFace())
            return this.face.normal;

        this._zeroVec.set(0,0,0);
        return this._zeroVec;

        // @todo Remove this old code, threejs r71 gives us the normal for both buffered and normal geometries
        /*
        if (this._normalQueried)
            return this._normal;

        this._normalQueried = true;

        if (!this.object || !this.object.geometry)
            return this._normal;

        if (this.object.geometry instanceof THREE.BufferGeometry && this.hasValidFace())
        {
            var normals = this.object.geometry.getAttribute("normal");
            if (normals && normals.array)
            {
                this._normal.set(0,0,0);

                var temp = new THREE.Vector3(0,0,0);
                for (var index = 0; index<3; index++)
                {
                    temp.set(
                        normals.array[this.indices[index] * 3],
                        normals.array[this.indices[index] * 3 + 1],
                        normals.array[this.indices[index] * 3 + 2]
                    );
                    if (typeof temp.x !== "number" || isNaN(temp.x) ||
                        typeof temp.y !== "number" || isNaN(temp.y) ||
                        typeof temp.z !== "number" || isNaN(temp.z))
                        return this._normal;

                    this._normal.add(temp);
                }

                this._normal.divideScalar(3).normalize();
            }
        }
        else if (this.face && this.face.normal instanceof THREE.Vector3)
            this._normal.copy(this.face.normal);

        return this._normal;*/
    },

    /**

        Get UV of raycast hit. UV wont be queried from
        the hit geometry until this function is called.

        @param {Number} [index=0] Index of the UV set, defaults to the first one. Valid three.js UVs are 0 and 1
        @return {THREE.Vector2} Vector is zero if could not be resolved, check with .isZero().
    */
    getUV : function(index)
    {
        index = (typeof index === "number" ? index : 0);
        if (index  < 0 || index > 1)
        {
            console.warn("[RaycastResult]: UVs 0 or 1 are valid, given:", index);
            return null;
        }

        if (index === 0 && this._uv1Queried)
            return this._uv1;
        else if (index === 1 && this._uv2Queried)
            return this._uv2;

        if (index === 0)
            this._uv1Queried = true;
        else
            this._uv2Queried = true;

        var targetUV = (index === 0 ? this._uv1 : this._uv2);

        if (!this.object || !this.object.geometry)
            return targetUV;

        if (this.hasValidFace())
        {
            if (this.object.geometry instanceof THREE.BufferGeometry)
            {
                var uvs = (index === 0 ? this.object.geometry.getAttribute("uv") : this.object.geometry.getAttribute("uv2"));
                if (uvs && uvs.array && uvs.itemSize >= 2)
                {
                    targetUV.set(0,0);

                    var temp = new THREE.Vector2(0,0);
                    for (var iindex = 0; iindex<3; iindex++)
                    {
                        var faceIndex = (iindex === 0 ? this.face.a : (iindex === 1 ? this.face.b : this.face.c));
                        temp.set(
                            uvs.array[faceIndex * uvs.itemSize],
                            uvs.array[faceIndex * uvs.itemSize + 1]
                        );
                        if (typeof temp.x !== "number" || isNaN(temp.x) ||
                            typeof temp.y !== "number" || isNaN(temp.y))
                            return targetUV;

                        targetUV.add(temp);
                    }
                    targetUV.divideScalar(2);
                }
            }
            else if (this.object.geometry instanceof THREE.Geometry)
            {
                if (!Array.isArray(this.object.geometry.faceVertexUvs) || index >= this.object.geometry.faceVertexUvs.length)
                    return targetUV;

                var uvs = this.object.geometry.faceVertexUvs[index];
                if (Array.isArray(uvs) && uvs.length > 0)
                {
                    var a = uvs[this.face.a];
                    var b = uvs[this.face.b];
                    var c = uvs[this.face.c];

                    if (a instanceof THREE.Vector2 === false ||
                        b instanceof THREE.Vector2 === false ||
                        c instanceof THREE.Vector2 === false)
                        return targetUV;

                    targetUV.add(a);
                    targetUV.add(b);
                    targetUV.add(c);
                    targetUV.divideScalar(2);
                }
            }
        }
        return targetUV;
    }
});

return RaycastResult;

}); // require js
