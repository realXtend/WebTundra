var animationData = {};

var animationTest = {
    
    data: animationData,
    scene: null,
    entity: null,
    
    setup: function() {

        this.scene = dataConnection.scene;

        this.entity = this.scene.createEntity( 0 );
        this.entity.createComponent( 0, Tundra.cComponentTypePlaceable );
        console.log("this.entity");
        console.log(this.entity);
        
        var mesh = this.entity.createComponent(0, Tundra.cComponentTypeMesh);
        var ref = mesh.meshRef
        ref.ref = "EC_AnimationController/Assets/robot.json";
        mesh.meshRef = ref;
        
        this.entity.createComponent(0, Tundra.cComponentTypeAnimation);
        
    },
    
    release: function()  {
        
        this.scene = null;
        this.entity = null;
        
    },
    
    
    test1: function() {
        
        console.log(this.entity);
        var entity = this.entity;
        var animations = ["Run", "Walk", "Wave"];
        
        test("Validate animations", function() {
            
            ok(entity != null, "Parent entity created");

            ok(entity.mesh, 'Mesh component created.');
            
            ok(entity.animationController, 'Animation controller component created.');
            
            var a;
            for(var i = 0; i < animations.length; ++i) {
                
                a = entity.animationController.animationState(animations[i]);
                ok(a != null, animations[i] + " AnimationState exists in animation controller.");
                
            }
            
        });

    },
    
    // Validate avatar entity components from root entity and it's children.
    // Note! This test should get executed when EC_Avatar's "avatarLoaded" signal is tirggered.
    test2: function() {

        

    }
};

function RunAnimationTest() {
  
    module("EC_AnimationController");
    
    animationTest.setup();

    animationTest.entity.mesh.meshAssetReady.add( function () {
        animationTest.test1();
    } );

    QUnit.moduleDone(function( details ) {
        //animationTest.release();
        delete animationTest;
        delete animationData;
        TestCompleted.dispatch();
    });
    
}

addUnitTest(RunAnimationTest);