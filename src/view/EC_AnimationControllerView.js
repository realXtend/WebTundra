ThreeView.prototype.OnAnimatorInitialize = function( threeParent, animComp ) {

    var thisIsThis = this;
    
    var onAnimationAttributeChanged = function ( changedAttr, changeType ) {
        
        var id = changedAttr.id;
        if (id === "animationState")
            thisIsThis.onAnimatorAddedOrChanged(threeParent, animComp);
        
    };
    animComp.attributeChanged.remove(onAnimationAttributeChanged);
    animComp.attributeChanged.add(onAnimationAttributeChanged);
    
    animComp.parentEntity.actionFuntionMap = new Array();
    animComp.play = AnimationController_play;
    animComp.parentEntity.actionFuntionMap["PlayAnim"] = function(params, execType) {
        
        params.push(false);
        animComp.play.apply(animComp, params);
        
    };

    animComp.playLooped = AnimationController_playLooped;
    animComp.parentEntity.actionFuntionMap["PlayLoopedAnim"] = function(params, execType) {
        
        animComp.playLooped.apply(animComp, params);
        
    };

    animComp.stop = AnimationController_stop;
    animComp.parentEntity.actionFuntionMap["StopAnim"] = function(params, execType) {
        
        animComp.stop.apply(animComp, params);
        
    };

    animComp.stopAll = AnimationController_stopAll;
    animComp.parentEntity.actionFuntionMap["StopAllAnims"] = function(params, execType) {
        
        animComp.stopAll.apply(animComp, params);
        
    };
    
    animComp.setAnimWeight = AnimationController_update;
    animComp.parentEntity.actionFuntionMap["SetAnimWeight"] = function(params, execType) {
        
        animComp.setAnimWeight.apply(animComp, params);
        
    };

    animComp.update = AnimationController_update;
    
    animComp.setAnimSpeed = AnimationController_setAnimSpeed;
    animComp.parentEntity.actionFuntionMap["SetAnimSpeed"] = function(params, execType) {
        
        animComp.setAnimSpeed.apply(animComp, params);
        
    };

    animComp.initialized = true;
};

ThreeView.prototype.onAnimatorAddedOrChanged = function( threeParent, animComp ) {
    
    if ( animComp.initialized === undefined ){
        
        this.OnAnimatorInitialize(threeParent, animComp);
        
    }

    var mesh = animComp.meshEntity();
    if ( mesh !== null && mesh.threeMesh !== undefined ) {
        
        checkDefined(mesh, threeParent, animComp);
        var geometry = mesh.threeMesh.geometry;
        checkDefined(geometry);
        
        // Create Three animations and AnimationState objects.
        
        // In Three.js geometry.animations is used if model has more than
        // one skeletal animation otherwise gemetry.animation is used.
        
        if ( geometry.animations !== undefined ) {
            
            var animationInCache = false;
            var anim, threeAnim;
            for( var i = 0; i < geometry.animations.length; ++i ) {
                
                threeAnim = geometry.animations[i];
                
                // Check if animation is already loaded to cache.
                animationInCache = THREE.AnimationHandler.get(threeAnim.name) !== null;
                
                anim = animComp.createAnimation(threeAnim.name);

                if ( !animationInCache )
                    THREE.AnimationHandler.add(threeAnim);
                
                var a = new THREE.Animation(mesh.threeMesh, threeAnim.name);
                
                if ( !animationInCache )
                    THREE.AnimationHandler.removeFromUpdate(threeAnim);

                anim.threeAnimation = a;
                
            }
            
        } else if ( geometry.animation !== undefined ) {
            
            anim = animComp.createAnimation(geometry.animation.name);
            animationInCache = THREE.AnimationHandler.get(threeAnim.name) !== null;

            if ( !animationInCache )
                THREE.AnimationHandler.add(geometry.animation);
            
            var a = new THREE.Animation(mesh.threeMesh, geometry.animation.name);
            
            if ( !animationInCache )
                THREE.AnimationHandler.removeFromUpdate(geometry.animation);

            anim.threeAnimation = a;
        }
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
    
    var mesh = entity.componentByType("Mesh");
    if (mesh !== null)
        animComp.stopAll();
    
    var anims = animComp.animations;
    for ( var i in anims ) {
        
        for ( var j in anims[i].threeAnimation ) {
        
            delete anims[i].threeAnimation[j];
            
        }
        
        delete anims[i].threeAnimation;
        
    }
    
    for ( var i = 0; i < animComp.entityActions.length; ++i )
        delete entity.actionFuntionMap[animComp.entityActions[i]];

};

var AnimationController_play = function(name, fadeInTime, crossFade, looped) {
    
    var animComp = this;
    var animation = animComp.animations[name];
    animation.fade_period = fadeInTime !== undefined ? fadeInTime : 0;
    animation.phase = AnimationPhase.PHASE_PLAY;

    if (crossFade)
    {
        var tAnim = null;
        for(var i = 0; i < animComp.animations.length; ++i) {
            tAnim = animComp.animations[i];
            if (tAnim.name !== name && tAnim.threeAnim.isPlaying === true)
                animComp.stop(tAnim.name, animation.fade_period);
        }
    }

    if (animation !== undefined)
    {
        animation.threeAnimation.loop = looped;
        animation.threeAnimation.play(0, animation.weight, animation.fade_period);
    }
        
};

var AnimationController_playLooped = function(name, fadeInTime, crossFade) {
    
    var animComp = this;
    animComp.play(name, fadeInTime, crossFade, true);
        
};

var AnimationController_stop = function(name, fadeoutTime) {
    
    var animComp = this;
    var animation = animComp.animations[name];
    animation.fade_period = fadeoutTime !== undefined ? fadeoutTime : 0;
    animation.phase = AnimationPhase.PHASE_STOP;
    animComp.meshEntity().threeMesh.pose();

    if (animation !== undefined)
        animation.threeAnimation.stop(animation.fade_period);
        
};

var AnimationController_stopAll = function ( fadeoutTime ) {
    
    var animComp = this;
    fadeoutTime = Number(fadeoutTime);
    fadeoutTime = isNaN(fadeoutTime) ? 0 : fadeoutTime;
    for(var id in animComp.animations) {
        
        anim = animComp.animations[id];
        if (anim instanceof AnimationState)
            animComp.stop(anim.name, fadeoutTime);
        
    }
        
};
    
var AnimationController_setAnimWeight = function( name, weight ) {
    
    var animComp = this;
    // Make sure that weight range is [1-0].
    weight = Math.min(Math.max(weight, 0), 1);
    var animation = animComp.animations[name];
    
    if ( animation !== undefined && animation.threeAnimation !== undefined )
    {
        
        animation.weight = weight;
        animation.threeAnimation.weight = weight;
    
    }
        
};

var AnimationController_update = function( deltaTime ) {
    
    var animComp = this;
    for(var anim in animComp.animations) {
        
        if (animComp.animations[anim] instanceof AnimationState)
            animComp.animations[anim].threeAnimation.update(deltaTime);
        
    }
    
};
    
var AnimationController_setAnimSpeed = function( name, speed ) {
    
    var animComp = this;
    var animation = animComp.animations[name];
    
    if ( animation !== undefined && speed !== undefined ) {
        
        animation.threeAnimation.timeScale = speed;
        animation.speed_factor = speed;

    }
    
};