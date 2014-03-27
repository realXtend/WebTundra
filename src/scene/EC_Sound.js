// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeSound = 6;

function EC_Sound() {
    Component.call(this, cComponentTypeSound);
    this.addAttribute(Tundra.cAttributeAssetReference, "soundRef", "Sound ref");
    this.addAttribute(Tundra.cAttributeReal, "soundInnerRadius", "Sound radius inner", 0.0);
    this.addAttribute(Tundra.cAttributeReal, "soundOuterRadius", "Sound radius outer", 20.0);
    this.addAttribute(Tundra.cAttributeReal, "soundGain", "Sound gain", 1.0);
    this.addAttribute(Tundra.cAttributeBool, "playOnLoad", "Play on load", false);
    this.addAttribute(Tundra.cAttributeBool, "loopSound", "Loop sound", false);
    this.addAttribute(Tundra.cAttributeBool, "spatial", "Spatial", true);
}

EC_Sound.prototype = new Component(cComponentTypeSound);

registerComponent(cComponentTypeSound, "Sound", function(){ return new EC_Sound(); });
