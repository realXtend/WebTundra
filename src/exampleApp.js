"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var app = new Application();

var host = "localhost"; // IP to the Tundra server
var port = 2345; // and port to the server

app.start();

app.connect(host,port)

function checkSceneCondition(condition) {
    var range = condition.entityRangePresent;
    var i, o3d;
    if (range) {
        for (i = range.min; i < range.max; i++) {
            check(app.dataConnection.scene.entityById(i) !== null);
            o3d = app.viewer.o3dByEntityId[i];
            check(o3d !== null);
            check(o3d.userData.entityId == i);
        }
    }

    range = condition.entityRangeHaveMesh;
    if (range) {
        for (i = range.min; i < range.max; i++) {
            o3d = app.viewer.o3dByEntityId[i];
            check(o3d.children.length > 0);
        }
    }
}

function checkPhysics2() {
    var condition = {
        entityRangePresent: {min: 1, max: 563},
        entityRangeHaveMesh: {min: 1, max: 563},
    };
    checkSceneCondition();
}
