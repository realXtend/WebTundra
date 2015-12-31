
define([
        "lib/three",
        "core/framework/Tundra",
        "core/scene/Entity",
        "core/scene/AttributeInterpolationData",
        "entity-components/EC_Placeable"
    ], function(THREE, Tundra, Entity, AttributeInterpolationData, EC_Placeable) {

/**
    Placeable component implementation for the three.js render system.

    @class EC_Placeable_ThreeJs
    @extends EC_Placeable
    @constructor
*/
var EC_Placeable_ThreeJs = EC_Placeable.$extend(
{
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        this.attributes.transform.interpolation = new AttributeInterpolationData();

        this.sceneNode = null;
        this._pendingChildren = [];
    },

    __classvars__ :
    {
        Implementation : "three.js",

        TransformInterpolator : undefined,
    },

    reset : function()
    {
        if (this.sceneNode != null)
        {
            // Fire event. This way children of this placeable's node have
            // a change to restore them selves to the scene or to parent
            // to another node. The below parent.remove() will remove this
            // scene node and all its children from the scene.
            Tundra.events.send("EC_Placeable." + this.parentEntity.id + "." + this.id + ".AboutToBeDestroyed", this, this.sceneNode);

            var parent = this.sceneNode.parent;
            if (parent !== undefined && parent !== null)
                parent.remove(this.sceneNode);
        }
        this.sceneNode = null;

        if (this._componentAddedSub !== undefined)
        {
            Tundra.events.unsubscribe(this._componentAddedSub);
            this._componentAddedSub = undefined;
        }
        if (this._entityCreatedSub !== undefined)
        {
            Tundra.events.unsubscribe(this._entityCreatedSub);
            this._entityCreatedSub = undefined;
        }
    },

    update : function()
    {
        var renderer = Tundra.renderer;

        if (this.sceneNode == null)
        {
            // Create scene node and update visibility.
            this.sceneNode = renderer.createSceneNode();
            this.sceneNode.name = this.parentEntity.name;
            this.sceneNode.tundraEntityId = this.parentEntity.id;
            this.sceneNode.tundraComponentId = this.id;
            this._setVisible(this.attributes.visible.get());

            // Parent to scene and then check if we need to be parented.
            renderer.scene.add(this.sceneNode);
            this.checkParent();

            renderer.updateSceneNode(this.sceneNode, this.attributes.transform.value);

            // Parent pending children
            for (var i = 0; i < this._pendingChildren.length; i++)
                this.addChild(this._pendingChildren[i]);
            this._pendingChildren = [];

            Tundra.events.send("EC_Placeable." + this.parentEntity.id + "." + this.id + ".SceneNodeCreated", this, this.sceneNode);
            return;
        }
        else
            this.checkParent();

        renderer.updateSceneNode(this.sceneNode, this.attributes.transform.value);
    },

    attributeChanged : function(index, name, value)
    {
        switch(index)
        {
        case 0: // transform
            if (this.sceneNode != null)
            {
                if (EC_Placeable_ThreeJs.TransformInterpolator)
                    EC_Placeable_ThreeJs.TransformInterpolator.update(this.parentEntity, this, this.sceneNode, this.attributes.transform);
                else
                    Tundra.client.renderer.updateSceneNode(this.sceneNode, value);
            }
            break;
        case 1: // drawDebug
            break;
        case 2: // visible
            this._setVisible(value);
            break;
        case 3: // selectionLayer
            break;
        case 4: // parentRef
            this.checkParent();
            break;
        case 5: // parentBone
            break;
        default:
            break; // TODO Log error/warning?
        }
    },

    /**
        Event that is fired when the scene node is created. Useful if you want to parent something to this placeable.

        @method onSceneNodeCreated
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onSceneNodeCreated : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onSceneNodeCreated, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Placeable." + this.parentEntity.id + "." + this.id + ".SceneNodeCreated", context, callback);
    },

    /**
        Event that is fired before this placeable's scene node is being removed from its parent and destroyed.
        Useful if you are currently parented to this placeable to remove the parenting and restore it to the root scene.

        @method onAboutToBeDestroyed
        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onAboutToBeDestroyed : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onAboutToBeDestroyed, parent entity not set!");
            return null;
        }
        return Tundra.events.subscribe("EC_Placeable." + this.parentEntity.id + "." + this.id + ".AboutToBeDestroyed", context, callback);
    },

    /**
        Parents another Placeable component to this components scene node.
        If the scene node in this component is not created, the parenting
        will be automatically done when it is created.

        @method addChild
        @param {EC_Placeable} placeable The child Placeable component.
    */
    /**
        Parents a THREE.Object3D to this components scene node.
        If the scene node in this component is not created, the parenting
        will be automatically done when it is created.

        @method addChild
        @param {THREE.Object3D} object3d The child object.
    */
    addChild : function(child)
    {
        if (child === undefined || child === null)
            return false;

        if (child instanceof Entity)
            return this.addChild(child.placeable);
        if (child instanceof EC_Placeable)
            return this.addChild(child.sceneNode);

        if (this.sceneNode != null)
        {
            this.sceneNode.add(child);

            child.updateMatrix();
            child.updateMatrixWorld(true);

            /* This is a performance optimization for when this placeable has
               hundreds or thousands child items. The amount of traversal via
               updateVisibility takes WebTundra to its knees. This happens when
               all lower Entity id children are added to the parent in sequence
               after this parent entity+placeable has been created. */
            if (this._visibilityTimerId !== undefined)
                clearTimeout(this._visibilityTimerId);
            this._visibilityTimerId = setTimeout(this.updateVisibility.bind(this), 50);
        }
        else
            this._pendingChildren.push(child);

        return true;
    },

    /**
        Returns THREE.Scene parent node.

        @return {THREE.Object3D}
    */
    parentNode : function()
    {
        return (this.sceneNode && this.sceneNode.parent ? this.sceneNode.parent : null);
    },

    /**
        Returns Entity of parent node, if applicable. This will return a valid
        scene entity if Placeable level parenting is used (parentRef/addChild).

        @return {Entity}
    */
    getParentEntity : function()
    {
        var node = this.parentNode();
        if (node && typeof node.tundraEntityId === "number")
            return Tundra.scene.entityById(node.tundraEntityId);
        return null;
    },

    _applyParentChain : function(dest, part)
    {
        var p = this.sceneNode.parent;
        while (p !== null && p !== undefined && p instanceof THREE.Scene === false)
        {
            if (dest instanceof THREE.Vector3)
                dest.add(p[part]); /// @todo We need to do multiplyQuaternion(p.quaternion) to the added offset here!
            else if (dest instanceof THREE.Quaternion)
                dest.multiply(p[part].clone().normalize());
            p = p.parent;
        }
    },

    /**
        Returns distance to another object.
        @method distanceTo
        @param {Entity|EC_Placeable|THREE.Vector3} other
        @return {Number|undefined} Distance to the other object or undefined if could not be resolved.
    */
    distanceTo : function(other)
    {
        var otherPos = (other instanceof THREE.Vector3 ? other : undefined);
        if (otherPos === undefined)
        {
            var otherPlaceable = (other instanceof Entity ? other.placeable : (other instanceof EC_Placeable ? other : undefined));
            if (otherPlaceable != null)
                otherPos = otherPlaceable.worldPosition();
        }
        if (otherPos !== undefined)
            return this.worldPosition().distanceTo(otherPos);
        return undefined;
    },

    /**
        Decomposes Placeable's 'transform' attribute to a Transform.
        @method decompose
        @param {Transform} transform
    */
    /**
        Decomposes Placeable's 'transform' attribute to pos, rot and scale.
        @method decompose
        @param {THREE.Vector3} pos
        @param {THREE.Vector3} rot
        @param {THREE.Vector3} scale
    */
    decompose : function(pos, rot, scale)
    {
        this.attributes.transform.value.decompose(pos, rot, scale);
    },

    /**
        Returns the position of this placeable node in the space of its parent.
        @method position
        @return {THREE.Vector3} Position vector.
    */
    position : function()
    {
        return this.attributes.transform.get().pos.clone();
    },

    /**
        Sets the translation part of this placeable's transform.
        @method setPosition
        @note This function sets the Transform attribute of this component, and synchronizes to network.
        @param {THREE.Vector3} vector Position vector.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    /**
        Set position.
        @method setPosition
        @param {Number} x
        @param {Number} y
        @param {Number} z
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    setPosition : function(x, y, z, change)
    {
        var transform = this.attributes.transform.get();
        transform.setPosition(x, y, z);
        var changeParam = (typeof x !== "number" ? y : change);
        return this.attributes.transform.set(transform, changeParam);
    },

    /**
        Returns clone of the position of this placeable node in world space.

        @param {Three.Vector3} [dest] Optional destination vector.
        @return {THREE.Vector3} Position vector.
    */
    worldPosition : function(dest)
    {
        if (this.sceneNode == null)
            return null;

        dest = dest || new THREE.Vector3();
        dest.setFromMatrixPosition(this.sceneNode.matrixWorld);
        return dest;
    },

    /**
        Sets the world position of this placeable node
        @method setWorldPosition
        @param {THREE.Vector3} position The position in world coordinates
    */
    setWorldPosition : function(position)
    {
        var tRef = this.attributes.transform.get();
        var pos = position.clone();
        if (this.parentRef !== "")
            this.sceneNode.parent.worldToLocal(pos);
        tRef.pos.copy(pos);
        this.attributes.transform.set(tRef);
    },

    /**
        Returns the scale of this placeable node in the space of its parent.
        @method scale
        @return {THREE.Vector3} Scale vector.
    */
    scale : function()
    {
        return this.attributes.transform.get().scale.clone();
    },

    /**
        Sets the scale of this placeable's transform.
        @method setScale
        @note This function preserves the previous translation and rotation of this placeable.
        @param {THREE.Vector3} vector Scale vector.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    /**
        Sets the scale of this placeable's transform.
        @method setScale
        @note This function preserves the previous translation and rotation of this placeable.
        @param {Number} x
        @param {Number} y
        @param {Number} z
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    setScale : function(x, y, z, change)
    {
        var transform = this.attributes.transform.get();
        transform.setScale(x, y, z);
        var changeParam = (typeof x !== "number" ? y : change);
        return this.attributes.transform.set(transform, changeParam);
    },

    /**
        Get rotation.
        @method rotation
        @return {THREE.Vector3} Rotation vector in degrees.
    */
    rotation : function(dest)
    {
        dest = dest || new THREE.Vector3();
        dest.copy(this.attributes.transform.get().rot);
        return dest;
    },

    /**
        Set rotation.
        @method setRotation
        @param {THREE.Vector3} vector Rotation vector in degrees.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    /**
        Set rotation.
        @method setRotation
        @param {THREE.Quaternion} quaternion Rotation quaternion.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    /**
        Set rotation.
        @method setRotation
        @param {THREE.Euler} euler Rotation in radians.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    /**
        Set rotation.
        @method setRotation
        @param {Number} x X-axis degrees.
        @param {Number} y Y-axis degrees.
        @param {Number} z Z-axis degrees.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        @return {Boolean} If set was successful.
    */
    setRotation : function(x, y, z, change)
    {
        var transform = this.attributes.transform.get();
        transform.setRotation(x, y, z);
        var changeParam = (typeof x !== "number" ? y : change);
        return this.attributes.transform.set(transform, changeParam);
    },

    checkParent : function()
    {
        if (this.sceneNode == null || this.parentEntity == null || this.parentScene == null)
            return;

        if (this._componentAddedSub !== undefined)
        {
            Tundra.events.unsubscribe(this._componentAddedSub);
            this._componentAddedSub = undefined;
        }
        if (this._entityCreatedSub !== undefined)
        {
            Tundra.events.unsubscribe(this._entityCreatedSub);
            this._entityCreatedSub = undefined;
        }

        // Remove parenting if ref is empty and we are not parented to the scene
        if (this.parentRef !== "")
        {
            var foundParent  = null;
            var parentRefStr = this.attributes.parentRef.value;
            var parentRefId  = parseInt(parentRefStr);
            var idBased      = !isNaN(parentRefId);

            for (var i = 0, len = this.parentScene.entities.length; i<len; i++)
            {
                var entIter = this.parentScene.entities[i];
                if (idBased && entIter.id === parentRefId)
                {
                    foundParent = entIter;
                    break;
                }
                else if (!idBased && entIter.name === parentRefStr)
                {
                    foundParent = entIter;
                    if (foundParent.placeable)
                        break;
                }
            }
            if (foundParent != null)
            {
                if (foundParent.placeable != null)
                {
                    foundParent.placeable.addChild(this);
                    return;
                }
                else
                    this._componentAddedSub = foundParent.onComponentCreated(this, this._onParentPlaceableEntityComponentCreated);
            }
            else
                this._entityCreatedSub = this.parentScene.onEntityCreated(this, this._onParentSceneEntityCreated);
        }

        // No parent or failed to find parent, restore to scene as unparented.
        this.removeParent();
    },

    removeParent : function()
    {
        if (this.sceneNode == null || this.parentEntity == null || this.parentScene == null)
            return;

        if (this.sceneNode.parent !== undefined && this.sceneNode.parent !== null && this.sceneNode.parent !== Tundra.renderer.scene)
        {
            Tundra.renderer.scene.add(this.sceneNode);
            Tundra.client.renderer.updateSceneNode(this.sceneNode, this.transform);
        }
    },

    _onParentSceneEntityCreated : function(entity)
    {
        /** @todo Here might lay a bug if the name is not set in entity
            when created... it should be if coming from network and not doing
            some weird custom script stuff. Need to support this by listening to
            all Entity name changes in parent scene :E */
        if (entity.name !== "" && entity.name === this.parentRef || entity.id === parseInt(this.parentRef))
            this.checkParent();
    },

    _onParentPlaceableEntityComponentCreated : function(entity, component)
    {
        if (component != null && component.typeName === "Placeable")
            this.checkParent();
    },

    updateVisibility : function()
    {
        this._setVisible(this.attributes.visible.get());
    },

    /**
        Checks visibility of this node and all parent nodes up to the scene root.
        Returns false if any node in the parent chain is not visible.
        @method isVisibleTraverse
        @return {Boolean}
    */
    isVisibleTraverse : function()
    {
        if (!this.attributes.visible.get())
            return false;
        if (!this.sceneNode)
            return false;
        var p = this.sceneNode.parent;
        while (p && !(p instanceof THREE.Scene))
        {
            if (p.visible === false)
                return false;
            p = p.parent;
        }
        return true;
    },

    _setVisible : function(visible)
    {
        if (this.sceneNode == null)
            return;

        this.sceneNode.traverse(function(node) {
            // @todo Should we ignore other parented three.js node types?
            if (node instanceof THREE.PerspectiveCamera)
                return;

            if (visible)
            {
                // Check if this child's placeable has false visibility, then don't show the node!
                // The child can be 1) EC_Placeable scene node 2) EC_Mesh mesh node or submesh node 3) EC_WebBrowser projection plane.
                if (node.tundraEntityId !== undefined)
                {
                    var childEntity = Tundra.scene.entityById(node.tundraEntityId);
                    var childPlaceable = (childEntity != null ? (node.tundraComponentId !== undefined ?
                        childEntity.componentById(node.tundraComponentId) : childEntity.placeable) : null);
                    if (childPlaceable != null && !childPlaceable.visible)
                        return;
                }
            }
            node.visible = visible;
        });
    },

    /**
        Makes this Placeable's Transform look at a target Entity or position.
        @method lookAt
        @param {Entity|THREE.Vector3} target Target Entity or a position to look at. If Entity is passed target.placeable.worldPosition() is used.
    */
    lookAt : function(param)
    {
        var t = this.attributes.transform.get();
        var ownPos = this.worldPosition();
        var destination;
        if (param instanceof THREE.Vector3)
            destination = param;
        else
            destination = param.placeable.worldPosition();

        var lookAtQuat = t.lookAtQuaternion(ownPos, destination);
        if (this.sceneNode && this.sceneNode.parent)
        {
            var parentQuat = new THREE.Quaternion();
            parentQuat.setFromRotationMatrix(this.sceneNode.parent.matrixWorld);
            parentQuat.inverse();
            lookAtQuat.multiplyQuaternions(parentQuat, lookAtQuat);
        }

        t.setRotation(lookAtQuat);
        this.transform = t;
    },

    /**
        Returns the orientation of this placeable node in the space of its parent.
        @method orientation
        @return {THREE.Quaternion} Orientation.
    */
    orientation : function()
    {
        return this.attributes.transform.get().orientation();
    },

    /**
        Returns the orientation of this placeable node in world space.
        @method worldOrientation
        @param {THREE.Quaternion} [dest] Destination where the world orientation should be written, if provided.
        @return {THREE.Quaternion} Position vector.
    */
    worldOrientation : function(dest)
    {
        if (this.sceneNode == null)
            return null;

        dest = dest || new THREE.Quaternion();
        dest.setFromRotationMatrix(this.sceneNode.matrixWorld);
        return dest;
    },

    /**
        Sets the world orientation of this placeable node
        @method setWorldOrientation
        @param THREE.Quaternion worldOrientation The orientation in world space
    */
    setWorldOrientation : function(worldOrientation)
    {
        var tRef = this.attributes.transform.get();
        var worldOrt = worldOrientation.clone();
        if (this.parentRef !== "")
        {
            var parentQuat = new THREE.Quaternion();
            parentQuat.setFromRotationMatrix(this.sceneNode.parent.matrixWorld);
            parentQuat.inverse();
            worldOrt.multiplyQuaternions(parentQuat, worldOrt);
        }

        tRef.setRotation(worldOrt);
        this.attributes.transform.set(tRef);
    },

    /// Sets the orientation of this placeable's transform.
    /// If you want to set the orientation of this placeable using Euler angles, use e.g.
    /// the Quat::FromEulerZYX function.
    /// @note This function sets the Transform attribute of this component, and synchronizes to network.
    /// @note This function preserves the previous position and scale of this transform.
    //Quat q
    // setOrientation : function(q)
    // {
    // },

    /// Sets the rotation and scale of this placeable (the local-to-parent transform).
    /// @param rotAndScale The transformation matrix to set. This matrix is assumed to be orthogonal (no shear),
    ///                    and can not contain any mirroring.
    /// @note This function sets the Transform attribute of this component, and synchronizes to network.
    /// @note This function preserves the previous position of this transform.
    // Quat q, float3 scale
    // setOrientationAndScale : function(q, scale)
    //setOrientationAndScale : function(float3x3 rotAndScale)
    // {
    // },

    /// Sets the position, rotation and scale of this placeable (the local-to-parent transform).
    /// @param tm An orthogonal matrix (no shear), which cannot contain mirroring. The float4x4 version is provided
    ///           for conveniency, and the last row must be identity [0 0 0 1].
    /// @note This function sets the Transform attribute of this component, and synchronizes to network.
    /// @note Logically, the matrix tm is applied to the object first before translating by pos.
    // float3x3 tm, float3 pos
    // setTransform : function(tm, pos)
    //setTransform : function(float3x4 tm)
    // setTransform : function(float4x4 tm)
    // {
    // },

    /// Sets the position, rotation and scale of this placeable (the local-to-parent transform).
    /// @note This function RESETS the scale of this transform to (1,1,1), if scale not provided.
    /// @note Logically, the order of transformations is T * R * S * v.
    // Quat orientation, float3 pos, float3 scale)
    // setTransform : function(orientation, pos, scale)
    //setTransform : function(Quat orientation, float3 pos)
    // {
    // },

    /// Sets the transform of this placeable by specifying the world-space transform this scene node should have.
    /// This function recomputes the local->parent transform for this placeable so that the resulting world transform is as given.
    /// @param tm An orthogonal matrix (no shear), which cannot contain mirroring. The float4x4 version is provided
    ///           for conveniency, and the last row must be identity [0 0 0 1].
    /// @note This function sets the Transform attribute of this component, and synchronizes to network.
    /// @note Logically, the matrix tm is applied to the object first before translating by pos.
    //float3x3 tm, float3 pos
    // setWorldTransform : function(tm, pos)
    //setWorldTransform : function(float3x4 tm)
    //setWorldTransform : function(float4x4 tm)
    // {
    // },

    /// Sets the transform of this placeable by specifying the world-space transform this scene node should have.
    /// @note This function RESETS the scale of this transform to (1,1,1), if scale not provided.
    /// @note Logically, the matrix tm is applied to the object first before translating by pos.
    // Quat orientation, float3 pos, float3 scale)
    // setWorldTransform : function(orientation, pos, scale)
    //setWorldTransform : function(Quat orientation, float3 pos)
    // {
    // },

    /** Returns the world-space transform this scene node.
        @todo Handles only pos currently
        @todo return Matrix4? (float3x4 used in native) */
    worldTransform : function()
    {
        var t = this.transform.clone();
        t.pos = this.worldPosition();
        return t;
    },

    /** @todo Handles only pos
        @todo Take in Matrix4? (float3x4 used in native) */
    setWorldTransform : function(transform)
    {
        var tRef = this.attributes.transform.get();
        var localPos = (this.parentRef !== "" ? this.transform.pos.clone() : new THREE.Vector3(0,0,0));
        tRef = transform;
        tRef.pos.add(localPos);
        this.attributes.transform.set(tRef);
    },


    /**
        Returns clone of the scale of this placeable node in world space.

        @param {Three.Vector3} [dest] Optional destination vector.
        @return {THREE.Vector3} Position vector.
    */
    worldScale : function(dest)
    {
        if (this.sceneNode == null)
            return null;

        dest = dest || new THREE.Vector3();
        dest.setFromMatrixScale(this.sceneNode.matrixWorld);
        return dest;
    },

    /// Returns the concatenated world transformation of this placeable.
    /// @return float3x4
    // localToWorld : function()
    // {
    // },

    /// Returns the matrix that transforms objects from world space into the local coordinate space of this placeable.
    /// @return float3x4
    // worldToLocal : function()
    // {
    // },

    /// Returns the local transformation of this placeable in the space of its parent.
    /// @note For a placeable which is not attached to any parent, this returns the same transform as LocalToWorld : function().
    /// @return float3x4
    // localToParent : function()
    // {
    // },

    /// Returns the matrix that transforms objects from this placeable's parent's space into the local coordinate
    /// space of this placeable.
    /// @note For a placeable which is not attached to any parent, this returns the same transform as WorldToLocal : function().
    /// @return float3x4
    // parentToLocal : function()
    // {
    // },

    /// Re-parents this scene node to the given parent scene node. The parent entity must contain an EC_Placeable component.
    /// Detaches this placeable from its previous parent.
    /// @param preserveWorldTransform If true, the world space position of this placeable is preserved.
    ///                               If false, the transform attribute of this placeable is treated as the new local->parent transform for this placeable.
    /// @note This function sets the parentRef and parentBone attributes of this component to achieve the parenting.
    // Entity parent, bool preserveWorldTransform
    // setParent : function(parent, preserveWorldTransform)
    // {
    // },

    /// Re-parents this scene node to the named bone of the given parent scene node. The parent scene node must contain an EC_Placeable component and an EC_Mesh with a skeleton.
    /// Detaches this placeable from its previous parent.
    /// @param preserveWorldTransform If true, the world space position of this placeable is preserved.
    ///                               If false, the transform attribute of this placeable is treated as the new local->parent transform for this placeable.
    /// @note This function sets the parentRef and parentBone attributes of this component to achieve the parenting.
    // Entity parent, String boneName, bool preserveWorldTransform
    // setParent : function(parent, boneName, preserveWorldTransform)
    // {
    // },

    /// Returns all entities that are attached to this placeable.
    /// @return EntityList
    // children : function()
    // {
    // },

    /// If this placeable is parented to another entity's placeable (parentRef.Get().IsEmpty() == false, and points to a valid entity), returns the parent placeable entity.
    /// @return Entity
    // parentPlaceableEntity : function()
    // {
    // },

    /// If this placeable is parented to another entity's placeable (parentRef.Get().IsEmpty() == false, and points to a valid entity), returns parent placeable component.
    /// @return EC_Placeable
    // parentPlaceableComponent : function()
    // {
    // },

    /// Checks whether or not this component is parented and is grandparent of another @c entity.
    /** @param entity Entity for which relationship is to be inspected.
        @note Each entity is its own grand parent. */
    /// @return bool
    // isGrandparentOf : function(entity)
    // {
    // },

    /// @overload
    /** @param placeable Placeable component, of which relationship is to be inspected.
        @note Each entity is its own grand parent. */
    /// @return bool
    // isGrandparentOf : function(placeable)
    // {
    // },

    /// Checks whether or not this component is parented and is a grandchild of another @c entity.
    /** @param entity Entity for which relationship is to be inspected.
        @note Each entity is its own grand child. */
    /// @return bool
    // isGrandchildOf : function(entity)
    // {
    // },

    /// @overload
    /** @param placeable Placeable component, of which relationship is to be inspected.
        @note Each entity is its own grand child. */
    /// @return bool
    // isGrandchildOf : function(placeable)
    // {
    // },

    /// Returns flat list consisting of the whole parent-child hierarchy for @c entity.
    /** @param entity Entity to be inspected. */
    /// @return return EntityList
    // grandchildren : function(entity)
    // {
    // }
});

return EC_Placeable_ThreeJs;

}); // require js
