/* jslint browser: true, globalstrict: true, devel: true, debug: true */

// For conditions of distribution and use, see copyright notice in LICENSE

/**
 * @author Erno Kuusela
 *
 * Originally based on scene parser class from Chiru-Webclient by
 * @author Toni Dahl
 *
 */
"use strict";

function SceneParser(ecModel) {
    this.ecModel = ecModel;
}

SceneParser.prototype.parseFromUrl = function(url) {
    // console.log("________________________________________" );
    var xhttp = new XMLHttpRequest();
    xhttp.overrideMimeType('text/xml');
    xhttp.open("GET", url, false);
    xhttp.send(null);
    var doc = xhttp.responseXML;
    check(doc !== null);
    return this.parseDocXml3D(doc);
};

SceneParser.prototype.parseFromUrlXml3D = function(url) {
    checkDefined(url);
    // console.log("________________________________________" );
    var xhttp = new XMLHttpRequest();
    //xhttp.overrideMimeType('text/xml');
    check(typeof(url) === "string");

    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4) {
            if (xhttp.status == 200) {
                var doc = xhttp.response;
                check(doc !== null);
                this.parseDocXml3D(doc);
            }
        }
    }.bind(this);

    xhttp.open("GET", url, true);
    xhttp.responseType = "document";
    xhttp.send(null);
};

SceneParser.prototype.parseFromString = function(xmlstring) {
    var doc = new window.DOMParser().parseFromString(xmlstring, "text/xml");  
    return this.parseDoc(doc);
};

SceneParser.prototype.parseDoc = function(doc) {
    var entities = doc.getElementsByTagName("entity");  
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];

        //does not work when the TXML file has overlapping IDs - the entities just won't get created and code borks
        //id = entity.getAttribute("id");
        var id = i;

        var ECEnt = this.ecModel.createEntity(id, 'notname');
        // console.log("ECEnt: " + ECEnt);
        this.ecModel.addEntity(ECEnt);

        var components = entity.getElementsByTagName("component");

        for (var j = 0; j < components.length; j++) {
            var type = components[j].getAttribute("type");

            var attributes = components[j].getElementsByTagName("attribute");

            // debugger;

            var ECComp = this.ecModel.createComponent(type);

            for (var k = 0; k < attributes.length; k++) {
                var attribute = attributes[k];

                var name = attribute.getAttribute("name");
                var value = attribute.getAttribute("value");

                if (name.toLowerCase() === 'transform') {
                    value = value.split(',');
                    // console.log("name: " + name);
                    // console.log("value: " + value);
                }

                ECComp.updateAttribute(k, value, name);
            }

            try {
                // debugger;
                ECEnt.addComponent(ECComp, j);
                // console.log("success: " + type);
            } catch (e) {
                // console.log("fail: " + type);
                // console.log(e.fileName);
                // console.log(e.lineNumber);

            }

        }
    }

    return this.ecModel;
};

