// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeLight = 16;

Tundra.LT_Point = 0;
Tundra.LT_Spot = 1;
Tundra.LT_Directional = 2;

Tundra.EC_Light = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeLight);
    this.addAttribute(Tundra.cAttributeInt, "type", "Light type", Tundra.LT_Point);
    this.addAttribute(Tundra.cAttributeColor, "diffColor", "Diffuse color", {r: 1.0, g: 1.0, b: 1.0, a: 0.0});
    this.addAttribute(Tundra.cAttributeColor, "specColor", "Specular color", {r: 0.0, g: 0.0, b: 0.0, a: 0.0});
    this.addAttribute(Tundra.cAttributeBool, "castShadows", "Cast shadows", false);
    this.addAttribute(Tundra.cAttributeReal, "range", "Light range", 25.0);
    this.addAttribute(Tundra.cAttributeReal, "brightness", "Brightness", 1.0);
    this.addAttribute(Tundra.cAttributeReal, "constAtten", "Constant atten", 0.0);
    this.addAttribute(Tundra.cAttributeReal, "linearAtten", "Linear atten", 0.01);
    this.addAttribute(Tundra.cAttributeReal, "quadraAtten", "Quadratic atten", 0.01);
    this.addAttribute(Tundra.cAttributeReal, "innerAngle", "Light inner angle", 30.0);
    this.addAttribute(Tundra.cAttributeReal, "outerAngle", "Light outer angle", 40.0);
};

Tundra.EC_Light.prototype = new Tundra.Component(Tundra.cComponentTypeLight);

Tundra.registerComponent(Tundra.cComponentTypeLight, "Light", function(){ return new Tundra.EC_Light(); });
