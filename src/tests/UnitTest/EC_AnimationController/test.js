// Run animation test data. Data was recorded at time of 0.1.
var animationData = {
    "hips":{"pos":{"x":-0.0134038,"y":4.4761992853748565,"z":-0.20005383920934272},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}},
    "spine":{"pos":{"x":0,"y":0.633603,"z":0.144693},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}},
    "chest":{"pos":{"x":0,"y":0.721509,"z":0.0639693},"rot":{"x":0.16928147003960198,"y":-2.8456378600799996e-9,"z":-2.349032594229304e-8},"scale":{"x":1,"y":1,"z":1}},
    "neck":{"pos":{"x":-1.22496e-15,"y":1.31012,"z":-0.0418847},"rot":{"x":-0.15627634095015244,"y":-3.299362157916e-9,"z":2.5079975204323854e-8},"scale":{"x":1,"y":1,"z":1}},
    "head":{"pos":{"x":0,"y":0.309956,"z":0.0163388},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}},
    "shoulder.L":{"pos":{"x":0.0696809,"y":0.760964,"z":0.26197},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}},
    "upper_arm.L":{"pos":{"x":1.00863,"y":-0.00731374,"z":-0.330257},"rot":{"x":0.9598402236168864,"y":-0.05082199574290329,"z":-1.1485383658820223},"scale":{"x":1,"y":1,"z":1}},
    "forearm.L":{"pos":{"x":1.58581,"y":-0.0398455,"z":-0.0247755},"rot":{"x":-1.4226732501013024,"y":-1.161062132762889,"z":-1.023658512223566},"scale":{"x":1,"y":1,"z":1}},
    "hand.L":{"pos":{"x":1.37024,"y":0.0599375,"z":-0.0641709},"rot":{"x":-0.17090279528717076,"y":-0.4447562535623204,"z":-0.03873368873841322},"scale":{"x":1,"y":1,"z":1}},
    "shoulder.R":{"pos":{"x":-0.0428734,"y":0.760964,"z":0.26197},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}},
    "upper_arm.R":{"pos":{"x":-1.00863,"y":-0.00731374,"z":-0.330257},"rot":{"x":0.1431306200062073,"y":-0.06879286278934295,"z":1.2008501571167018},"scale":{"x":1,"y":1,"z":1}},
    "forearm.R":{"pos":{"x":-1.58581,"y":-0.0398455,"z":-0.0247755},"rot":{"x":-1.2719494584758235,"y":1.125007729835857,"z":0.8662814177208223},"scale":{"x":1,"y":1,"z":1}},
    "hand.R":{"pos":{"x":-1.37024,"y":0.0599375,"z":-0.0641709},"rot":{"x":-0.2619508236981917,"y":0.414390320167027,"z":0.18372229749772548},"scale":{"x":1,"y":1,"z":1}},
    "thigh.L":{"pos":{"x":0.52542,"y":-0.0523623,"z":0.170204},"rot":{"x":-0.6360035232258114,"y":2.187558137042836e-9,"z":-3.0933734764327412e-9},"scale":{"x":1,"y":1,"z":1}},
    "shin.L":{"pos":{"x":-0.0278269,"y":-1.84238,"z":0.157159},"rot":{"x":0.7324817501548851,"y":-0.010698683179348328,"z":0.006982663020931754},"scale":{"x":1,"y":1,"z":1}},
    "foot.L":{"pos":{"x":0.0143808,"y":-1.7765,"z":-0.178863},"rot":{"x":0.0891312304878422,"y":-0.014603235325286104,"z":0.01092630884621031},"scale":{"x":1,"y":1,"z":1}},
    "toe.L":{"pos":{"x":0,"y":-0.260827,"z":0.417324},"rot":{"x":-0.08255021350384525,"y":8.735717677296393e-9,"z":7.0558779702771764e-12},"scale":{"x":1,"y":1,"z":1}},
    "heel.L":{"pos":{"x":0.0143808,"y":-1.7765,"z":-0.178863},"rot":{"x":0.08913123051484778,"y":-0.014603252468176025,"z":0.010926299350251136},"scale":{"x":1,"y":1,"z":1}},
    "thigh.R":{"pos":{"x":-0.498613,"y":-0.0523623,"z":0.170204},"rot":{"x":0.08721088318422246,"y":1.78719861799019e-9,"z":-5.624335949948781e-9},"scale":{"x":1,"y":1,"z":1}},
    "shin.R":{"pos":{"x":0.0278269,"y":-1.84238,"z":0.157159},"rot":{"x":1.4146863555975058,"y":4.926010165259476e-8,"z":-1.2599131031332255e-8},"scale":{"x":1,"y":1,"z":1}},
    "foot.R":{"pos":{"x":-0.0143808,"y":-1.7765,"z":-0.178863},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}},
    "toe.R":{"pos":{"x":0,"y":-0.260827,"z":0.417324},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}},
    "heel.R":{"pos":{"x":-0.0143808,"y":-1.7765,"z":-0.178863},"rot":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1}}
};

