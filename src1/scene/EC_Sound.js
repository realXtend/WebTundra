// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeSound = 6;

Tundra.EC_Sound = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeSound);
    this.addAttribute(Tundra.cAttributeAssetReference, "soundRef", "Sound ref");
    this.addAttribute(Tundra.cAttributeReal, "soundInnerRadius", "Sound radius inner", 0.0);
    this.addAttribute(Tundra.cAttributeReal, "soundOuterRadius", "Sound radius outer", 20.0);
    this.addAttribute(Tundra.cAttributeReal, "soundGain", "Sound gain", 1.0);
    this.addAttribute(Tundra.cAttributeBool, "playOnLoad", "Play on load", false);
    this.addAttribute(Tundra.cAttributeBool, "loopSound", "Loop sound", false);
    this.addAttribute(Tundra.cAttributeBool, "spatial", "Spatial", true);
};

Tundra.EC_Sound.prototype = new Tundra.Component(Tundra.cComponentTypeSound);

Tundra.registerComponent(Tundra.cComponentTypeSound, "Sound", function(){ return new Tundra.EC_Sound(); });
