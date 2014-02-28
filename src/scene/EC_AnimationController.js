// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeAnimation = 14;

/// Enumeration of animation phase
var AnimationPhase = {
    PHASE_FADEIN : 0,
    PHASE_PLAY : 1,
    PHASE_FADEOUT: 2,
    PHASE_STOP : 3,
    PHASE_FREE : 4 
};

function AnimationState() {
    /// Animation name.
    this.name = "";
    
    /// Autostop at end (default false)
    this.auto_stop = false;

    /// Time in milliseconds it takes to fade in/out an animation completely
    this.fade_period = 0.0;

    /// Weight of an animation in animation blending, maximum 1.0
    this.weight = 1.0;//0.0

    /// Weight adjust
    this.weight_factor = 1.0;

    /// How an animation is speed up or slowed down, default 1.0 (original speed)
    this.speed_factor = 1.0;

    /// loop animation through num_repeats times, or loop if zero
    this.num_repeats = 0;

    /// priority. high priority will reduce the weight of low priority animations, if exists on the same bone tracks
    this.priority = 0;

    /// current phase
    this.phase = AnimationPhase.PHASE_STOP;
};

function EC_AnimationController() {
    Component.call(this, cComponentTypeAnimation);
    this.addAttribute(cAttributeString, "animationState", "", "");
    this.addAttribute(cAttributeBool, "drawDebug", "", false);

    // Enity's mesh refernece.
    this.mesh = null;

    // Map of animations that have their name as variable id.
    this.animations = new Object;

    // Get and return a mesh component attached to entity.
    /* @returns {EC_Mesh} component if found otherwise returns a null.
     */
    this.meshEntity = function()
    {
        if (this.mesh === null)
            this.mesh = this.parentEntity.componentByType("Mesh");
        return this.mesh;
    };
    
    // Create new instance of AnimationState object and add it to animations map.
    /* @param {string} name animation name
     * @return {AnimationState} new animation state object.
     */
    this.createAnimation = function(name) {
        var anim = new AnimationState();
        anim.name = name;
        this.animations[name] = anim;
        return anim;
    };
    
    /*this.play = playFunction;
    this.playLooped = playLoopedFunction;
    this.stop = stopFunction;
    this.stopAll = stopAllFunction;
    this.update = updateFunction;
    this.setAnimWeight = setAnimWeightFunction;
    this.setAnimSpeed = setAnimSpeedFunction;*/
    
    // entityActions are use to relase actions when component is removed.
    this.entityActions = ["PlayAnim", "PlayLoopedAnim", "StopAnim", "StopAllAnims",
                          "SetAnimWeight", "SetAnimSpeed"];
}

// Play animation. If cross fade is set to true all playing animations are stopped
// and their fadeOutTime time is same as fadeInTime.
/* @param {string} animation name
 * @param {float} fadeInTime
 * @param {bool} crossFade
 * @param {bool} looped
 */
EC_AnimationController.prototype.playFunction = function ( name, fadeInTime, crossFade, looped ) {};

// Play in loop animation
/* @param {string} animation name
 * @param {float} fadeInTime
 * @param {bool} crossFade
 */
EC_AnimationController.prototype.playLoopedFunction = function ( name, fadeInTime, crossFade ) {};

// Stop playing given animation
/* @param {string} name Animation name
 * @param {float} fadeoutTime how long it takes to fade out the animation.
 */
EC_AnimationController.prototype.stopFunction = function ( name, fadeoutTime ) {};

// Stop all playing animations
/* @param {float} fadeoutTime how long it takes to fade out the animations.
 */
EC_AnimationController.prototype.stopAllFunction = function ( fadeoutTime ) {};

// Updates animation(s) by elapsed time
/* @param {float} deltaTime time elapse.
 */
EC_AnimationController.prototype.updateFunction = function ( deltaTime ) {};

/// Set new animation weight to animation
/*@param {string} name animation name.
 *@param {float} weight animation weight range [0-1].
 */
EC_AnimationController.prototype.setAnimWeightFunction = function ( name, weight ) {};

/// Implements the SetAnimSpeed action
/*
 * @param {string} name animation name
 * @param {float} speed animation playback speed if negative play backward.
 */
EC_AnimationController.prototype.setAnimSpeedFunction = function ( name, speed ) {};

EC_AnimationController.prototype = new Component(cComponentTypeAnimation);

registerComponent(cComponentTypeAnimation, "AnimationController", function(){ return new EC_AnimationController(); });