ThreeView.prototype.OnAnimatorEntityAction = function(name, params, execType) {
    var sender = this;
    var call = sender.actionFuntionMap[name];
    if (typeof call === "function")
        call(params);
};

ThreeView.prototype.OnAnimatorInitialize = function(threeParent, animComp) {

    var thisIsThis = this;
    var onAnimationAttributeChanged = function(changedAttr, changeType) {
        var id = changedAttr.id;
        if (id === "animationState")
            thisIsThis.onAnimatorAddedOrChanged(threeParent, animComp);
    };
    animComp.attributeChanged.remove(onAnimationAttributeChanged);
    animComp.attributeChanged.add(onAnimationAttributeChanged);

    animComp.parentEntity.actionTriggered.add(this.OnAnimatorEntityAction.bind(animComp.parentEntity));

    animComp.parentEntity.actionFuntionMap = new Array();
    animComp.play = function(name, fadeInTime)
    {
        console.log("Play animation " + name);
        var animation = animComp.animations[name];
        animation.fade_period = fadeInTime !== undefined ? fadeInTime : 0;
        if (typeof(animation) !== 'undefined')
        {
            animation.threeAnimation.play(false, 0, animation.weight, animation.fade_period);
        }
    };
    animComp.parentEntity.actionFuntionMap["PlayAnim"] = function(params, execType) {
        animComp.play(params[0], params[1]);
    };

    animComp.playLooped = function(name, fadeInTime)
    {
        console.log("Play loop animation " + name);
        var animation = animComp.animations[name];
        animation.fade_period = fadeInTime !== undefined ? fadeInTime : 0;
        if (typeof(animation) !== 'undefined')
        {
            animation.threeAnimation.play(true, 0, animation.weight, animation.fade_period);
        }
    };
    animComp.parentEntity.actionFuntionMap["PlayLoopedAnim"] = function(params, execType) {
        animComp.playLooped(params[0], params[1]);
    };

    animComp.stop = function(name, fadeoutTime) {
        console.log("Stop animation " + name);
        var animation = animComp.animations[name];
        animation.fade_period = fadeoutTime !== undefined ? fadeoutTime : 0;
        if (typeof(animation) !== 'undefined')
            animation.threeAnimation.stop(animation.fade_period);
    };
    animComp.parentEntity.actionFuntionMap["StopAnim"] = function(params, execType) {
        animComp.stop(params[0], params[1]);
    };

    animComp.stopAll = function(fadeoutTime) {
        var anim;
        for(var id in animComp.animations) {
            anim = animComp.animations[id];
            if (anim !== undefined && typeof(anim) == 'AnimationState')
                anim.threeAnimation.stop();
        }
    };
    animComp.parentEntity.actionFuntionMap["StopAllAnims"] = function(params, execType) {
        animComp.stopAll(params[0]);
    };
    
    animComp.setAnimWeight = function(name, weight) {
        console.log("Set anim weight " + weight);
        var animation = animComp.animations[name];
        if (animation !== undefined && animation.weight !== undefined)
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

    animComp.initialized = true;
};

ThreeView.prototype.onAnimatorAddedOrChanged = function(threeParent, animComp) {
    if (typeof animComp.initialized === 'undefined'){
        this.OnAnimatorInitialize(threeParent, animComp);
    }

    var mesh = animComp.meshEntity();
    if (mesh !== null && typeof mesh.threeMesh !== 'undefined')
    {
        checkDefined(mesh, threeParent, animComp);
        var geometry = mesh.threeMesh.geometry;
        checkDefined(geometry);
        if (typeof geometry.animations !== 'undefined') {
            var anim, threeAnim;
            for(var i = 0; i < geometry.animations.length; ++i){
                threeAnim = geometry.animations[i];
                anim = animComp.createAnimation(threeAnim.name);

                THREE.AnimationHandler.add(threeAnim);
                var a = new THREE.Animation(mesh.threeMesh, threeAnim.name);
                THREE.AnimationHandler.removeFromUpdate(threeAnim);

                anim.threeAnimation = a;
            }
        } else if (typeof geometry.animation !== 'undefined'){
            anim = animComp.createAnimation(geometry.animation.name);

            THREE.AnimationHandler.add(geometry.animation);
            var a = new THREE.Animation(mesh.threeMesh, geometry.animation.name);
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

ThreeView.prototype.onAnimatorRemoved = function(threeParent, animComp) {
    var animation = animComp.threeAnimation;
    if (animation !== undefined) {
        animation.stop();
    }
};