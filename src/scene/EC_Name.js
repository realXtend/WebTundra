// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeName = 26;

function EC_Name() {
    Component.call(this, cComponentTypeName);
    this.addAttribute(Tundra.cAttributeString, "name", "Name");
    this.addAttribute(Tundra.cAttributeString, "description", "Description");
    this.addAttribute(Tundra.cAttributeString, "group", "Group");
}

EC_Name.prototype = new Component(cComponentTypeName);

registerComponent(cComponentTypeName, "Name", function(){ return new EC_Name(); });
