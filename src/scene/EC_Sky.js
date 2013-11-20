// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeSky = 10;

function EC_Sky() {
    this.addAttribute(cAttributeAssetReference, "materialRef", "Material");
    this.addAttribute(cAttributeAssetReferenceList, "textureRefs", "Texture");
    this.addAttribute(cAttributeQuat, "orientation", "Orientation");
    this.addAttribute(cAttributeReal, "distance", "Distance", 999.0);
    this.addAttribute(cAttributeBool, "drawFirst", "Draw first", true);
    this.addAttribute(cAttributeBool, "enabled", "Enabled", true);
}

EC_Sky.prototype = new Component(cComponentTypeSky);

registerComponent(cComponentTypeSky, "Sky", function(){ return new EC_Sky(); });
