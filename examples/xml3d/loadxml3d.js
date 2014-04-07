"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2014
 */

var app = new Tundra.Application();

function setupEditorControls() {
    var v = app.viewer;
    v.defaultCamera.position = v.camera.parent.position;
    v.defaultCamera.rotation = v.camera.parent.rotation;
    v.defaultCamera.scale = v.camera.parent.scale;
    v.defaultCamera.lookAt(new THREE.Vector3());

    app.viewer.setActiveCamera({'threeCamera': v.defaultCamera});
    var controls = new THREE.EditorControls(v.defaultCamera, v.renderer.domElement);
}

function loadxml3d() {
    app.start();
    var parser = new Tundra.SceneParser(app.dataConnection);
    parser.parseDocXml3D(document);

    // hack to get the right xml3d-created camera and not the default one.
    window.setTimeout(setupEditorControls, 2000);
}
