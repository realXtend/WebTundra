/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* globals Tundra */

// For conditions of distribution and use, see copyright notice in LICENSE

/**
 * @author Erno Kuusela
 *
 * Originally based on scene parser class from Chiru-Webclient by
 * @author Toni Dahl
 *
 */

define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/CoreStringUtils",
        "core/framework/TundraLogging"
    ], function(Class, TundraSDK, CoreStringUtils, TundraLogging) {

var SceneParser = Class.$extend(
{
    __init__ : function(targetScene)
    {
        this.scene = targetScene;
        this.baseRef = "";

        this.log = TundraLogging.getLogger("SceneParser");

        this.log.debug("Parser initialized. Target scene", this.scene.toString());
    },

    loadXML3DFromUrl : function(url)
    {
        this.log.debug("Fetching source", url);

        var transfer = TundraSDK.framework.asset.requestAsset(url, "Text");
        transfer.onCompleted(this, function(asset) {
            this.log.debug("Creating asset refs with base", asset.baseRef);
            this.baseRef = asset.baseRef;
            this.parseDocXml3D(asset.data);
        });

        // @todo assetapi
        /*var xhttp = new XMLHttpRequest();
        xhttp.overrideMimeType('text/xml');
        xhttp.open("GET", url, false);
        xhttp.send(null);
        var doc = xhttp.responseXML;
        this.log.debug(typeof doc, xhttp);
        TundraSDK.check(doc !== null);
        return this.parseDocXml3D(doc);*/
    },

    parseFromUrlXml3D : function(url)
    {
        TundraSDK.checkDefined(url);
        var xhttp = new XMLHttpRequest();
        //xhttp.overrideMimeType('text/xml');
        TundraSDK.check(typeof(url) === "string");
        this.log.debug("xhr start");
        xhttp.onreadystatechange = function() {
            console.log("xhr callback");
            if (xhttp.readyState == 4) {
                if (xhttp.status == 200) {
                    var doc = xhttp.response;
                    TundraSDK.check(doc !== null);               
                    this.parseDocXml3D(doc);
                }
            } else {
                this.log.warn("unhandled xhr readystate " + xhttp.readyState);
            }
        }.bind(this);

        xhttp.open("GET", url, true);
        xhttp.responseType = "document";
        xhttp.send(null);
    },

    parseFromString : function(xmlstring)
    {
        var doc = new window.DOMParser().parseFromString(xmlstring, "text/xml");  
        return this.parseDoc(doc);
    },

    parseDoc : function(doc)
    {
        var entities = doc.getElementsByTagName("entity");  
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];

            //does not work when the TXML file has overlapping IDs - the entities just won't get created and code borks
            //id = entity.getAttribute("id");
            var id = i;

            var ECEnt = this.ecModel.createEntity(id, 'notname');
            this.log.debug("Created entity", ECEnt);
            this.ecModel.addEntity(ECEnt);

            var components = entity.getElementsByTagName("component");

            for (var j = 0; j < components.length; j++) {
                var type = components[j].getAttribute("type");

                var attributes = components[j].getElementsByTagName("attribute");

                // debugger;

                var ECComp = this.ecModel.createComponent(type);
                this.log.debug("  Created component", ECComp);

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
    },

    createEntityWithPlaceable : function()
    {
        var entity = this.scene.createLocalEntity(["Name", "Placeable"]);
        return entity;
    },

    parseDocXml3D : function(doc)
    {
        var ent = this.scene.createLocalEntity(["Name" , "Placeable"]) /// @todo Light component
        ent.name = "Environment";

        /*var lightEnt = this.ecModel.scene.createEntity(0, name);
        lightEnt.createComponent(0, Tundra.cComponentTypePlaceable,
                            "", Tundra.AttributeChange.LocalOnly);
        lightEnt.createComponent(0, Tundra.cComponentTypeLight, "", Tundra.AttributeChange.LocalOnly);
        this.log.debug("SceneParser: created placeholder light");*/

        var x3Nodes = doc.getElementsByTagName("xml3d");
        if (x3Nodes.length < 1) {
            this.log.error("xml3d node not found");
            return;
        }
        if (x3Nodes.length > 1) {
            this.log.warn("handling only first of " + x3Nodes.length);
        }
        
        var groups = getDirectChildNodesByTagName(x3Nodes[0], "group");  
        this.log.debug("Parsing " + groups.length + " groups");

        var transformDefs = wtFindTransformDefs(doc);

        var setPlaceableFromGroupNode = function(placeable, groupNode)
        {
            TundraSDK.check(!!groupNode);
            var xTransform = groupNode.getAttribute("transform");
            if (!xTransform)
                return false;
            if (xTransform[0] !== "#") {
                this.log.warn("don't know how to handle this kind of transform: " + xTransform);
                return false;
            }
            var transformId = CoreStringUtils.trimStringLeft(xTransform, "#");
            var setter = transformDefs[transformId];
            if (!setter) {
                this.log.warn("no transfrom def found:" + transformId);
                return false;
            }
            setter(placeable);
            this.log.debug("    Parsed Transform to", placeable.transform.toString());
            return true;
        }.bind(this);

        var viewsInGroups = [];
        var viewId, viewPosition, viewOrientation, xview,
           entity, ecCamera, placeable;
        for (var i = 0; i < groups.length; i++) {
            
            var group = groups[i];
            var groupId = group.getAttribute("id");
            this.log.debug("Iterating group", i, groupId);

            entity = this.createEntityWithPlaceable();
            this.log.debug("  Created Entity", entity.toString());
            TundraSDK.check(!!entity.placeable);
            var gotTransform = setPlaceableFromGroupNode(entity.placeable, group);
            if (!gotTransform)
                this.log.debug("using default transform for group", group);

            var meshChildren = group.getElementsByTagName("mesh");
            if (meshChildren.length > 0) {
                //console.log("*** handling meshes in group " + i);
                var xmesh = meshChildren[0];
                if (meshChildren.length > 1)
                    this.log.debug("handling only first mesh of " + meshChildren.length);

                var type = xmesh.getAttribute("type");
                var src = xmesh.getAttribute("src");
                var meshName = xmesh.getAttribute("id") || groupId;

                // Convert relative refs to our scenes base ref
                if (CoreStringUtils.startsWith(src, "./", true))
                    src = src.substring(2);
                if (!CoreStringUtils.startsWith(src, "http", true))
                    src = this.baseRef + src;

                var mesh = entity.createLocalComponent("Mesh", meshName);
                mesh.meshRef = src;
                this.log.debug("    Created", mesh.toString());
               
            } else {
                //console.log("no meshes in group " + i);
            }
            var viewChildren = group.getElementsByTagName("view");
            
            if (viewChildren.length > 0) {
                console.log("got view in group");
                xview = viewChildren[0];
                if (viewChildren.length > 1)
                    this.log.debug("handling only first view of " + viewChildren.length);
                viewsInGroups.push(xview);           
                viewId = xview.getAttribute("id");
                viewPosition = xview.getAttribute("position");
                viewOrientation = xview.getAttribute("orientation");
                if (viewPosition) {
                    this.log.debug("in-group views with position not implemented");
                } else {
                    setPlaceableFromGroupNode(placeable, group);
                }
                ecCamera = entity.createComponent(0, Tundra.cComponentTypeCamera, viewId || "camera", Tundra.AttributeChange.LocalOnly);
              
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
            this.log.debug("Found view outside of group");
            xview = grouplessViews[0];
            if (grouplessViews.length > 1)
                this.log.debug("handling only first view of " + grouplessViews.length);
            viewId = xview.getAttribute("id");
            viewPosition = xview.getAttribute("position");
            viewOrientation = xview.getAttribute("orientation");

            var entity = this.scene.createLocalEntity(["Name", "Placeable", "Camera"]);
            entity.name = viewId || "XML3D View";

            // Placeable
            var px = entity.placeable.transform;
            if (viewPosition)
                wtSplitToXyz(viewPosition, px.pos);
            if (viewOrientation)
                wtSplitAxisAngleToEulerXyz(viewOrientation, px.rot);
            entity.placeable.transform = px; // trigger signal

            // Camera
            /// @todo Read and set aspect ratio to camera from <view>
            //entity.camera.aspectRatio = ??;

            this.log.debug("    Created", entity.camera.toString());
            entity.camera.setActive();
            this.log.debug("    Activated camera in", entity.toString());
            
        }
    }
});


function getDirectChildNodesByTagName(node, tagName)
{
    var out = [];
    tagName = tagName.toLowerCase();
    for (var i = 0; i < node.childNodes.length; i++) {
        var cn = node.childNodes[i];
        if (cn.tagName && cn.tagName.toLowerCase() === tagName)
            out.push(cn);
    }
    return out;
}

function xyzAngleToQuaternion(nums)
{
    /* formula from xml3d.js's rotation.js */
    TundraSDK.check(nums.length === 4);
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
    return new THREE.Quaternion(quatXyzw[0], quatXyzw[1], quatXyzw[2], quatXyzw[3]);
}

function wtRemoveElementAtIndex(arr, i)
{
    arr.splice(i, 1);
}

function wtNodeListToArray(nodeList)
{
    var out = [];
    out.push.apply(out, nodeList);
    TundraSDK.check(out.length === nodeList.length);
    return out;
}

function wtFlattenArrays(arrayOfArrays)
{
    var arr = [];
    return arr.concat.apply(arrayOfArrays);
}

function wtArrayContains(arr, elt)
{
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === elt)
            return true;
    }
    return false;
}

