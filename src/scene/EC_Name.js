// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeName = 26;

function EC_Name() {
    this.addAttribute(cAttributeString, "name", "Name");
    this.addAttribute(cAttributeString, "description", "Description");
    this.addAttribute(cAttributeString, "group", "Group");
}

EC_Name.prototype = new Component(cComponentTypeName);

registerComponent(cComponentTypeName, "Name", function(){ return new EC_Name(); });
