var PhysicsApplication = ICameraApplication.$extend(
{
    __init__ : function()
    {
        this.$super("Physics");

        // Enables animations if both the previous and this camera entity is unparented
        this.animateBeforeActivation(true);
        
        this.showTooltip = TundraSDK.framework.frame.wallClockTime() + 3;
        this.tooltipVisible = false;
        
        this.demoApp = {
            origin: new THREE.Vector3(0, -10, -30),
            world : {},
            boxes : [],
            projectiles : [],
            
            createScene : function()
            {
                this.world["Ground"] = this._createMesh("Ground", "webtundra://plane.json");
                this.world["Ground"].name = "Ground";
                t = this.world["Ground"].placeable.transform;
                t.setPosition(this.origin.x, this.origin.y, this.origin.z);
                t.setScale(100, 2, 100);
                this.world["Ground"].placeable.transform = t;
                this.world["Ground"].rigidbody.mass = 0.0;
                
                this.world["Temp"] = this._createMesh("Temp", "webtundra://Box.json");
                this.world["Temp"].name = "Temp";
                t = this.world["Temp"].placeable.transform;
                t.setPosition(1000, 1000, 1000);
                this.world["Temp"].placeable.transform = t;
                
                this.world["Temp2"] = this._createMesh("Temp", "webtundra://Sphere.json");
                this.world["Temp2"].name = "Temp2";
                t = this.world["Temp2"].placeable.transform;
                t.setPosition(1000, 1000, 1000);
                this.world["Temp2"].placeable.transform = t;
                
                this.world["Temp"].removeComponent(this.world["Temp"].rigidbody.id);
                this.world["Temp2"].removeComponent(this.world["Temp2"].rigidbody.id);
                
                this.world["DirLight"] = new THREE.DirectionalLight();
                this.world["DirLight"].intensity = 0.5;
                TundraSDK.framework.client.renderer.scene.add(this.world["DirLight"]);
            },
            
            createBoxes : function()
            {
                var tiling = 4;
                var offset = -2 * tiling;
                
                for (var z = 0; z < 5; z++)
                {
                    for (var x = 0; x < 5; x++)
                    {
                        for (var y = 0; y < 5; y++)
                        {
                            var entity = this._createMesh("Box_" + x + "_" + y, "webtundra://Box.json");
                            var t = entity.placeable.transform;
                            t.setPosition(offset + this.origin.x + (x * tiling),
                                          this.origin.y + 2 + (z * tiling),
                                          offset + this.origin.z  + (y * tiling));
                            t.setScale(2, 2, 2);
                            entity.placeable.transform = t;
                            entity.rigidbody.mass = 5;
                            entity.rigidbody.size = new THREE.Vector3(1.4, 1.4, 1.4);
                            this.boxes.push(entity);
                        }
                    }
                }
            },
            
            release : function()
            {
                for (var i = 0; i < this.boxes.length; ++i)
                    TundraSDK.framework.scene.removeEntity(this.boxes[i].id);
                this.boxes = [];
                
                for (var i = 0; i < this.projectiles.length; ++i)
                    TundraSDK.framework.scene.removeEntity(this.projectiles[i].id);
                this.boxes = [];
            },
            
            fire : function(point, force)
            {
                var entity = this._createMesh("Shere_" + this.projectiles.length, "webtundra://Sphere.json");
                var t = entity.placeable.transform;
                t.setPosition(point.x, point.y + 20, point.z);
                t.setScale(3, 3, 3);
                entity.placeable.transform = t;
                entity.rigidbody.mass = 25;
                entity.rigidbody.size = new THREE.Vector3(1.4, 1.4, 1.4);
                entity.rigidbody.shapeType = 1;
                entity.rigidbody.linearVelocity = force;
                this.projectiles.push(entity);
            },
            
            _createMesh : function(name, ref)
            {
                var meshEntity = TundraSDK.framework.scene.createLocalEntity(["Name", "Placeable", "Mesh", "RigidBody"]);
                meshEntity.name = name;
                meshEntity.mesh.meshRef = ref;
                
                return meshEntity;
            }
        };
        
        this.demoApp.createScene();
        this.demoApp.createBoxes();
        
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
        
        if (TundraSDK.framework.frame.wallClockTime() >= this.showTooltip &&
            !this.tooltipVisible)
        {
            this.tooltipVisible = true;
            ICameraApplication.showCameraApplicationInfoTooltip("", 30000);
            ICameraApplication.cameraApplicationTooltip.text("R = Reset E = Spawn Projectile");
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
            else if (event.key == "r")
            {
                this.demoApp.release();
                this.demoApp.createBoxes();
            }
            else if (event.key == "e")
            {
                var trans = this.cameraEntity.placeable.transform;
                var quat = trans.orientation();
                var force = new THREE.Vector3(0, 0, -1);
                force.applyQuaternion(quat);
                force.multiplyScalar(75);
                var pos = trans.pos;
                pos.y = pos.y - 20;
                
                this.demoApp.fire(pos, force);
            }
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
