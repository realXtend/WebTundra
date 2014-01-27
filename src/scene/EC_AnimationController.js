// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeAnimation = 14;

function EC_AnimationController() {
    Component.call(this, cComponentTypeAnimation);
    this.addAttribute(cAttributeString, "animationState", "", "");
    this.addAttribute(cAttributeBool, "drawDebug", "", false);
	this.mesh = null;
	
	// Get and return a mesh component attached to entity.
	/*
	 * 
	 * @returns {EC_Mesh} component if found otherwise returns a null.
	 */
	this.meshEntity = function()
	{
		if (this.mesh === null)
			this.mesh = this.parentEntity.componentByType("Mesh");
		return this.mesh;
	};

	// Play animation
	/*
	 * 
	 * @param {string} animation name
	 */
	this.play = interfaceMethod;

	// Stop playing given animation
	/* @param {string} name Animation name
	 * @param {EC_Mesh} fadeOutTime how long it takes to fade out the animation.
	 */
	this.stop = interfaceMethod;

	// Stop all playing animations
	/* 
	 * 
	 * @param {float} fadeOutTime how long it takes to fade out the animations.
	 */
	this.stopAll = interfaceMethod;

	// Updates animation(s) by elapsed time
	/* @param deltaTime time elapse.
	 */
	this.update = interfaceMethod;
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