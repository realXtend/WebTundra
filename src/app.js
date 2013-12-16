// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var useSignals = true;

function Application(dataConnection, viewer) {
    // CAMERA
    this.SCREEN_WIDTH = window.innerWidth;
    this.SCREEN_HEIGHT = window.innerHeight;
    this.VIEW_ANGLE = 45;
    this.ASPECT = this.SCREEN_WIDTH / this.SCREEN_HEIGHT;
    this.NEAR = 0.1;
    this.FAR = 20000;
}

Application.prototype = {

    constructor: Application,

    init: function() {
        this.keyboard = new THREEx.KeyboardState();
        this.clock = new THREE.Clock();
        // 
        // SCENE
        this.scene = new THREE.Scene();

        // CAMERA
        this.camera = new THREE.PerspectiveCamera(this.VIEW_ANGLE, this.ASPECT, this.NEAR, this.FAR);
        this.scene.add(this.camera);
        this.camera.position.set(0, 300, 100); // (0, 1000, -375);
        this.camera.lookAt(this.scene.position);

        // VIEWER
        this.viewer = new ThreeView(this.scene, this.camera);

        // MODEL
        this.connected = false;
        this.dataConnection = new WebTundraModel(this);
        this.dataConnection.client.connected.add(this.onConnected.bind(this));
        this.dataConnection.client.disconnected.add(this.onDisconnected.bind(this));
        this.dataConnection.meshComponentReady.add(this.viewer.addOrUpdate.bind(this.viewer));

        // CONTROLS
        this.controls = new THREE.OrbitControls(this.camera, this.viewer.renderer.domElement);
        this.controls.userZoom = true;
    },

    start: function() {
        this.init();
        this.logicInit();
        this.frameCount = 0;
        this.update();
    },

    logicInit: function() {
        this.cubeCount = 0;
        var scene = this.dataConnection.scene;
        this.testEntities = [];
        console.log("in makeEntities");
        for (var i = 0; i < this.cubeCount; i++) {
            var ent = scene.createEntity(i + 1000);
            this.testEntities.push(ent);
            var placeable = ent.createComponent("placeable", "Placeable", "");
            var mesh = ent.createComponent("mesh", "Mesh", "placeable");
            placeable.transform.value.pos.x = i * 150;
            placeable.transform.value.pos.y = 150;

            setXyz(placeable.transform.value.scale, 1, 1, 1);
            mesh.meshRef.ref = "http://kek";
        }
    },

    connect: function(host, port) {
        this.dataConnection.connectClient(host, port);
    },

    onConnected: function() {
        this.connected = true;
    },

    onDisconnected: function() {
        this.connected = false;
    },

    update: function() {
        var delta = this.clock.getDelta(); // seconds

        this.logicUpdate();
        if (!useSignals)
            this.dataToViewerUpdate();

        this.controls.update();
        this.viewer.stats.update();

        var scope = this;
        requestAnimationFrame(function() {
            scope.update();
        });

        this.viewer.render();
        this.frameCount++;
    },

    logicUpdate: function() {
        var posIncrement;
        checkDefined(this.frameCount);
        if (this.frameCount % 100 === 0) {
            posIncrement = 50;
        } else {
            posIncrement = -0.5;
        }
        for (var i = 0; i < this.testEntities.length; i++) {
            var ent = this.testEntities[i];
            checkDefined(ent);
            ent.components.placeable.transform.value.pos.y += posIncrement;
            ent.components.placeable.transform.value.rot.y += 0.01;
        }
    },

    dataToViewerUpdate: function() {
        var sceneData = this.dataConnection.scene;
        for (var i in sceneData.entities) {
            if (!sceneData.entities.hasOwnProperty(i))
                continue;
            var entity = sceneData.entities[i];
            checkDefined(entity);
            var placeable = entity.componentByType("Placeable");
            var meshes = [];
            var j;
            for (j in entity.components) {
                if (!entity.components.hasOwnProperty(j))
                    continue;
                var comp = entity.components[j];
                checkDefined(comp);
                if (comp instanceof EC_Mesh)
                    meshes.push(comp);
                else if (comp instanceof EC_Placeable)
                    placeable = comp;
            }
            if (placeable !== null)
                for (j in Object.keys(meshes)) {
                    this.viewer.addOrUpdate(entity, placeable, meshes[j]);
            }
        }
    }


};

var debugOnCheckFail = true;

function checkDefined() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] === undefined) {
            if (debugOnCheckFail) {
                debugger;
            } else {
                throw ("undefined value, arg #" + i);
            }
        }
    }
}

function check() {
    for (var i = 0; i < arguments.length; i++)
        if (arguments[i] !== true)
            if (debugOnCheckFail) {
                debugger;
            } else {
                throw ("untrue value" + arguments[i] + ", arg #" + i);
            }
}


function attributeValues(o) {
    var out = [];
    for (var key in o) {
        if (!o.hasOwnProperty(key))
            continue;
        out.push(o[key]);
    }
    return out;
}