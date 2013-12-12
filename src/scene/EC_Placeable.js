// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypePlaceable = 20;

function EC_Placeable() {
    Component.call(this, cComponentTypePlaceable);
    this.addAttribute(cAttributeTransform, "transform", "Transform");
    this.addAttribute(cAttributeBool, "drawDebug", "Show bounding box", false);
    this.addAttribute(cAttributeBool, "visible", "Visible", true);
    this.addAttribute(cAttributeInt, "selectionLayer", "Selection layer", 1);
    this.addAttribute(cAttributeEntityReference, "parentRef", "Parent entity ref");
    this.addAttribute(cAttributeString, "parentBone", "Parent bone name");

    this.attributeChanged.add(this.checkParent);
}

EC_Placeable.prototype = new Component(cComponentTypePlaceable);

EC_Placeable.prototype.checkParent = function(attr, changeType) {
    if (attr.typeId === this.parentRef.typeId) {
        var parentRefVal = placeable.parentRef.value;
        console.log("parentRef: " + parentRefVal);
        if (parentRefVal) {
            var parentEnt = this.parentScene.entityById[parentRefVal];
            if (parentEnt) {
                this.componentReady.dispatch();
            } else {
                this.parentEntity.parentScene.entityCreated.add(this.waitParent);
            }
        }
    }
}               

EC_Placeable.prototype.waitParent = function(addedEntity, changeType) {
    if (addedEntity.id === this.parentRef.value) {
        this.componentReady.dispatch();
        this.parentEntity.parentScene.entityCreated.remove(this.waitParent);
    }
}

registerComponent(cComponentTypePlaceable, "Placeable", function(){ return new EC_Placeable(); });
