// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var useSignals = true;
var useOrbitalControls = false;

function Application(dataConnection, viewer) {
    this.keyboard = new THREEx.KeyboardState();
    this.clock = new THREE.Clock();

    // SCENE
    this.scene = new THREE.Scene();

    // VIEWER
    this.viewer = new ThreeView(this.scene);

    // MODEL
    this.dataConnection = new WebTundraModel(this);

    this.dataConnection.scene.componentAdded.add(this.viewer.onComponentAddedOrChanged.bind(this.viewer));

    // an alternative to hooking per component attributeChanged signals,
    // would simplify business registering/unregistering handlers in
    // component lifetime mgmt.

    // this.dataConnection.scene.attributeChanged.add(function(comp, attr, ctype) {
    //     console.log("attr change triggered onComponentAddedOrChanged call");
    //     this.onComponentAddedOrChanged(comp.parentEntity, comp, ctype, attr);
    // }.bind(this.viewer));

    if (useOrbitalControls) {
        // CONTROLS
        this.controls = new THREE.OrbitControls(this.camera, this.viewer.renderer.domElement);
        this.controls.userZoom = true;
    }
}

Application.prototype = {

    constructor: Application,

    start: function() {
        this.dataConnection.connectClient();
        this.logicInit();
        this.frameCount = 0;
        this.update();
    },

    update: function() {
        var delta = this.clock.getDelta(); // seconds

        this.logicUpdate();
        if (!useSignals)
            this.dataToViewerUpdate();

        if (useOrbitalControls)
            this.controls.update();
        this.viewer.stats.update();

        requestAnimationFrame(function() {
            this.update();
        }.bind(this));

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
    }
};

var debugOnCheckFail = true;

function checkDefined() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] === undefined) {
            if (debugOnCheckFail) {
                debugger;
            } else {
                throw("undefined value, arg #" + i);
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
                throw("untrue value" + arguments[i] + ", arg #" + i);
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

function EventCounter() {
    this.events = {};
}

EventCounter.prototype.add = function(key) {
    var count = this.events[key];
    if (count === undefined)
        count = 0;
    count++;
    this.events[key] = count;
    return count;
};

