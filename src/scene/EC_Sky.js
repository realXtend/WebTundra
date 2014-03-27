// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeSky = 10;

function EC_Sky() {
    Tundra.Component.call(this, cComponentTypeSky);
    this.addAttribute(Tundra.cAttributeAssetReference, "materialRef", "Material");
    this.addAttribute(Tundra.cAttributeAssetReferenceList, "textureRefs", "Texture");
    this.addAttribute(Tundra.cAttributeQuat, "orientation", "Orientation");
    this.addAttribute(Tundra.cAttributeReal, "distance", "Distance", 999.0);
    this.addAttribute(Tundra.cAttributeBool, "drawFirst", "Draw first", true);
    this.addAttribute(Tundra.cAttributeBool, "enabled", "Enabled", true);
}

EC_Sky.prototype = new Tundra.Component(cComponentTypeSky);

Tundra.registerComponent(cComponentTypeSky, "Sky", function(){ return new EC_Sky(); });
