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
app.viewer.meshReadySig.add(function(meshComp, threeMesh) {
    // if (/raf22031\.ctm$/.test(meshComp.meshRef.ref) === false)
    //     return;

    var materialParams = {
        specular: 0x7f7f7f,
        color: 0xffffff,
        map: THREE.ImageUtils.loadTexture("raf22031.jpg")
    };
    var rafCarMaterial = new THREE.MeshPhongMaterial(materialParams);
    threeMesh.material = rafCarMaterial;
    console.log("swapped custom material");
});

function setupFreelook() {
    // FREE LOOK
    var freeLookCtrl = new THREE.FreeLookControls(app.viewer.camera, app.viewer.renderer.domElement);
    app.scene.add(freeLookCtrl.getObject());
    // An object in freeLookCtrl that carries the camera. Set it's position instead of setting camera position directly
}
function loadXml3d(model, docurl) {
    var parser = new SceneParser(model);
    parser.parseFromUrlXml3D(docurl);
    console.log("parse done");
}

loadXml3d(app.dataConnection, "xml3d-scene-ctm.html");
// hack to get the right xml3d-created camera and not the default one.
window.setTimeout(setupFreelook, 200);
