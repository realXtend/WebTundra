// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypePlaceable = 20;

function EC_Placeable() {
    this.addAttribute(cAttributeTransform, "transform", "Transform");
    this.addAttribute(cAttributeBool, "drawDebug", "Show bounding box", false);
    this.addAttribute(cAttributeBool, "visible", "Visible", true);
    this.addAttribute(cAttributeInt, "selectionLayer", "Selection layer", 1);
    this.addAttribute(cAttributeEntityReference, "parentRef", "Parent entity ref");
    this.addAttribute(cAttributeString, "parentBone", "Parent bone name");
}

EC_Placeable.prototype = new Component(cComponentTypePlaceable);

registerComponent(cComponentTypePlaceable, "Placeable", function(){ return new EC_Placeable(); });
