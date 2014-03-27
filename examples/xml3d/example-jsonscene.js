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
var parser = new SceneParser(app.dataConnection);
parser.parseDocXml3D(document);
console.log("parse done");

function setupEditorControls() {
    var controls = new THREE.EditorControls(app.viewer.camera, app.viewer.renderer.domElement);
}

window.setTimeout(setupEditorControls, 2000);
