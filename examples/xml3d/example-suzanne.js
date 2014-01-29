"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var app = new Application();

var host = "localhost"; // hostname of the Tundra server
var port = 2345; // and port to the server

app.start();
loadXml3d(app.dataConnection, "xml3d-scene-suzanne.html");

function setupEditorControls() {
    var controls = new THREE.EditorControls(app.viewer.camera, app.viewer.renderer.domElement);
}
function loadXml3d(model, docurl) {
    var parser = new SceneParser(model);
    parser.parseFromUrlXml3D(docurl);
}
// hack to get the right xml3d-created camera and not the default one.
window.setTimeout(setupEditorControls, 2000);
