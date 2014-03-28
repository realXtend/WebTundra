// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeSky = 10;

Tundra.EC_Sky = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeSky);
    this.addAttribute(Tundra.cAttributeAssetReference, "materialRef", "Material");
    this.addAttribute(Tundra.cAttributeAssetReferenceList, "textureRefs", "Texture");
    this.addAttribute(Tundra.cAttributeQuat, "orientation", "Orientation");
    this.addAttribute(Tundra.cAttributeReal, "distance", "Distance", 999.0);
    this.addAttribute(Tundra.cAttributeBool, "drawFirst", "Draw first", true);
    this.addAttribute(Tundra.cAttributeBool, "enabled", "Enabled", true);
};

Tundra.EC_Sky.prototype = new Tundra.Component(Tundra.cComponentTypeSky);

Tundra.registerComponent(Tundra.cComponentTypeSky, "Sky", function(){ return new Tundra.EC_Sky(); });
