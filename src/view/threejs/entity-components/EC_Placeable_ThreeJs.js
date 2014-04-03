
define([
        "lib/three",
        "core/framework/TundraSDK",
        "core/scene/Entity",
        "entity-components/EC_Placeable"
    ], function(THREE, TundraSDK, Entity, EC_Placeable) {

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

        this.sceneNode = null;
        this._pendingChildren = [];
    },

    __classvars__ :
    {
        implementationName : "three.js"
    },

    reset : function()
    {
        if (this.sceneNode != null)
        {
            // Fire event. This way children of this placeables node have
            // a change to restore them selves to the scene or to parent
            // to another node. The below parent.remove() will remove this
            // scene node and all its children from the scene.
            TundraSDK.framework.events.send("EC_Placeable." + this.parentEntity.id + "." + this.id + ".AboutToBeDestroyed", this, this.sceneNode);

            var parent = this.sceneNode.parent;
            if (parent !== undefined && parent !== null)
                parent.remove(this.sceneNode);
        }
        this.sceneNode = null;
    },

    update : function()
    {
        var renderer = TundraSDK.framework.renderer;

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

            renderer.updateSceneNode(this.sceneNode, this.transform);

            // Parent pending childrend
            for (var i = 0; i < this._pendingChildren.length; i++)
                this.addChild(this._pendingChildren[i]);
            this._pendingChildren = [];

            TundraSDK.framework.events.send("EC_Placeable." + this.parentEntity.id + "." + this.id + ".SceneNodeCreated", this, this.sceneNode);
            return;
        }
        else
            this.checkParent();

        renderer.updateSceneNode(this.sceneNode, this.transform);
    },

    attributeChanged : function(index, name, value)
    {
        switch(index)
        {
        case 0: // transform
            if (this.sceneNode != null)
                TundraSDK.framework.client.renderer.updateSceneNode(this.sceneNode, value);
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
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onSceneNodeCreated : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onSceneNodeCreated, parent entity not set!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_Placeable." + this.parentEntity.id + "." + this.id + ".SceneNodeCreated", context, callback);
    },

    /**
        Event that is fired before this placeables scene node is being removed from its parent and destroyed.
        Useful if you are currently parented to this placeable to remove the parenting and restore it to the root scene.

        @method onAboutToBeDestroyed
        @param {Object} context Context of in which the callback function is executed. Can be null.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if this entity is not yes initialized correctly.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} how to unsubscribe from this event.
    */
    onAboutToBeDestroyed : function(context, callback)
    {
        if (!this.hasParentEntity())
        {
            this.log.error("Cannot subscribe onAboutToBeDestroyed, parent entity not set!");
            return null;
        }
        return TundraSDK.framework.events.subscribe("EC_Placeable." + this.parentEntity.id + "." + this.id + ".AboutToBeDestroyed", context, callback);
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
            return;

        if (child instanceof EC_Placeable)
        {
            this.addChild(child.sceneNode);
            return;
        }

        if (this.sceneNode != null)
        {
            this.sceneNode.add(child);
            this.updateVisibility();
            child.updateMatrix();
        }
        else
            this._pendingChildren.push(child);
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
        @method worldPosition
        @return {THREE.Vector3} Position vector.
    */
    worldPosition : function()
    {
        if (this.sceneNode == null)
            return null;

        var worldPos = this.sceneNode.position.clone();
        this._applyParentChain(worldPos, "position");
        return worldPos;
    },

    /// @note Experimental!
    setWorldPosition : function(position)
    {
        var tRef = this.attributes.transform.get();
        var localPos = (this.parentRef !== "" ? this.transform.pos.clone() : new THREE.Vector3(0,0,0));
        tRef.pos = position.sub(localPos);
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
    rotation : function()
    {
        return this.attributes.transform.get().rot.clone();
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
            TundraSDK.framework.events.unsubscribe(this._componentAddedSub);
            this._componentAddedSub = undefined;
        }

        // Remove parenting if ref is empty and we are not parented to the scene
        if (this.parentRef !== "")
        {
            // Find by name fist, then try with entity id.
            var foundParent = null;
            foundParent = this.parentScene.entityByName(this.parentRef);
            if (foundParent == null)
            {
                var parentRefId = parseInt(this.parentRef);
                if (!isNaN(parentRefId))
                    foundParent = this.parentScene.entityById(parentRefId);
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
        }

        // No parent or failed to find parent, restore to scene as unparented.
        this.removeParent();
    },

    removeParent : function()
    {
        if (this.sceneNode == null || this.parentEntity == null || this.parentScene == null)
            return;

        if (this.sceneNode.parent !== undefined && this.sceneNode.parent !== null && this.sceneNode.parent !== TundraSDK.framework.renderer.scene)
        {
            TundraSDK.framework.renderer.scene.add(this.sceneNode);
            TundraSDK.framework.client.renderer.updateSceneNode(this.sceneNode, this.transform);
        }
    },

    _onParentPlaceableEntityComponentCreated : function(entity, component)
    {
        if (component != null && component.typeName === "EC_Placeable")
            this.checkParent();
    },

    updateVisibility : function()
    {
        this._setVisible(this.attributes.visible.get());
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
                // Check if this childs placeable has false visibility, then don't show the node!
                // The child can be 1) EC_Placeable scene node 2) EC_Mesh mesh node or submesh node 3) EC_WebBrowser projection plane.
                if (node.tundraEntityId !== undefined)
                {
                    var childEntity = TundraSDK.framework.scene.entityById(node.tundraEntityId)
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
        Makes this Placeables Transform look at a target Entity or position.
        @method lookAt
        @param {Entity|THREE.Vector3} target Target Entity or a position to look at. If Entity is passed target.placeable.worldPosition() is used.
    */
    lookAt : function(param)
    {
        var t = this.attributes.transform.get();
        if (param instanceof THREE.Vector3)
            t.lookAt(this.worldPosition(), param);
        else
            t.lookAt(this.worldPosition(), param.placeable.worldPosition());
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
        @return {THREE.Quaternion} Position vector.
    */
    worldOrientation : function()
    {
        if (this.sceneNode == null)
            return null;

        var worldRot = this.sceneNode.quaternion.clone();
        this._applyParentChain(worldRot, "quaternion");
        return worldRot.normalize();
    }

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

    /// Returns the world-space transform this scene node.
    /// @return float3x4
    ,
    worldTransform : function()
    {
        var t = this.transform.clone();
        t.pos = this.worldPosition();
        return t;
    },

    setWorldTransform : function(transform)
    {
        var tRef = this.attributes.transform.get();
        var localPos = (this.parentRef !== "" ? this.transform.pos.clone() : new THREE.Vector3(0,0,0));
        tRef = transform;
        tRef.pos.add(localPos);
        this.attributes.transform.set(tRef);
    },

    /// Returns the scale of this placeable node in world space.
    /// @return float3
    // worldScale : function()
    // {
    // },

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