SceneParser.prototype.parseDocXml3D = function(doc) {
    var radToDeg = function(val) {
        return val * (180.0 / Math.PI);
    };
    var lightEnt = this.ecModel.scene.createEntity(0, name);
    lightEnt.createComponent(0, cComponentTypePlaceable,
                        "", AttributeChange.LocalOnly);
    lightEnt.createComponent(0, cComponentTypeLight, "", AttributeChange.LocalOnly);
    console.log("SceneParser: created placeholder light");
    
    var splitToXyz = function(s, v3) {
        var nums = s.split(/\s+/).map(parseFloat);
        check(nums.length === 3);
        v3.x = nums[0]; v3.y = nums[1]; v3.z = nums[2];
        // console.log("splitToXyz: " + nums);
    };
    var splitAxisAngleToEulerXyz = function(s, xfrmRot) {
        var nums = s.split(/\s+/).map(parseFloat);
        var euler = new THREE.Euler();
        copyXyz(xfrmRot, euler);
        check(nums.length === 4);
        var q = xyzAngleToQuaternion(nums);
        euler.setFromQuaternion(q);
        copyXyzMapped(euler, xfrmRot, radToDeg);
        //console.log("quat:", q, "euler:", euler);
    }; 

    var x3Nodes = doc.getElementsByTagName("xml3d");
    if (x3Nodes.length < 1) {
        console.log("xml3d node not found");
        return;
    }
    if (x3Nodes.length > 1) {
        console.log("handling only first of " + x3Nodes.length);
    }
    
    var groups = getDirectChildNodesByTagName(x3Nodes[0], "group");  
    console.log("handling " + groups.length + " groups");
    var setPlaceableFromTransformId = function(placeable, root, transformId) {
        console.log("setting transform from transform id " + transformId);
        var allDefsNodes = root.getElementsByTagName("defs");
        if (allDefsNodes.length < 1) {
            console.log("can't find defs node");
            return;
        }
        if (allDefsNodes.length > 1)
            console.log("multiple defs nodes found, handling only first one");
        var defsNode = allDefsNodes[0];
        var allTransformNodes = defsNode.getElementsByTagName("transform");
        for (var i = 0; i < allTransformNodes.length; i++) {
            var transformNode = allTransformNodes[i];
            if (transformNode.getAttribute("id") !== transformId) {
                continue;
            }
            var trans = transformNode.getAttribute("translation"),
            rot = transformNode.getAttribute("rotation"),
            scale = transformNode.getAttribute("scale");
            if (!(trans && rot && scale)) {
                console.log("incomplete transform " + transformId);
                return;
            }
            var px = placeable.transform;
            splitToXyz(trans, px.pos);
            splitAxisAngleToEulerXyz(rot, px.rot);
            splitToXyz(scale, px.scale);
            placeable.transform = px; // trigger signals
            console.log("pos for transform x=" + px.pos.x);
        }
    };


    var viewId, viewPosition, viewOrientation, xview, entity, ecCamera;
    for (var i = 0; i < groups.length; i++) {
        // console.log("doing group " + i);
        var group = groups[i];
        var groupId = group.getAttribute("id");

        entity = this.ecModel.scene.createEntity(0, AttributeChange.LocalOnly);
        var placeable = entity.createComponent(0, cComponentTypePlaceable,
                                               "", AttributeChange.LocalOnly);
        var groupTransformId = group.getAttribute("transform");
        if (groupTransformId && groupTransformId[0] === '#') {
            groupTransformId = groupTransformId.substring(1, groupTransformId.length);
            setPlaceableFromTransformId(placeable, doc, groupTransformId);
        } else {
            console.log("group transform missing or not id ref: " + groupTransformId);
        }
        var meshChildren = group.getElementsByTagName("mesh");
        if (meshChildren.length > 0) {
            //console.log("*** handling meshes in group " + i);
            var xmesh = meshChildren[0];
            if (meshChildren.length > 1)
                console.log("handling only first mesh of " + meshChildren.length);
            var type = xmesh.getAttribute("type");
            var src = xmesh.getAttribute("src");
            var meshName = xmesh.getAttribute("id") || groupId;
            var ecmesh = entity.createComponent(0, cComponentTypeMesh, meshName,
                                                AttributeChange.LocalOnly);
            ecmesh.meshRef = { ref: src };
            console.log("made mesh for id " + meshName);
        } else {
            console.log("no meshes in group " + i);
        }

        var viewChildren = group.getElementsByTagName("view");
        if (viewChildren.length > 0) {
            //console.log("got view");
            xview = viewChildren[0];
            if (viewChildren.length > 1)
                console.log("handling only first view of " + viewChildren.length);
            viewId = xview.getAttribute("id");
            viewPosition = xview.getAttribute("position");
            viewOrientation = xview.getAttribute("orientation");
            ecCamera = entity.createComponent(0, cComponentTypeCamera, viewId || "camera", AttributeChange.LocalOnly);
            //console.log("in-group camera added to entity " + entity.id);
        }
    }

    var grouplessViews = doc.getElementsByTagName("view");
    if (grouplessViews.length > 0) {
        console.log("got view");
        xview = grouplessViews[0];
        if (grouplessViews.length > 1)
            console.log("handling only first view of " + grouplessViews.length);
        viewId = xview.getAttribute("id");
        viewPosition = xview.getAttribute("position");
        viewOrientation = xview.getAttribute("orientation");
        var camEntity = this.ecModel.scene.createEntity(0, AttributeChange.LocalOnly);
        var placeable = camEntity.createComponent(0, cComponentTypePlaceable,
                                               "", AttributeChange.LocalOnly);
        ecCamera = camEntity.createComponent(0, cComponentTypeCamera, viewId || "camera", AttributeChange.LocalOnly);
        var px = placeable.transform;
        if (viewPosition) {
            //console.log("have view pos");
            splitToXyz(viewPosition, px.pos);
         }
        if (viewOrientation) {
            console.log("viewOrientation conversion " + viewOrientation);
            splitAxisAngleToEulerXyz(viewOrientation, px.rot);
            //console.log("have view orientation, x=" + px.rot.x);
        }
        ecCamera.aspectRatio = ecCamera.aspectRatio;
        placeable.debug = true;
        placeable.transform = px; // trigger signal
        console.log("groupless camera added to entity " + entity.id);
        
    }

  

};

function getDirectChildNodesByTagName(node, tagName) {
    var out = [];
    tagName = tagName.toLowerCase();
    for (var i = 0; i < node.childNodes.length; i++) {
        var cn = node.childNodes[i];
        if (cn.tagName && cn.tagName.toLowerCase() === tagName)
            out.push(cn);
    }
    return out;
}

function xyzAngleToQuaternion(nums) {
    /* formula from xml3d.js's rotation.js */
    check(nums.length === 4);
    var axisVec = new THREE.Vector3(nums[0], nums[1], nums[2]);
    var axisLength = axisVec.length();
    var quatXyzw;
    if (axisLength <= 0.00001)
        quatXyzw = [0, 0, 0, 1];
    else {
        var s = Math.sin(nums[3] / 2) / axisLength;
        var w = Math.cos(nums[3] / 2);
        quatXyzw = [nums[0] * s, nums[1] * s, nums[2] * s, w];
    }
    return new THREE.Quaternion(quatXyzw[0], quatXyzw[1], quatXyzw[2], quatXyzw[3])
}

function loadXml3d(model, docurl) {
    var parser = new SceneParser(model);
    parser.parseFromUrlXml3D(docurl);
}
