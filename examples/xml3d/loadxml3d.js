"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2014
 */

function setupEditorControls() {
    var controls = new THREE.EditorControls(app.viewer.camera, app.viewer.renderer.domElement);
}

function loadxml3d() {
    var app = new Tundra.Application();
    app.start();
    var parser = new SceneParser(app.dataConnection);
    parser.parseDocXml3D(document);

    // hack to get the right xml3d-created camera and not the default one.
    window.setTimeout(setupEditorControls, 2000);
}
