ThreeView.prototype.OnAnimatorInitialize = function( threeParent, animComp ) {
    
    animComp.attributeChanged.add(this.onAnimationAttributeChanged, this);
    
    animComp.parentEntity.actionFuntionMap = new Array();
    animComp.play = AnimationController_play;
    animComp.parentEntity.actionFuntionMap["PlayAnim"] = function(params, execType) {
        
        params.push(false);
        animComp.play.apply(animComp, params);
        
    };

    animComp.parentEntity.actionFuntionMap["PlayLoopedAnim"] = function(params, execType) {
        
        animComp.playLooped.apply(animComp, params);
        
    };

    animComp.stop = AnimationController_stop;
    animComp.parentEntity.actionFuntionMap["StopAnim"] = function(params, execType) {
        
        animComp.stop.apply(animComp, params);
        
    };

    animComp.parentEntity.actionFuntionMap["StopAllAnims"] = function(params, execType) {
        
        animComp.stopAll.apply(animComp, params);
        
    };
    
    animComp.setAnimWeight = AnimationController_setAnimWeight;
    animComp.parentEntity.actionFuntionMap["SetAnimWeight"] = function(params, execType) {
        
        animComp.setAnimWeight.apply(animComp, params);
        
    };

    animComp.update = AnimationController_update;
    
    animComp.setAnimSpeed = AnimationController_setAnimSpeed;
    animComp.parentEntity.actionFuntionMap["SetAnimSpeed"] = function(params, execType) {
        
        animComp.setAnimSpeed.apply(animComp, params);
        
    };
    
    animComp.createAnimations = AnimationController_createAnimations;
    animComp.removeMesh = AnimationController_removeMesh;

    animComp.initialized = true;
};

ThreeView.prototype.onAnimationAttributeChanged = function ( changedAttr, changeType ) {
        
    var id = changedAttr.id;
    if (id === "animationState")
        this.onAnimatorAddedOrChanged(threeParent, animComp);
        
};

ThreeView.prototype.onAnimatorAddedOrChanged = function( threeParent, animComp ) {
    
    if ( animComp.initialized === undefined ){
        
        this.OnAnimatorInitialize(threeParent, animComp);
        
    }

    var mesh = animComp.parentEntity.mesh;
    if ( mesh !== null && mesh.threeMesh !== undefined ) {
        
        animComp.addMesh( mesh );
        
    } else {
        
        // If no mesh is being added we wait until it gets ready to use.
        var OnComponentAdded = function(newComp, changeType) {
            
            if (newComp instanceof EC_Mesh)
                thisIsThis.onAnimatorAddedOrChanged(threeParent, animComp);
            
        };
        
        animComp.parentEntity.componentAdded.remove(OnComponentAdded);
        animComp.parentEntity.componentAdded.add(OnComponentAdded);
        
    }
    
};

ThreeView.prototype.onAnimatorRelease = function( entity, animComp ) {
    
    animComp.attributeChanged.remove(this.onAnimationAttributeChanged, this);
    
    if (entity.mesh !== undefined)
        animComp.stopAll();
    
    var meshInfo = animComp.animatingMeshes.pop();
    while ( meshInfo !== undefined ) {
        meshInfo.release();
        meshInfo = animComp.animatingMeshes.pop();
    }
    
    delete animComp.animatingMeshes;
    delete animComp.animations;
    
    for ( var i = 0; i < animComp.entityActions.length; ++i )
        delete entity.actionFuntionMap[animComp.entityActions[i]];

};

