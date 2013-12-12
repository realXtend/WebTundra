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
    
    this.attributeChanged.add(this.checkParent.bind(this));
}

EC_Placeable.prototype = new Component(cComponentTypePlaceable);

EC_Placeable.prototype.checkParent = function(attr, changeType) {
    //console.log(this + " - " + this.parentRef + " : " + attr.id); // + " == " + this.parentRef.id);
    if (this.parentRef && attr.id == this.parentRef.id) {
        var parentRefVal = this.parentRef.value;
        console.log("parentRefVal: " + parentRefVal);
        if (parentRefVal) {
            var parentEnt = this.parentEntity.parentScene.entityById(parentRefVal);
            if (parentEnt && parentEnt.componentByType(cComponentTypePlaceable)) {
                console.log("placeable parent was there immediately");
                this.componentReady.dispatch();
                //XXX TODO: may break if the parent placeable is not ready yet
                //if there is a deeper hierarchy with multiple levels of parents
                //an ugly way to fix would be to add a 'ready' boolean.
                //same problem is in the waitParent case below
            } else {
                this.parentEntity.parentScene.entityCreated.add(this.waitParent);
            }
        } else {
            this.componentReady.dispatch();
        }
    }
}               

EC_Placeable.prototype.waitParent = function(addedEntity, changeType) {
    if (addedEntity.id === this.parentRef.id) {        
        console.log("placeable parent was there later");
        this.componentReady.dispatch();
        this.parentEntity.parentScene.entityCreated.remove(this.waitParent);
    }
}

registerComponent(cComponentTypePlaceable, "Placeable", function(){ return new EC_Placeable(); });
