var PhysicsApplication = ICameraApplication.$extend(
{
    __init__ : function()
    {
        this.$super("Physics");

        // Enables animations if both the previous and this camera entity is unparented
        this.animateBeforeActivation(true);

        TundraSDK.framework.client.onConnected(this, this.onConnected);
        TundraSDK.framework.client.onDisconnected(this, this.onDisconnected);
    },

    onConnected : function()
    {
        this.entities = {};
        this.createScene();
        
        this.createCamera();
    },

    createCamera : function()
    {
        this.onDisconnected();

        this.movement = new THREE.Vector3(0,0,0);
        this.movementForce = 10.0;

        // Connect input
        this.subscribeEvent(TundraSDK.framework.input.onMouseMove(this, this.onMouseMove));
        this.subscribeEvent(TundraSDK.framework.input.onKeyEvent(this, this.onKeyEvent));

        // Connect frame update
        this.subscribeEvent(TundraSDK.framework.frame.onUpdate(this, this.onUpdate));

        // Start up the ICameraApplication
        this.startCameraApplication("Free Look", "FreeLookCamera", 60);

        // Initiate camera pos/rot and activate it
        var t = this.cameraEntity.placeable.transform;
        t.pos.y = 2;
        t.pos.z = 3;
        this.cameraEntity.placeable.transform = t;
        this.cameraEntity.camera.setActive();
    },
    
    createScene : function()
    {
        var meshEntity = null;
        
        this.entities["Plane"] = TundraSDK.framework.scene.createLocalEntity(["Name", "Placeable", "RigidBody"]);
        meshEntity = this.entities["Plane"];
        meshEntity.name = "Plane"
        t = meshEntity.placeable.transform;
        t.setPosition(0, -2, -20);
        t.setScale(2.5, 2.5, 2.5);
        meshEntity.placeable.transform = t;
        meshEntity.rigidbody.mass = 0.0;
        meshEntity.rigidbody.size = new THREE.Vector3(10000.0, 0.1, 10000.0);
        TundraSDK.framework.physicsWorld.raycast(new THREE.Vector3(0, 30, -20),
                                                 new THREE.Vector3(0, -1, 0),
                                                 100);
        this.spawnBoxes(100);
        this.nextTime = TundraSDK.framework.frame.wallClockTime() + 5;
        this.removeList = [];
    },
    
    spawnBoxes : function(count)
    {
        this.entities = {};
        for (var i = 0; i < count; i++)
        {
            var id = "Box" + i.toString();
            this.entities[id] = this.createMesh(id, "webtundra://Box.json");
            
            meshEntity = this.entities[id];
            var t = meshEntity.placeable.transform;
            var x = -10 + Math.random() * (20 - 1) + 1;
            var y = 30 + Math.random() * (20 - 1) + 1;
            var z = -70 + Math.random() * (20 - 1) + 1;
            t.setPosition(x, y, z);
            meshEntity.placeable.transform = t;
            meshEntity.rigidbody.mass = 1.0;
            var fx = Math.random() * (25 - 1) + 1;
            var fy = Math.random() * (100 - 1) + 1;
            var fz = Math.random() * (25 - 1) + 1;
            meshEntity.rigidbody.applyForce(new THREE.Vector3(fx, fy, fz));
            meshEntity.rigidbody.applyTorgue(new THREE.Vector3(fx, fy, fz));
            /*meshEntity.rigidbody.applyImpulse(new THREE.Vector3(fx, fy, fz));
            meshEntity.rigidbody.applyTorgueImpulse(new THREE.Vector3(fx, fy, fz));*/
            /*meshEntity.rigidbody.onPhysicsCollision(null, function(entity){
                TundraSDK.framework.scene.removeEntity(entity.id);
            });*/
        }
    },
    
    createMesh : function(name, ref)
    {
        var meshEntity = TundraSDK.framework.scene.createLocalEntity(["Name", "Placeable", "Mesh", "RigidBody"]);
        meshEntity.name = name;
        meshEntity.mesh.meshRef = ref;
        return meshEntity;
    },

    onDisconnected : function()
    {
        this.resetCameraApplication();
        this.unsubscribeEvents();
    },

    onCameraActived : function(cameraEntity, previousCameraEntity)
    {
        this.movement.x = 0; this.movement.y = 0; this.movement.z = 0;
    },

    onCameraDeactived : function(cameraEntity, activatedCameraEntity)
    {
        this.movement.x = 0; this.movement.y = 0; this.movement.z = 0;
    },

    onUpdate : function(frametime)
    {
        if (this.cameraEntity.camera === null || !this.cameraEntity.camera.active)
            return;

        if (this.movement.x != 0 || this.movement.y != 0 || this.movement.z != 0)
        {
            var t = this.cameraEntity.placeable.transform;
            var relativeMovement = this.movement.clone();
            relativeMovement.applyQuaternion(t.orientation());
            relativeMovement.multiplyScalar(frametime * this.movementForce)
            t.pos.x += relativeMovement.x;
            t.pos.y += relativeMovement.y;
            t.pos.z += relativeMovement.z;
            this.cameraEntity.placeable.transform = t;
        }
        
        /*if (TundraSDK.framework.frame.wallClockTime() > this.nextTime)
        {
            this.nextTime = TundraSDK.framework.frame.wallClockTime() + 5;
            this.spawnBoxes(20);
        }*/
        
        for(var i = 0; i < this.removeList.length; ++i)
        {
            console.log(this.removeList[i].id);
            TundraSDK.framework.scene.removeEntity(this.removeList[i].id);
        }
        this.removeList = [];
    },

    onKeyEvent : function(event)
    {
        if (!this.cameraEntity.camera.active)
            return;

        if (event.type === "release")
        {
            if (event.key == "w" || event.key == "up" || event.key == "s" ||  event.key == "down")
                this.movement.z = 0;
            else if (event.key == "a" || event.key == "d" || event.key == "left" || event.key == "right")
                this.movement.x = 0;
            else if (event.key == "c" || event.key == "space")
                this.movement.y = 0;
        }

        if (event.targetNodeName !== "body")
        {
            this.movement.x = 0; this.movement.y = 0; this.movement.z = 0;
            return;
        }

        var speed = 1;
        if (event.pressed["shift"])
            speed *= 2;

        this.movement.x = 0; this.movement.y = 0; this.movement.z = 0;
        for (var key in event.pressed)
        {
            if (key == "w" || key == "up")
                this.movement.z = -speed;
            else if (key == "s" || key == "down")
                this.movement.z = speed;
            else if (key == "a" || key == "left")
                this.movement.x = -speed;
            else if (key == "d" || key == "right")
                this.movement.x = speed;
            else if (key == "c")
                this.movement.y = -speed;
            else if (key == "space")
                this.movement.y = speed;
        }
    },

    onMouseMove : function(event)
    {
        if (!this.cameraEntity.camera.active)
            return;

        if (!event.rightDown)
            return;
        if (event.targetNodeName !== "canvas")
            return;
        if (event.relativeX == 0 && event.relativeY == 0)
            return;

        if (event.relativeX != 0 || event.relativeY != 0)
        {
            var t = this.cameraEntity.placeable.transform;
            if (event.relativeX != 0)
            {
                t.rot.y -= (event.relativeX * 0.2);
                if (t.rot.y > 360.0 || t.rot.y < -360.0)
                    t.rot.y = t.rot.y % 360.0;
            }
            if (event.relativeY != 0)
            {
                t.rot.x -= (event.relativeY * 0.2);
                if (t.rot.x > 90.0)
                    t.rot.x = 90.0;
                else if (t.rot.x < -90.0)
                    t.rot.x = -90.0;
            }
            this.cameraEntity.placeable.transform = t;
        }
    }
});
