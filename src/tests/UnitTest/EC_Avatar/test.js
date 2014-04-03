var avatarTestData = {
    name      : "TestAvatar",
    geometry  : "Assets/robot.json",

    transform :
    {
        pos: [0, 0, 0],
        rot: [0, 0, 0],
        scale: [1, 1, 1]
    },

    materials :
    [
        "test_material1",
        "test_material2"
    ],

    parts :
    [
        {
            name      : "Sword",
            geometry  : "Assets/Sword.json",

            transform :
            {
                pos: [0, 0, 0],
                rot: [0, 0, 0],
                scale: [1, 1, 1],
                parentBone: "hand.L"
            },

            materials :
            [
                "test_material1",
                "test_material2"
            ]
        },
        {
            name      : "Pants",
            geometry  : "Assets/robot_pants.json",

            transform :
            {
                pos: [0, 0, 0],
                rot: [0, 0, 0],
                scale: [1, 1, 1]
            }
        }
    ],

    animations :
    [
        {
            name : "Walk",
            src  : "stickman@walk.dae"
        },
        {
            name : "WaveHand",
            src  : "stickman@wavehand.dae"
        }
    ]
};

var avatarTest = {
    
    data: avatarTestData,
    avatar: null,
    scene: null,
    entity: null,
    
    setup: function() {

        this.scene = app.dataConnection.scene;

        this.entity = this.scene.createEntity( 0 );

        this.entity.createComponent( 0, Tundra.cComponentTypePlaceable );

        this.avatar = this.entity.createComponent( 0, Tundra.cComponentTypeAvatar );
        this.avatar.setupAppearance( this.data );
        
    },
    
    release: function()  {
        
        if (this.entity != null) {
            this.scene.removeEntity(this.entity.id);

            this.scene = null;
            this.entity = null;
            this.avatar = null;
        }
        
    },
    
    // Validate avatar parent child hierachy.
    test1: function() {
        
        var entity = this.entity;
        var data = this.data;
        
        test("Test parent child hierachy", function() {
            
            ok(entity != null, "Parent entity created");

            ok(entity.name === data.name, 'Parent entity "' + data.name + '" found');

            var children = [];
            for ( var i in data.parts )
                children.push( data.parts[i].name );

            ok(children.length === entity.children.length, "Check entity children count");

            var child = children.pop();
            while (child != null) {

                var found = false;
                for ( var i = 0; i < entity.children.length; ++i ) {
                    if (entity.children[i].name == child)
                        found = true;
                }
                ok(found, 'Child entity "' + child + '" found');

                child = children.pop();
            }
            
        });

    },
    
    // Validate avatar entity components from root entity and it's children.
    // Note! This test should get executed when EC_Avatar's "avatarLoaded" signal is tirggered.
    test2: function() {

        var entity = this.entity;
        var data = this.data;
        
        var checkEntity = function(entity, eData) {

            if ( eData.geometry ) {

                ok(entity.mesh != null, eData.name + " EC_Mesh created");
                ok(entity.mesh.meshRef.ref == eData.geometry, eData.name + " check mesh geometry reference");
                if (eData.transform.parentBone != null)
                    ok(entity.placeable.parentBone == eData.transform.parentBone, eData.name + " check parent bone reference");
                ok(entity.mesh.assetReady == true, eData.name + " mesh geometry asset loaded");

            }

            if ( eData.animations )
                ok(entity.animationController != null, eData.name + " EC_AnimationController created")

        };
        
        test("Test components", function() {

            ok(entity != null, "Parent entity created");

            // Check root entity
            checkEntity(entity, data);

            var children = data.parts;

            for (var j in children) {

                var childData = children[j];

                for ( var i = 0; i < entity.children.length; ++i ) {

                    if (entity.children[i].name == childData.name)
                        checkEntity(entity.children[i], childData);

                }
                
            }
            
        });
        
    }
};

function RunAvatarTest() {
  
    module("EC_Avatar");
    
    avatarTest.setup();

    avatarTest.test1();
    avatarTest.avatar.avatarLoaded.add( function () {
        avatarTest.test2();
    } );

    QUnit.moduleDone(function( details ) {
        
        var releaseTest = function() {
            avatarTest.release();
            delete avatarTest;
            delete avatarTestData;
            TestCompleted.dispatch();
        }
        
        window.setTimeout(releaseTest,500);
    });
    
}