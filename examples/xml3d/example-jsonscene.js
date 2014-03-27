"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var app = new Application();
app.start();

loadXml3d(app.dataConnection, "xml3d-scene-jsonscene.html");


function loadXml3d(model, docurl) {
    var parser = new SceneParser(model);
    parser.parseFromUrlXml3D(docurl);
    console.log("parse done");
}

function setupEditorControls() {
    var controls = new THREE.EditorControls(app.viewer.camera, app.viewer.renderer.domElement);
}

window.setTimeout(setupEditorControls, 2000);
