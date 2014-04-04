// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeEnvironmentLight = 8;

Tundra.EC_EnvironmentLight = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeEnvironmentLight);
    this.addAttribute(Tundra.cAttributeColor, "sunColor", "Sunlight color");
    this.addAttribute(Tundra.cAttributeColor, "ambientColor", "Ambient light color");
    this.addAttribute(Tundra.cAttributeFloat3, "sunDirection", "Sunlight direction vector");
    this.addAttribute(Tundra.cAttributeBool, "sunCastShadows", "Sunlight cast shadows", true);
    this.addAttribute(Tundra.cAttributeReal, "brightness", "Brightness", 1.0);
};

Tundra.EC_EnvironmentLight.prototype = new Tundra.Component(Tundra.cComponentTypeEnvironmentLight);

Tundra.registerComponent(Tundra.cComponentTypeEnvironmentLight, "EnvironmentLight", function(){ return new Tundra.EC_EnvironmentLight(); });
