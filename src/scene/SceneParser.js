/* jslint browser: true, globalstrict: true, devel: true, debug: true /

// For conditions of distribution and use, see copyright notice in LICENSE

/**
 * @author Toni Dahl
 * @author Erno Kuusela
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
    xhttp.responseType = "document";
    xhttp.open("GET", url, false);
    xhttp.send(null);
    var doc = xhttp.response;
    check(doc !== null);
    return this.parseDocXml3D(doc);
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
    var degToRad = function(val) {
        return val * (Math.PI / 180);
    };
    var splitToXyz = function(s, v3) {
        var nums = s.split(/\s+/);
        check(nums.length === 3);
        v3.x = nums[0]; v3.y = nums[1]; v3.z = nums[2];
        console.log("splitToXyz: " + nums);
    };
    var splitQuatStringToEulerXyz = function(s, v3) {
        var nums = s.split(/\s+/);
        check(nums.length === 4);
        var q = new THREE.Quaternion(nums[0], nums[1], nums[2], nums[3]);
        var e = new THREE.Euler();
        e.setFromQuaternion(q);
        v3.x = e.x; v3.y = e.y; v3.z = e.z;
        ((v3.x = degToRad(e.x); v3.y = degToRad(e.y); v3.z = degToRad(e.z);
        console.log("split quat: " + nums);
    };

    var groups = doc.getElementsByTagName("group");  
    var groupDone = {};
    var setPlaceableFromTransformId = function(placeable, root, transformId) {
        console.log("setting transform");
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
            var px = placeable.transform.value;
            splitToXyz(trans, px.pos);
            splitQuatStringToEulerXyz(rot, px.rot);
            splitToXyz(scale, px.scale);
            placeable.transform.value = px; // trigger signals

        }
    };


    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var groupId = group.getAttribute("id");
        if (groupDone[groupId])
            continue;
        groupDone[groupId] = true;
        var entity = this.ecModel.scene.createEntity(0, AttributeChange.LocalOnly);
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
            var xmesh = meshChildren[0];
            if (meshChildren.length > 1)
                console.log("handling only first mesh of " + meshChildren.length);
            var type = xmesh.getAttribute("type");
            var src = xmesh.getAttribute("src");
            var meshName = xmesh.getAttribute("id") || groupId;
            var ecmesh = entity.createComponent(0, cComponentTypeMesh, meshName,
                                                AttributeChange.LocalOnly);
            ecmesh.meshRef.value = { ref: src };
            console.log("made mesh");
        }

        var viewChildren = group.getElementsByTagName("view");
        if (viewChildren.length > 0) {
            console.log("got view");
            var xview = viewChildren[0];
            if (viewChildren.length > 1)
                console.log("handling only first view of " + viewChildren.length);
            var viewId = xview.getAttribute("id");
            var viewPosition = xview.getAttribute("position");
            var viewOrientation = xview.getAttribute("orientation");
            var ecCamera = entity.createComponent(0, cComponentTypeCamera, viewId || "camera", AttributeChange.LocalOnly);
            console.log("camera added to entity " + entity.id);
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
        var px = placeable.transform.value;
        if (viewPosition)
            splitToXyz(viewPosition, px.pos);
        if (viewOrientation)
            splitQuatStringToEulerXyz(viewOrientation, px.rot);
        placeable.transform.value = px; // trigger signal
    }
};
