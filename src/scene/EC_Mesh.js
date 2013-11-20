// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeMesh = 17;

function EC_Mesh() {
    this.addAttribute(cAttributeTransform, "nodeTransformation", "Transform");
    this.addAttribute(cAttributeAssetReference, "meshRef", "Mesh ref");
    this.addAttribute(cAttributeAssetReference, "skeletonRef", "Skeleton ref");
    this.addAttribute(cAttributeAssetReferenceList, "meshMaterial", "Mesh materials");
    this.addAttribute(cAttributeReal, "drawDistance", "Draw distance");
    this.addAttribute(cAttributeBool, "castShadows", "Cast shadows", false);
    this.addAttribute(cAttributeBool, "useInstancing", "Use instancing", false);
}

EC_Mesh.prototype = new Component(cComponentTypeMesh);

registerComponent(cComponentTypeMesh, "Mesh", function(){ return new EC_Mesh(); });
