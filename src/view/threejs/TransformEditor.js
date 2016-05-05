define([
        "lib/classy",
        "lib/three",
        "lib/three/three-TransformControls",
        "core/framework/Tundra"
    ], function(Class, THREE, _tc, Tundra) {

var TransformEditor = Class.$extend(
{
   __init__ : function()
    {
        var camera = Tundra.renderer.camera;
        var domElement = Tundra.renderer.renderer.domElement;

        this.targets = [];
        this.previousParentOfTarget = {};
        this.activeNode = undefined;
        this.helpers = {};
        this.cameraSubscription = null;

        this.transformControl = new THREE.TransformControls(camera, domElement);
        this.transformControl.setSpace("local");
        this.transformControl.addEventListener("change", this.onUpdate.bind(this));
        this.transformControl.addEventListener("mouseDown", this.onDragStarted.bind(this));
        this.transformControl.addEventListener("mouseUp", this.onDragStopped.bind(this));

        this.cameraSubscription = Tundra.renderer.onActiveCameraChanged(this, this.onActiveCameraChanged);
        Tundra.frame.onUpdate(this, this.onFrameUpdate);

        // Uncomment to play around
        /*
        Tundra.input.onMousePress(this, function(e)
        {
            if (!e.leftDown)
                return;

            var raycastResult = Tundra.renderer.raycast();
            if (!raycastResult.entity)
                return;

            if (Tundra.input.keyboard.pressed["shift"])
                this.appendTarget(raycastResult.entity);
            else
                this.setTargetEntity(raycastResult.entity);
        }.bind(this));

        Tundra.input.onKeyPress(this, function(e)
        {
            if (e.pressed["esc"])
                this.clearSelection();
            else if (e.pressed["1"])
            {
                this.setMode("translate");
            }
            else if (e.pressed["2"])
            {
                this.setMode("rotate");
            }
            else if (e.pressed["3"])
            {
                this.setMode("scale");
            }
        }.bind(this));
        */
    },

    _appendTarget : function(target)
    {
        if (!target)
            return;

        if (target.typeId && target.typeId === 20) // EC_Placeable
            target = target.parentEntity;

        if (!target.placeable)
        {
            console.error("[TransformEditor]: _appendTarget: Invalid target provided:", target);
            return;
        }

        var node = target.placeable.sceneNode;
        var ancestorsOfTarget = this._getAncestors(node);
        var descendatsOfTarget = this._getDescendants(node);

        /* Make sure only one node is selected in its own parent chain, otherwise it screws everything!
           The oldest parent has priority, meaning if two nodes are related, consider the 'older' one
           in the targets and consequentially remove 'younger' ones. This is because there is no sense
           moving a parent and child together, since they are already related. */
        if (!this._isAncestorInTargets(node, ancestorsOfTarget))
        {
            // If the target does not already have ancestors selected, check and remove descendant
            var descendant = this._descendantInTargets(node, descendatsOfTarget);
            if (descendant != -1)
                this.targets.splice(descendant, 1);

            this.targets.push(target.placeable);
        }

        // Wireframes and boxes
        // Mark selected target with yellow box
        var meshes = [];
        var targetThreeMesh = this._getThreeMesh(target);
        if (targetThreeMesh)
            this._updateHelpers(targetThreeMesh);

        // Mark all ancestors with cyan box
        for (var i = ancestorsOfTarget.length - 1; i >= 0; i--)
        {
            var entity = Tundra.scene.entityById(ancestorsOfTarget[i].tundraEntityId);
            if (entity)
            {
                var threeMesh = this._getThreeMesh(entity);
                if (threeMesh)
                    this._updateHelpers(threeMesh, 0x00ffff);
            }
        }

        // Mark all descendants with magenta box
        for (var i = descendatsOfTarget.length - 1; i >= 0; i--)
        {
            var entity = Tundra.scene.entityById(descendatsOfTarget[i].tundraEntityId);
            if (entity)
            {
                var threeMesh = this._getThreeMesh(entity);
                if (threeMesh)
                    this._updateHelpers(threeMesh, 0xff00ff);
            }
        }
    },

    _updateHelpers : function(mesh, color)
    {
        color = color || 0xffff00;
        var id = mesh.uuid;
        if (!this.helpers[id])
        {
            var meshClone = mesh.clone();
            this.helpers[id] = {
                wireframe       : new THREE.WireframeHelper(meshClone, 0x00ffff),
                box             : new THREE.BoxHelper(mesh),
                originalMesh    : mesh
            };

            Tundra.renderer.scene.add(this.helpers[id].wireframe);
            Tundra.renderer.scene.add(this.helpers[id].box);
        }

        this.helpers[id].wireframe.material.linewidth = 2;
        this.helpers[id].wireframe.visible = false;
        this.helpers[id].box.material.linewidth = 4;
        this.helpers[id].box.material.depthTest = false;
        this.helpers[id].box.material.depthWrite = false;
        this.helpers[id].box.material.side = THREE.FrontSide;
        this.helpers[id].box.material.color = new THREE.Color(color);
        this.helpers[id].box.update(mesh);
    },

    _getFirstAncestor : function(node)
    {
        while (node.parent && node.parent.type === "Object3D")
            node = node.parent;

        return node;
    },

    _getAncestors : function(node)
    {
        var result = [];
        var n = node;
        while (n.parent && n.parent.type === "Object3D")
        {
            result.push(n.parent);
            n = n.parent;
        }

        return result;
    },

    _getDescendants : function(node)
    {
        var result = [];

        if (node.children.length > 0)
        {
            for (var i = node.children.length - 1; i >= 0; i--)
            {
                if (node.children[i].tundraComponentId && node.children[i].type === "Object3D")
                {
                    result.push(node.children[i]);
                    result = result.concat(this._getDescendants(node.children[i]));
                }
            }
        }

        return result;
    },

    _getThreeMesh : function(entity)
    {
        if (entity.meshmoon3dtext)
            return entity.meshmoon3dtext.textMesh;

        var mesh = entity.mesh;
        if (mesh && mesh.meshAsset && mesh.meshAsset.mesh && mesh.meshAsset.mesh.children.length > 0)
            return mesh.meshAsset.mesh.children[0];

        return undefined;
    },

    _isAncestorInTargets : function(node, ancestorList)
    {
        ancestorList = ancestorList || this._getAncestors(node);
        for (var i = ancestorList.length - 1; i >= 0; i--)
        {
            var ancestorUuid = ancestorList[i].uuid;
            for (var j = this.targets.length - 1; j >= 0; j--)
            {
                var targetUuid = this.targets[j].sceneNode.uuid;
                if (ancestorUuid == targetUuid)
                    return true;
            }
        }

        return false;
    },

    _descendantInTargets : function(node, descendantList)
    {
        var descendantList = descendantList || this._getDescendants(node);
        for (var i = descendantList.length - 1; i >= 0; i--)
        {
            var descendantUuid = descendantList[i].uuid;
            for (var j = this.targets.length - 1; j >= 0; j--)
            {
                var targetUuid = this.targets[j].sceneNode.uuid;
                if (descendantUuid == targetUuid)
                    return j;
            }
        }

        return -1;
    },

    setTargetEntity : function(entity)
    {
        this.setTargetEntities(entity._ptr ? entity._ptr : entity); // InterfaceDesigner compatibility, TODO: remove
    },

    appendTarget : function(entity)
    {
        if (!entity || !entity.placeable || this._isAncestorInTargets(entity.placeable.sceneNode))
            return;

        for (var i = this.targets.length - 1; i >= 0; i--)
        {
            if (this.targets[i].parentEntity.id == entity.id)
                return;
        }

        this.setTargetEntities(this.targets.concat([entity]));
    },

    setTargetEntities : function(entities)
    {
        this.clearSelection();

        if (!Array.isArray(entities))
        {
            if (typeof entities === "object")
                this._appendTarget(entities);
            else
            {
                console.error("[TransformEditor]: setTargetEntities: Invalid target provided:", entities);
                return;
            }
        }
        else
        {
            for (var i = 0; i < entities.length; ++i)
                this._appendTarget(entities[i]);
        }

        if (this.targets.length == 0)
            return;

        var node = null;
        if (this.targets.length == 1)
            node = this.targets[0].sceneNode;
        else
        {
            var pivotPoint = new THREE.Vector3(0,0,0);
            var averageRotation = new THREE.Vector3(0,0,0);
            var averageScale = new THREE.Vector3(0,0,0);

            for (var i = 0; i < this.targets.length; ++i)
            {
                var worldPos = this.targets[i].worldPosition();
                pivotPoint.add(worldPos);
                var rot = this.targets[i].sceneNode.rotation.toVector3();
                averageRotation.add(rot);
                var scale = this.targets[i].worldScale();
                averageScale.add(scale);
            }

            pivotPoint.divideScalar(this.targets.length);
            averageRotation.divideScalar(this.targets.length);
            averageScale.divideScalar(this.targets.length);

            node = Tundra.renderer.createSceneNode();
            node.position.copy(pivotPoint);
            node.quaternion.setFromEuler(new THREE.Euler(averageRotation.x, averageRotation.y, averageRotation.z));
            node.scale.copy(averageScale);

            node.updateMatrix();
            node.updateMatrixWorld();

            Tundra.renderer.scene.add(node);
        }

        this._attachSceneNode(node);
        this.cameraSubscription = Tundra.renderer.onActiveCameraChanged(this, this.onActiveCameraChanged);
    },

    _attachSceneNode : function(node)
    {
        this.activeNode = node;
        this.transformControl.attach(this.activeNode);
        Tundra.renderer.scene.add(this.transformControl);
    },

    _detachParents : function()
    {
        if (this.targets.length < 2 || !this.activeNode)
            return;

        for (var i = this.targets.length - 1; i >= 0; i--)
        {
            var sceneNode = this.targets[i].sceneNode;
            if (sceneNode.parent.type == "Object3D")
            {
                this.previousParentOfTarget[sceneNode.uuid] = sceneNode.parent;
                THREE.SceneUtils.detach(sceneNode, sceneNode.parent, Tundra.renderer.scene);
            }

            THREE.SceneUtils.attach(this.targets[i].sceneNode, Tundra.renderer.scene, this.activeNode);
        }
    },

    _reAttachParent : function(node)
    {
        if (this.targets.length < 2 || !this.activeNode || !node)
            return;

        THREE.SceneUtils.detach(node, this.activeNode, Tundra.renderer.scene);
        if (this.previousParentOfTarget[node.uuid])
        {
            THREE.SceneUtils.attach(node, Tundra.renderer.scene, this.previousParentOfTarget[node.uuid]);
            delete this.previousParentOfTarget[node.uuid];
        }
    },

    setMode : function(mode)
    {
        this.transformControl.setMode(mode);
    },

    onFrameUpdate : function(frametime)
    {
        if (this.transformControl.isAttached())
            this.transformControl.update();

        var helpersKeys = Object.keys(this.helpers);
        for (var i = 0; i < helpersKeys.length; ++i)
        {
            if (this.helpers[helpersKeys[i]].box && this.helpers[helpersKeys[i]].originalMesh)
                this.helpers[helpersKeys[i]].box.update(this.helpers[helpersKeys[i]].originalMesh);
        }
    },

    onActiveCameraChanged : function(activeCam, previousCam)
    {
        this.transformControl.setCamera(activeCam.camera);
    },

    onUpdate : function(event)
    {
        if (this.targets.length == 0)
            return;

        if (!this.activeNode)
            return;

        this.activeNode.updateMatrix();
        this.activeNode.updateMatrixWorld();
    },

    onDragStarted : function(event)
    {
        /* Critical state. We are detaching the target parents (if available), and attaching the active node,
           so we can translate / rotate / scale with it. If something / someone changes the transform during dragging,
           target transforms will be erratic. */
        this._detachParents();
        var helpersKeys = Object.keys(this.helpers);
        for (var i = 0; i < helpersKeys.length; ++i)
        {
            var key = helpersKeys[i];
            var object = this.helpers[key].wireframe;
            var mesh = this.helpers[key].originalMesh;
            object.matrix.copy(mesh.matrixWorld);
            object.visible = true;
        }

        if (this.targets.length == 1)
            Tundra.events.send("TransformEditor.DragStart", this.targets[0].parentEntity);
    },

    onDragStopped : function(event)
    {
        var states = [];
        if (this.targets.length > 1)
        {
            for (var i = this.targets.length - 1; i >= 0; i--)
            {
                var target = this.targets[i];
                var t = target.transform;
                var node = target.sceneNode;

                /* Critical state. We are detaching from the active node that we used for manipulating, and re-attaching
                   the parents back where applicable. The transform will be updated accordingly to the parent (thanks THREE.SceneUtils).
                   By doing this, we can be sure of valid transform states (before the drag started and after it stopped), much easier
                   than calculating everything by hand.
                   Again, if someone / something changed the transform during dragging, the transforms will be erratic.
                   Collaborative editing is out of scope of this transform editor implementation. */
                this._reAttachParent(node);
                t.setPosition(node.position);
                t.setRotation(node.quaternion);
                t.setScale(node.scale);

                states.push({
                    target : target,
                    before : target.transform,
                    after : t
                });

                target.transform = t;
            }
        }
        else if (this.targets.length == 1)
        {
            var target = this.targets[0];
            var t = target.transform;
            t.setPosition(this.activeNode.position);
            t.setRotation(this.activeNode.quaternion);
            t.setScale(this.activeNode.scale);

            states.push({
                target : target,
                before : target.transform,
                after : t
            });
            target.transform = t;
        }

        var helpersKeys = Object.keys(this.helpers);
        for (var i = 0; i < helpersKeys.length; ++i)
        {
            var key = helpersKeys[i];
            this.helpers[key].wireframe.visible = false;
        }

        //TODO: something with states

        if (states.length == 1)
            Tundra.events.send("TransformEditor.DragEnd", states[0].target.parentEntity);
        Tundra.events.send("TransformEditor.MultiTransform", states);
    },

    clearSelection : function()
    {
        if (this.cameraSubscription)
            Tundra.events.unsubscribe(this.cameraSubscription);

        if (this.targets.length > 1)
            Tundra.renderer.scene.remove(this.activeNode);

        this.transformControl.detach();
        Tundra.renderer.scene.remove(this.transformControl);

        this.activeNode = undefined;

        var helpersKeys = Object.keys(this.helpers);
        for (var i = helpersKeys.length - 1; i >= 0; i--)
        {
            var key = helpersKeys[i];
            Tundra.renderer.scene.remove(this.helpers[key].wireframe);
            Tundra.renderer.scene.remove(this.helpers[key].box);
            delete this.helpers[key];
        }

        this.targets.length = 0;
        this.cameraSubscription = undefined;
    }
});

return TransformEditor;

});