function wtFindTransformDefs(root)
{
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
            //TundraLogging.getLogger("SceneParserUtils").debug("pos for transform= " + [px.pos.x, px.pos.y, px.pos.z]);
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
    TundraLogging.getLogger("SceneParserUtils").debug("found " + transformNodes.length + " transforms accross all defs");
    for (i = 0; i < transformNodes.length; i++) {
        var transformNode = transformNodes[i];
        var trans = transformNode.getAttribute("translation"),
           rot = transformNode.getAttribute("rotation"),
           scale = transformNode.getAttribute("scale");      
        var transformId = transformNode.getAttribute("id");
        if (!(trans && rot && scale)) {
            TundraLogging.getLogger("SceneParserUtils").debug("incomplete transform " + transformId + ":", trans, rot, scale);
        }
        TundraLogging.getLogger("SceneParserUtils").debug("transform: " + transformId);
        TundraSDK.check(!!(trans || rot || scale));
        foundTransforms[transformId] = makeSetter(trans, rot, scale);
    }
    TundraLogging.getLogger("SceneParserUtils").debug("transform finding finished");
    return foundTransforms;
}

function wtSplitToXyz(s, v3)
{
    var nums = s.split(/\s+/).map(parseFloat);
    TundraSDK.check(nums.length === 3);
    v3.x = nums[0]; v3.y = nums[1]; v3.z = nums[2];
    // console.log("wtSplitToXyz: " + nums);
}

function wtSplitAxisAngleToEulerXyz(s, xfrmRot)
{
    var nums = s.split(/\s+/).map(parseFloat);
    var euler = new THREE.Euler();
    TundraSDK.check(nums.length === 4);
    var q = xyzAngleToQuaternion(nums);
    euler.setFromQuaternion(q);
    /* ec convention is degrees */

    xfrmRot.x = THREE.Math.radToDeg(euler.x);
    xfrmRot.y = THREE.Math.radToDeg(euler.y);
    xfrmRot.z = THREE.Math.radToDeg(euler.z);
    //TundraLogging.getLogger("SceneParserUtils").debug("quat:", q, "euler:", euler);
}

return SceneParser;

}); // require js
