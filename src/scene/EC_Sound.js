var cComponentTypeSound = 6;
function EC_Sound() {
    Component.call(this, cComponentTypeSound);
    this.addAttribute(cAttributeAssetReference, "soundRef", "Sound ref");
    this.addAttribute(cAttributeReal, "soundInnerRadius", "Sound radius inner", 0.0);
    this.addAttribute(cAttributeReal, "soundOuterRadius", "Sound radius outer", 20.0);
    this.addAttribute(cAttributeReal, "soundGain", "Sound gain", 1.0);
    this.addAttribute(cAttributeBool, "playOnLoad", "Play on load", false);
    this.addAttribute(cAttributeBool, "loopSound", "Loop sound", false);
    this.addAttribute(cAttributeBool, "spatial", "Spatial", true);
}

EC_Sound.prototype = new Component(cComponentTypeSound);

registerComponent(cComponentTypeSound, "Sound", function(){ return new EC_Sound(); });
