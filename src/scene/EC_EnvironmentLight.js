// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeEnvironmentLight = 8;

function EC_EnvironmentLight() {
    Component.call(this, cComponentTypeEnvironmentLight);
    this.addAttribute(Tundra.cAttributeColor, "sunColor", "Sunlight color");
    this.addAttribute(Tundra.cAttributeColor, "ambientColor", "Ambient light color");
    this.addAttribute(Tundra.cAttributeFloat3, "sunDirection", "Sunlight direction vector");
    this.addAttribute(Tundra.cAttributeBool, "sunCastShadows", "Sunlight cast shadows", true);
    this.addAttribute(Tundra.cAttributeReal, "brightness", "Brightness", 1.0);
}

EC_EnvironmentLight.prototype = new Component(cComponentTypeEnvironmentLight);

registerComponent(cComponentTypeEnvironmentLight, "EnvironmentLight", function(){ return new EC_EnvironmentLight(); });
