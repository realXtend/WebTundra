"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */

// For conditions of distribution and use, see copyright notice in LICENSE

/**
 * @author Erno Kuusela
 *
 * Originally based on scene parser class from Chiru-Webclient by
 * @author Toni Dahl
 *
 */

function SceneParser(ecModel) {
    this.ecModel = ecModel;
}

var logParserDebug = true;
function parserDebug(msg) {
    logParserDebug && console.log(msg);
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
    console.log("xhr start");
    xhttp.onreadystatechange = function() {
        console.log("xhr callback");
        if (xhttp.readyState == 4) {
            if (xhttp.status == 200) {
                var doc = xhttp.response;
                check(doc !== null);               
                this.parseDocXml3D(doc);
            }
        } else {
            //console.log("unhandled xhr readystate " + xhttp.readyState);
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

            var ECComp = this.ecModel.Tundra.createComponent(type);

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

SceneParser.prototype.createEntityWithPlaceable = function() {
    var entity = this.ecModel.scene.createEntity(0, Tundra.AttributeChange.LocalOnly);
    var placeable = entity.Tundra.createComponent(0, Tundra.cComponentTypePlaceable,
                                           "", Tundra.AttributeChange.LocalOnly);
    placeable.parentRef = 0; // won't get added to three scene until this is initialized
    return entity;
};

SceneParser.prototype.parseDocXml3D = function(doc) {
    var lightEnt = this.ecModel.scene.createEntity(0, name);
    lightEnt.Tundra.createComponent(0, Tundra.cComponentTypePlaceable,
                        "", Tundra.AttributeChange.LocalOnly);
    lightEnt.Tundra.createComponent(0, cComponentTypeLight, "", Tundra.AttributeChange.LocalOnly);
    console.log("SceneParser: created placeholder light");
    
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

    var transformDefs = wtFindTransformDefs(doc);

    var setPlaceableFromGroupNode = function(placeable, groupNode) {
        check(!!groupNode);
        var xTransform = groupNode.getAttribute("transform");
        if (!xTransform)
            return false;
        if (xTransform[0] !== "#") {
            console.log("don't know how to handle this kind of transform: " + xTransform);
            return false;
        }
        var transformId = wtTrimLeft(xTransform, "#");
        var setter = transformDefs[transformId];
        if (!setter) {
            console.log("no transfrom def found:" + transformId);
            return false;
        }
        setter(placeable);
        console.log("placeable setter run");
        return true;
    };

    var viewsInGroups = [];
    var viewId, viewPosition, viewOrientation, xview,
       entity, ecCamera, placeable;
    for (var i = 0; i < groups.length; i++) {
        // console.log("doing group " + i);
        var group = groups[i];
        var groupId = group.getAttribute("id");

        entity = this.createEntityWithPlaceable();
        placeable = entity.componentByType("Placeable");
        check(!!placeable);
        var gotTransform = setPlaceableFromGroupNode(placeable, group);
        if (!gotTransform)
            console.log("using default transform for group", group);

        var meshChildren = group.getElementsByTagName("mesh");
        if (meshChildren.length > 0) {
            //console.log("*** handling meshes in group " + i);
            var xmesh = meshChildren[0];
            if (meshChildren.length > 1)
                console.log("handling only first mesh of " + meshChildren.length);
            var type = xmesh.getAttribute("type");
            var src = xmesh.getAttribute("src");
            var meshName = xmesh.getAttribute("id") || groupId;
            var ecmesh = entity.Tundra.createComponent(0, Tundra.cComponentTypeMesh, meshName,
                                                Tundra.AttributeChange.LocalOnly);
            ecmesh.meshRef = { ref: src };
            console.log("made mesh for id " + meshName + " entity " + entity.id);
           
        } else {
            //console.log("no meshes in group " + i);
        }
        var viewChildren = group.getElementsByTagName("view");
        
        if (viewChildren.length > 0) {
            console.log("got view in group");
            xview = viewChildren[0];
            if (viewChildren.length > 1)
                console.log("handling only first view of " + viewChildren.length);
            viewsInGroups.push(xview);           
            viewId = xview.getAttribute("id");
            viewPosition = xview.getAttribute("position");
            viewOrientation = xview.getAttribute("orientation");
            if (viewPosition) {
                console.log("in-group views with position not implemented");
            } else {
                setPlaceableFromGroupNode(placeable, group);
            }
            ecCamera = entity.Tundra.createComponent(0, cComponentTypeCamera, viewId || "camera", Tundra.AttributeChange.LocalOnly);
          
            //console.log("in-group camera added to entity " + entity.id);
            //placeable.debug = true;
        }
    }

    var grouplessViews = wtNodeListToArray(doc.getElementsByTagName("view"));
    for (i = grouplessViews.length; i >= 0; i--) {
        if (wtArrayContains(viewsInGroups, grouplessViews[i]))
            wtRemoveElementAtIndex(grouplessViews, i);
    }
    
    if (grouplessViews.length > 0) {
        console.log("got view outside group");
        xview = grouplessViews[0];
        if (grouplessViews.length > 1)
            console.log("handling only first view of " + grouplessViews.length);
        viewId = xview.getAttribute("id");
        viewPosition = xview.getAttribute("position");
        viewOrientation = xview.getAttribute("orientation");
        var camEntity = this.ecModel.scene.createEntity(0, Tundra.AttributeChange.LocalOnly);
        var placeable = camEntity.Tundra.createComponent(0, Tundra.cComponentTypePlaceable,
                                               "", Tundra.AttributeChange.LocalOnly);
        ecCamera = camEntity.Tundra.createComponent(0, cComponentTypeCamera, viewId || "camera", Tundra.AttributeChange.LocalOnly);
        var px = placeable.transform;
        if (viewPosition) {
            //console.log("have view pos");
            wtSplitToXyz(viewPosition, px.pos);
         }
        if (viewOrientation) {
            console.log("viewOrientation conversion " + viewOrientation);
            wtSplitAxisAngleToEulerXyz(viewOrientation, px.rot);
            //console.log("have view orientation, x=" + px.rot.x);
        }
        ecCamera.aspectRatio = ecCamera.aspectRatio;
        placeable.debug = true;
        placeable.transform = px; // trigger signal
        placeable.parentRef = 0;
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

function wtRemoveElementAtIndex(arr, i) {
    arr.splice(i, 1);
}

function wtNodeListToArray(nodeList) {  
    var out = [];
    out.push.apply(out, nodeList);
    check(out.length === nodeList.length);
    return out;
}

function wtFlattenArrays(arrayOfArrays) {
    var arr = [];
    return arr.concat.apply(arrayOfArrays);
}

function wtArrayContains(arr, elt) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === elt)
            return true;
    }
    return false;
}



var wtFindTransformDefs = function(root) {
    var allDefsNodes = root.getElementsByTagName("defs");
    if (allDefsNodes.length < 1) {
        console.log("can't find defs node");
        return false;
    }
    var foundTransforms = {};
    var makeSetter = function(trans, rot, scale) {
        var setter = function(placeable) {
            var px = placeable.transform;
            if (trans)
                wtSplitToXyz(trans, px.pos);
            if (rot)
                wtSplitAxisAngleToEulerXyz(rot, px.rot);
            if (scale)
                wtSplitToXyz(scale, px.scale);
            placeable.transform = px; // trigger signals
            placeable.parentRef = 0;
            console.log("pos for transform= " + [px.pos.x, px.pos.y, px.pos.z]);
        };
        return setter;
    };
    var i;
    var transformNodes = [];
    for (i = 0; i < allDefsNodes.length; i++) {
        var thisDefTransforms = allDefsNodes[i].getElementsByTagName("transform")
        transformNodes = transformNodes.concat(
            wtNodeListToArray(thisDefTransforms));
    }
    console.log("found " + transformNodes.length + " transforms accross all defs");
    for (i = 0; i < transformNodes.length; i++) {
        var transformNode = transformNodes[i];
        var trans = transformNode.getAttribute("translation"),
           rot = transformNode.getAttribute("rotation"),
           scale = transformNode.getAttribute("scale");      
        var transformId = transformNode.getAttribute("id");
        if (!(trans && rot && scale)) {
            console.log("incomplete transform " + transformId + ":", trans, rot, scale);
        }
        console.log("transform: " + transformId);
        check(!!(trans || rot || scale));
        foundTransforms[transformId] = makeSetter(trans, rot, scale);
    }
    console.log("transform finding finished");
    return foundTransforms;
};

function wtSplitToXyz(s, v3) {
    var nums = s.split(/\s+/).map(parseFloat);
    check(nums.length === 3);
    v3.x = nums[0]; v3.y = nums[1]; v3.z = nums[2];
    // console.log("wtSplitToXyz: " + nums);
};
function wtSplitAxisAngleToEulerXyz(s, xfrmRot) {
    var nums = s.split(/\s+/).map(parseFloat);
    var euler = new THREE.Euler();
    check(nums.length === 4);
    var q = xyzAngleToQuaternion(nums);
    euler.setFromQuaternion(q);
    /* ec convention is degrees */
    xfrmRot.x = wtRadToDeg(euler.x);
    xfrmRot.y = wtRadToDeg(euler.y);
    xfrmRot.z = wtRadToDeg(euler.z);
    //console.log("quat:", q, "euler:", euler);
}

function wtTrimLeft(s, trimChar) {
    while (s.length && s[0] === trimChar) {
        s = s.substring(1, s.length);
    }
    return s;
}

var wtRadToDeg = function(val) {
    return val * (180.0 / Math.PI);
};
