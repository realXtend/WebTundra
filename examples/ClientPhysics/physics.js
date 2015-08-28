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
        
        this.nextRaycast = 0;
        
        this.createRate = 1;
        this.createBoxes = TundraSDK.framework.frame.wallClockTime() + this.createRate;
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
    
    Raycast : function(from, dir, distance)
    {
        result = TundraSDK.framework.physicsWorld.raycast(from, dir, distance);
        return result;
    },
    
    createScene : function()
    {
        var meshEntity = null;
        
        this.entities["Head"] = this.createMesh("Head", "webtundra://head.json");
        meshEntity = this.entities["Head"];
        meshEntity.name = "Head";
        t = meshEntity.placeable.transform;
        t.setPosition(0, -5, -63);
        t.setScale(5, 5, 5);
        t.setRotation(45, 0, 0);
        meshEntity.placeable.transform = t;
        meshEntity.rigidbody.mass = 0.0;
        meshEntity.rigidbody.shapeType = 4;
        
        this.entities["Ground"] = this.createMesh("Ground", "webtundra://plane.json");
        meshEntity = this.entities["Ground"];
        meshEntity.name = "Ground";
        t = meshEntity.placeable.transform;
        t.setPosition(0, -20, -50);
        t.setScale(200, 2, 200);
        meshEntity.placeable.transform = t;
        meshEntity.rigidbody.mass = 0.0;
        //meshEntity.rigidbody.shapeType = 4;
        
        shapes = ["Box", "Capsule", "Cylinder", "sphere", "Cone"];
        
        for (var i = 0; i < shapes.length; ++i)
        {
            var meshEntity = TundraSDK.framework.scene.createLocalEntity(["Name", "Placeable", "Mesh"]);
            meshEntity.name = name;
            meshEntity.mesh.meshRef = "webtundra://" + shapes[i] + ".json";
            meshEntity.placeable.setPosition(10000, 0, 0);
        }
        
        for (var i = 0; i < 3; ++i)
        {
            var shape = shapes[Math.floor(Math.random()*shapes.length)];
            var x = -10 + Math.random() * (20 - 1) + 1;
            var y = 30 + Math.random() * (20 - 1) + 1;
            var z = -70 + Math.random() * (20 - 1) + 1;
            this.spawnMesh(shape + " " + i, shape, new THREE.Vector3(x, y, z));
        }
        
        var dirLight = new THREE.DirectionalLight();
        dirLight.intensity = 0.5;
        TundraSDK.framework.client.renderer.scene.add(dirLight);
        
        this.ground = TundraSDK.framework.scene.entityByName("Ground");
        this.groundReady = false;
        
        //TundraSDK.framework.physicsWorld.maxSubSteps = 30;
        //TundraSDK.framework.physicsWorld.physicsUpdatePeriod = 1.0 / 60;
    },
    
    spawnMesh : function(id, shape, pos)
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
        t.setPosition(pos.x, pos.y, pos.z);
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
        
        meshEntity.rigidbody.onPhysicsCollision(this, function(self, other, position, normal, distance, impulse, newCollision)
        {
            if (other.name == "Ground")
            {
                TundraSDK.framework.scene.removeEntity(self.id);
            }
        });
        
        /*var fx = Math.random() * (25 - 1) + 1;
        var fy = Math.random() * (100 - 1) + 1;
        var fz = Math.random() * (25 - 1) + 1;
        meshEntity.rigidbody.applyForce(new THREE.Vector3(fx, fy, fz));
        meshEntity.rigidbody.applyTorgue(new THREE.Vector3(fx, fy, fz));*/
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
        
        /*if (this.ground.mesh.meshAsset &&
            !this.groundReady)
        {
            this.groundReady = true;
            var mat = new THREE.MeshPhongMaterial();
            mat.map = THREE.ImageUtils.loadTexture("ground.png");
            this.ground.mesh.meshAsset.getSubmesh(0).material = mat;
            this.ground.mesh.meshAsset.getSubmesh(0).material.needsUpdate = true;
        }*/
        
        if (TundraSDK.framework.frame.wallClockTime() >= this.createBoxes)
        {
            /*this.createBoxes = TundraSDK.framework.frame.wallClockTime() + this.createRate;
            var p = {x:0, y:0, z:0};
            for(var i = 0 ; i < 1; i++)
            {
                p.x = -10 + Math.random() * (50 - 1) + 1;
                p.y = 100;
                p.z = -70 + Math.random() * (50 - 1) + 1;

                result = this.Raycast(new THREE.Vector3(p.x, p.y, p.z), new THREE.Vector3(0, -1, 0), 1000);
                if (result)
                    console.log(result.entity.name);
            }*/
            
            this.createRate = Math.max(this.createRate * 0.9, 0.3);
            
            this.createBoxes = TundraSDK.framework.frame.wallClockTime() + this.createRate;
            shapes = ["Box", "Capsule", "Cylinder", "sphere", "Cone"];
            for (var i = 0; i < 1; ++i)
            {
                var shape = shapes[Math.floor(Math.random()*shapes.length)];
                var x = -10 + Math.random() * (20 - 1) + 1;
                var y = 30 + Math.random() * (20 - 1) + 1;
                var z = -70 + Math.random() * (20 - 1) + 1;
                this.spawnMesh(shape + " " + i, shape, new THREE.Vector3(x, y, z));
            }
        }
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