var animationTest = {
    
    data: animationData,
    scene: null,
    entity: null,
    
    setup: function() {

        this.scene = app.dataConnection.scene;

        this.entity = this.scene.createEntity( 0 );
        this.entity.createComponent( 0, Tundra.cComponentTypePlaceable );
        
        var mesh = this.entity.createComponent(0, Tundra.cComponentTypeMesh);
        var ref = mesh.meshRef
        ref.ref = "Assets/robot.json";
        mesh.meshRef = ref;
        
        this.entity.createComponent(0, Tundra.cComponentTypeAnimation);
        
    },
    
    release: function()  {
        
        this.scene.removeEntity(this.entity.id);
        
        this.scene = null;
        this.entity = null;
        
    },
    
    
    test1: function() {
        
        var entity = this.entity;
        var animations = ["Run", "Walk", "Wave"];
        
        test("Validate animations", function() {
            
            ok(entity != null, "Parent entity created");

            ok(entity.mesh != null, 'Mesh component created.');
            
            ok(entity.mesh.skeleton != null, 'Skeleton created.');
            
            ok(entity.animationController != null, 'Animation controller component created.');
            
            var a;
            for(var i = 0; i < animations.length; ++i) {
                
                a = entity.animationController.animationState(animations[i]);
                ok(a != null, animations[i] + " AnimationState exists in animation controller.");
                
            }
            
        });

    },
    
    // Play animation and update animation time. Check skeleton transform after update.
    test2: function() {

        var entity = this.entity;
        var data = this.data;
        var skeleton = this.entity.mesh.skeleton;
        
        var compareVector = function( vector1, vector2, epsilon ) {
        
            if ( Math.abs(vector1.x - vector2.x) <= epsilon &&
                 Math.abs(vector1.y - vector2.y) <= epsilon &&
                 Math.abs(vector1.z - vector2.z) <= epsilon )
                 return true;
             console.log( "x:" + Math.abs(vector1.x - vector2.x) + " y:" + Math.abs(vector1.y - vector2.y) + " z:" + Math.abs(vector1.z - vector2.z) );
             return false;

        };
        
        test("Validate animation state and bone transform", function() {

            var animationState = entity.animationController.animationState("Run");
            ok(animationState.phase == Tundra.AnimationPhase.PHASE_STOP, "Animation phase is STOP");
            entity.animationController.play("Run");
            entity.animationController.setAnimSpeed("Run",2);
            ok(animationState.phase == Tundra.AnimationPhase.PHASE_PLAY, "Animation phase is PLAY");
            
            ok(Math.abs(animationState.weight - 1) <= 0.001, "AnimationState.weight is valid");
            ok(Math.abs(animationState.speed_factor - 2) <= 0.001, "AnimationState.speed_factor is valid");
            ok(Math.abs(animationState.fade_period - 0) <= 0.001, "AnimationState.fade_period is valid");
            
            entity.animationController.update(0.05);
            
            var match = true;
            var obj, bone;
            for(var i = 0; i < skeleton.bones.length; ++i) {
                
                bone = skeleton.bones[i];
                obj = data[skeleton.bones[i].name];
                if ( obj == null) {
                    
                    match = false;
                    break;
                    
                }
                
                if ( !compareVector( obj.pos, bone.getPosition(), 0.01 ) ||
                     !compareVector( obj.rot, bone.getRotation(), 0.01 ) ||
                     !compareVector( obj.scale, bone.getScale(), 0.01 )) {
                    
                    match = false;
                    break;
                    
                }
                
            }
            
            ok(match, "skeleton bone transform match");

        });

    }
};

function RunAnimationTest() {
  
    module("EC_AnimationController");
    
    animationTest.setup();

    animationTest.entity.mesh.meshAssetReady.add( function () {
        animationTest.test1();
        animationTest.test2();
    } );

    QUnit.moduleDone(function( details ) {
        animationTest.release();
        delete animationTest;
        delete animationData;
        TestCompleted.dispatch();
    });
    
}