ThreeView.prototype.OnAnimatorInitialize = function(threeParent, animComp) {

    var thisIsThis = this;
    var onAnimationAttributeChanged = function(changedAttr, changeType) {
        var id = changedAttr.id;
        if (id === "animationState")
            thisIsThis.onAnimatorAddedOrChanged(threeParent, animComp);
    };
    animComp.attributeChanged.remove(onAnimationAttributeChanged);
    animComp.attributeChanged.add(onAnimationAttributeChanged);

    animComp.parentEntity.actionFuntionMap = new Array();
    animComp.play = function(name, fadeInTime, crossFade, looped)
    {
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
    animComp.parentEntity.actionFuntionMap["PlayAnim"] = function(params, execType) {
        animComp.play(params[0], params[1], params[2], false);
    };

    animComp.playLooped = function(name, fadeInTime, crossFade)
    {
        animComp.play(name, fadeInTime, crossFade, true);
    };
    animComp.parentEntity.actionFuntionMap["PlayLoopedAnim"] = function(params, execType) {
        animComp.playLooped(params[0], params[1], params[2]);
    };

    animComp.stop = function(name, fadeoutTime) {
        //console.log("Stop animation " + name);
        var animation = animComp.animations[name];
        animation.fade_period = fadeoutTime !== undefined ? fadeoutTime : 0;
        animation.phase = AnimationPhase.PHASE_STOP;
        animComp.meshEntity().threeMesh.pose();
        
        if (animation !== undefined)
            animation.threeAnimation.stop(animation.fade_period);
    };
    animComp.parentEntity.actionFuntionMap["StopAnim"] = function(params, execType) {
        animComp.stop(params[0], params[1]);
    };

    animComp.stopAll = function(fadeoutTime) {
        fadeoutTime = Number(fadeoutTime);
        fadeoutTime = isNaN(fadeoutTime) ? 0 : fadeoutTime;
        for(var id in animComp.animations) {
            anim = animComp.animations[id];
            if (anim instanceof AnimationState)
                animComp.stop(anim.name, fadeoutTime);
        }
    };
    animComp.parentEntity.actionFuntionMap["StopAllAnims"] = function(params, execType) {
        animComp.stopAll(params[0]);
    };
    
    animComp.setAnimWeight = function(name, weight) {
        // Make sure that weight range is [1-0].
        weight = Math.min(Math.max(weight, 0), 1);
        console.log(weight);
        var animation = animComp.animations[name];
        if (animation !== undefined && weight !== undefined)
        {
            animation.weight = weight;
            animation.threeAnimation.weight = weight;
        }
    };
    animComp.parentEntity.actionFuntionMap["SetAnimWeight"] = function(params, execType) {
        animComp.setAnimWeight(params[0], params[1]);
    };

    animComp.update = function(deltaTime){
        for(var anim in animComp.animations) {
            check(anim instanceof AnimationState);
            if (typeof deltaTime !== 'number')
                deltaTime = this.clock.getDelta();
            anim.threeAnimation.update(deltaTime);
        }
    };
    
    animComp.setAnimSpeed = function(name, speed) {
        var animation = animComp.animations[name];
        if (animation !== undefined && speed !== undefined)
        {
            animation.threeAnimation.timeScale = speed;
            animation.speed_factor = speed;
        }
    };
    animComp.parentEntity.actionFuntionMap["SetAnimSpeed"] = function(params, execType) {
        animComp.setAnimSpeed(params[0], params[1]);
    };

    animComp.initialized = true;
};

ThreeView.prototype.onAnimatorAddedOrChanged = function(threeParent, animComp) {
    if (animComp.initialized === undefined){
        this.OnAnimatorInitialize(threeParent, animComp);
    }

    var mesh = animComp.meshEntity();
    if (mesh !== null && mesh.threeMesh !== undefined)
    {
        checkDefined(mesh, threeParent, animComp);
        var geometry = mesh.threeMesh.geometry;
        checkDefined(geometry);
        
        // Create Three animations and AnimationState objects.
        
        // In Three.js geometry.animations is used if model has more than
        // one skeletal animation otherwise gemetry.animation is used.
        
        if (geometry.animations !== undefined) {
            
            var animationInCache = false;
            var anim, threeAnim;
            for(var i = 0; i < geometry.animations.length; ++i){
                
                threeAnim = geometry.animations[i];
                //console.log(geometry);
                
                // Check if animation is already loaded to cache.
                animationInCache = THREE.AnimationHandler.get(threeAnim.name) !== null;
                
                
                anim = animComp.createAnimation(threeAnim.name);

                if (!animationInCache)
                    THREE.AnimationHandler.add(threeAnim);
                
                var a = new THREE.Animation(mesh.threeMesh, threeAnim.name);
                
                if (!animationInCache)
                    THREE.AnimationHandler.removeFromUpdate(threeAnim);

                anim.threeAnimation = a;
            }
        } else if (geometry.animation !== undefined){
            anim = animComp.createAnimation(geometry.animation.name);
            
            animationInCache = THREE.AnimationHandler.get(threeAnim.name) !== null;

            if (!animationInCache)
                THREE.AnimationHandler.add(geometry.animation);
            
            var a = new THREE.Animation(mesh.threeMesh, geometry.animation.name);
            
            if (!animationInCache)
                THREE.AnimationHandler.removeFromUpdate(geometry.animation);

            anim.threeAnimation = a;
        }
    }
    else
    {
        // If no mesh is being added we wait until it gets ready to use.
        var OnComponentAdded = function(newComp, changeType){
            if (newComp instanceof EC_Mesh)
                thisIsThis.onAnimatorAddedOrChanged(threeParent, animComp);
        };
        animComp.parentEntity.componentAdded.remove(OnComponentAdded);
        animComp.parentEntity.componentAdded.add(OnComponentAdded);
    }
};

ThreeView.prototype.onAnimatorRelease = function(entity, animComp) {
    
    var mesh = entity.componentByType("Mesh");
    if (mesh !== null)
        animComp.stopAll();
    
    //console.log(animComp);
    var anims = animComp.animations;
    for ( var i in anims ) {
        
        for ( var j in anims[i].threeAnimation ) {
        
            delete anims[i].threeAnimation[j];
            
        }
        
        delete anims[i].threeAnimation;
        
    }
    /*var animation = animComp.threeAnimation;
    if (animation !== undefined) {
        animation.stop();
    }
    delete animComp.threeAnimation;*/
};