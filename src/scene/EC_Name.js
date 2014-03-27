// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeName = 26;

Tundra.EC_Name = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeName);
    this.addAttribute(Tundra.cAttributeString, "name", "Name");
    this.addAttribute(Tundra.cAttributeString, "description", "Description");
    this.addAttribute(Tundra.cAttributeString, "group", "Group");
};

Tundra.EC_Name.prototype = new Tundra.Component(Tundra.cComponentTypeName);

Tundra.registerComponent(Tundra.cComponentTypeName, "Name", function(){ return new Tundra.EC_Name(); });
