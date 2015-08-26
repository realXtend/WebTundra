var PhysicsApplication = ICameraApplication.$extend(
{
    __init__ : function()
    {
        this.$super("Physics");

        // Enables animations if both the previous and this camera entity is unparented
        this.animateBeforeActivation(true);
        
        this.CollisionTypes =
        {
            NOTHING : 0,
            BOX : 1,
            PLANE1 : 2,
            PLANE2 : 4
        };
        
        this.entities = {};
        this.createScene();
        this.createCamera();
    },

    onConnected : function()
    {
        
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
        
        this.entities["Plane"] = this.createMesh("Plane", "webtundra://sphere_big.json");
        meshEntity = this.entities["Plane"];
        meshEntity.name = "Plane"
        t = meshEntity.placeable.transform;
        t.setPosition(0, 7, -63);
        meshEntity.placeable.transform = t;
        meshEntity.rigidbody.mass = 0.0;
        meshEntity.rigidbody.size = new THREE.Vector3(1, 1, 1);
        meshEntity.rigidbody.shapeType = 4;
        
        this.entities["Plane2"] = TundraSDK.framework.scene.createLocalEntity(["Name", "Placeable", "RigidBody"]);
        meshEntity = this.entities["Plane2"];
        meshEntity.name = "Plane2"
        t = meshEntity.placeable.transform;
        t.setPosition(0, -20, -20);
        t.setScale(2.5, 2.5, 2.5);
        meshEntity.placeable.transform = t;
        meshEntity.rigidbody.mass = 0.0;
        meshEntity.rigidbody.size = new THREE.Vector3(10000.0, 3, 10000.0);
        //meshEntity.rigidbody.collisionLayer = this.CollisionTypes.PLANE2;
        //meshEntity.rigidbody.collisionMask = this.CollisionTypes.BOX;
        
        TundraSDK.framework.physicsWorld.raycast(new THREE.Vector3(0, 30, -20),
                                                 new THREE.Vector3(0, -1, 0),
                                                 100);
        
        
        shapes = ["Box", "Capsule", "Cylinder", "sphere", "Cone"];
        for (var i = 0; i < 200; ++i)
        {
            var shape = shapes[Math.floor(Math.random()*shapes.length)];
            this.spawnMesh(shape + " " + i, shape);
        }
        this.nextTime = TundraSDK.framework.frame.wallClockTime() + 5;
        this.removeList = [];
    },
    
    spawnMesh : function(id, shape)
    {
        var meshEntity = null;
        if (shape === "Box")
            meshEntity = this.createMesh(id, "webtundra://Box.json");
        else if (shape === "Capsule")
            meshEntity = this.createMesh(id, "webtundra://Capsule.json");
        else if (shape === "Cylinder")
            meshEntity = this.createMesh(id, "webtundra://Cylinder.json");
        else if (shape === "sphere")
            meshEntity = this.createMesh(id, "webtundra://sphere.json");
        else if (shape === "Cone")
            meshEntity = this.createMesh(id, "webtundra://Cone.json");
        
        var t = meshEntity.placeable.transform;
        var x = -10 + Math.random() * (20 - 1) + 1;
        var y = 30 + Math.random() * (20 - 1) + 1;
        var z = -70 + Math.random() * (20 - 1) + 1;
        t.setPosition(x, y, z);
        meshEntity.placeable.transform = t;
        
        meshEntity.rigidbody.mass = 1.0;
        meshEntity.rigidbody.friction = 1.0;
        
        if (shape === "Box")
            meshEntity.rigidbody.shapeType = 0;
        else if (shape === "Capsule")
        {
            meshEntity.rigidbody.shapeType = 3;
            meshEntity.rigidbody.size = new THREE.Vector3(1, 2, 1);
        }
        else if (shape === "Cylinder")
            meshEntity.rigidbody.shapeType = 2;
        else if (shape === "sphere")
            meshEntity.rigidbody.shapeType = 1;
        else if (shape === "Cone")
            meshEntity.rigidbody.shapeType = 7;
        
        var fx = Math.random() * (25 - 1) + 1;
        var fy = Math.random() * (100 - 1) + 1;
        var fz = Math.random() * (25 - 1) + 1;
        meshEntity.rigidbody.applyForce(new THREE.Vector3(fx, fy, fz));
        meshEntity.rigidbody.applyTorgue(new THREE.Vector3(fx, fy, fz));
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
