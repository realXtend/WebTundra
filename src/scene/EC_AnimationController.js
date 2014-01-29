// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeAnimation = 14;

/// Enumeration of animation phase
var AnimationPhase = {
	PHASE_FADEIN : 0,
	PHASE_PLAY : 1,
	PHASE_FADEOUT: 2,
	PHASE_STOP : 3,
	PHASE_FREE : 4 //in external control. for dynamiccomponent testing now
};

function AnimationState() {
	/// Autostop at end (default false)
	this.auto_stop = false;
	
	/// Time in milliseconds it takes to fade in/out an animation completely
	this.fade_period = 0.0;

	/// Weight of an animation in animation blending, maximum 1.0
	this.weight = 0.0;

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
	this.animations = new Array();
	
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
		this.animations[name] = anim;
		return anim;
	};

	// Play animation
	/* @param {string} animation name
	 * @param {float} fadeInTime
	 */
	this.play = null;

	// Stop playing given animation
	/* @param {string} name Animation name
	 * @param {EC_Mesh} fadeoutTime how long it takes to fade out the animation.
	 */
	this.stop = null;

	// Stop all playing animations
	/* @param {float} fadeoutTime how long it takes to fade out the animations.
	 */
	this.stopAll = null;

	// Updates animation(s) by elapsed time
	/* @param deltaTime time elapse.
	 */
	this.update = null;
}

function interfaceMethod() {
	check(this instanceof Component);
	if (debugOnCheckFail) {
		debugger;
    } else {
		var name = arguments.callee.toString();
		name = name.substr('function '.length);
		name = name.substr(0, name.indexOf('('));
		throw (this.constructor.name + " is missing interface implementation of method \"" + name + "\"");
	}
}

EC_AnimationController.prototype = new Component(cComponentTypeAnimation);

registerComponent(cComponentTypeAnimation, "AnimationController", function(){ return new EC_AnimationController(); });