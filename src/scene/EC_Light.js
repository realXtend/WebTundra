var cComponentTypeLight = 16;

var LT_Point = 0, LT_Spot = 1, LT_Directional = 2;

function EC_Light() {
    Component.call(this, cComponentTypeLight);
    this.addAttribute(cAttributeInt, "type", "Light type", LT_Point);
    this.addAttribute(cAttributeColor, "diffColor", "Diffuse color", {r: 1.0, g: 1.0, b: 1.0, a: 0.0});
    this.addAttribute(cAttributeColor, "specColor", "Specular color", {r: 0.0, g: 0.0, b: 0.0, a: 0.0});
    this.addAttribute(cAttributeBool, "castShadows", "Cast shadows", false);
    this.addAttribute(cAttributeReal, "range", "Light range", 25.0);
    this.addAttribute(cAttributeReal, "brightness", "Brightness", 1.0);
    this.addAttribute(cAttributeReal, "constAtten", "Constant atten", 0.0);
    this.addAttribute(cAttributeReal, "linearAtten", "Linear atten", 0.01);
    this.addAttribute(cAttributeReal, "quadraAtten", "Quadratic atten", 0.01);
    this.addAttribute(cAttributeReal, "innerAngle", "Light inner angle", 30.0);
    this.addAttribute(cAttributeReal, "outerAngle", "Light outer angle", 40.0);
}

EC_Light.prototype = new Component(cComponentTypeLight);

registerComponent(cComponentTypeLight, "Light", function(){ return new EC_Light(); });