var AnimationController_play = function(name, fadeInTime, crossFade, looped) {
    
    var animation = this.animations[name];
    animation.fade_period = fadeInTime !== undefined ? fadeInTime : 0;

    if (crossFade) {
        
        var tAnim = null;
        for( var i in this.animations ) {
            
            tAnim = this.animations[i];
            if (tAnim.name !== name && tAnim.phase === AnimationPhase.PHASE_PLAY)
                this.stop(tAnim.name, animation.fade_period);
            
        }
        
    }

    animation.phase = AnimationPhase.PHASE_PLAY;
    if (animation !== undefined) {
        
        for ( var i in animation.threeAnimations ) {
            
            animation.threeAnimations[i].loop = looped;
            animation.threeAnimations[i].play(0, animation.weight, animation.fade_period);
            
        }
        
    }
        
};

var AnimationController_stop = function(name, fadeoutTime) {
    
    var animation = this.animationState( name );
    if ( animation !== undefined ) {

        animation.fade_period = fadeoutTime !== undefined ? fadeoutTime : 0;
        animation.phase = AnimationPhase.PHASE_STOP;

        for ( var i in animation.threeAnimations )
            animation.threeAnimations[i].stop(animation.fade_period);

    }
        
};
    
var AnimationController_setAnimWeight = function( name, weight ) {
    
    // Make sure that weight range is [1-0].
    weight = Math.min(Math.max(weight, 0), 1);
    var animation = this.animations[name];
    
    if ( animation !== undefined ) {
        
        console.log("Set weight " + weight);
        animation.weight = weight;
        for ( var i in animation.threeAnimations )
            animation.threeAnimations[i].weight = weight;
    
    }
        
};

var AnimationController_update = function( deltaTime ) {
    
    var animation;
    for( var i in this.animations ) {
        
        animation = this.animations[i];
        for ( var j in animation.threeAnimations )
            animation.threeAnimations[j].update(deltaTime);
        
    }
    
};
    
var AnimationController_setAnimSpeed = function( name, speed ) {
    
    var animation = this.animations[name];
    
    if ( animation !== undefined && speed !== undefined ) {
        
        animation.speed_factor = speed;
        for( var i in animation.threeAnimations )
            animation.threeAnimations[i].timeScale = speed;

    }
    
};

var AnimationController_createAnimations = function( mesh ) {
    
    checkDefined( mesh, mesh.threeMesh );
    var geometry = mesh.threeMesh.geometry;
    checkDefined(geometry);

    // Create Three animations and AnimationState objects.

    // In Three.js geometry.animations is used if model has more than
    // one skeletal animation otherwise gemetry.animation is used.

    var animations = GetAnimationsFromGeometry(geometry);

    for( var i = 0; i < animations.length; ++i ) {

        threeAnim = animations[i];

        // Check if animation is already loaded to cache.
        animationInCache = THREE.AnimationHandler.get(threeAnim.name) !== null;

        var anim = this.animationState(threeAnim.name);
        if (anim === null) {
            anim = this.createAnimation(threeAnim.name);
            anim.threeAnimations = {};
        }

        if ( !animationInCache )
            THREE.AnimationHandler.add(threeAnim);

        var a = new THREE.Animation(mesh.threeMesh, threeAnim.name);

        if ( !animationInCache )
            THREE.AnimationHandler.removeFromUpdate(threeAnim);

        anim.threeAnimations[mesh.parentEntity.id + ":" + mesh.id] = a;

    }

};

var AnimationController_removeMesh = function( mesh ) {
    
    EC_AnimationController.prototype.removeMesh.call( this, mesh );
    
    for ( var i in this.animations ) {
        
        if ( this.animations[i].threeAnimations[mesh.parentEntity.id + ":" + mesh.id] !== undefined ) {
            
            delete this.animations[i].threeAnimations[mesh.parentEntity.id + ":" + mesh.id];
            
        }

    }
};

function GetAnimationsFromGeometry ( geometry ) {
    
    // In Three.js geometry.animations is used if model has more than
    // one skeletal animation otherwise gemetry.animation is used.
    
    if ( geometry.animations !== undefined ) {
        
        return geometry.animations;
        
    } else {
        
        var animations = [];
        animation.push(geometry.animation);
        return animations;
        
    }
    
    return null;
};