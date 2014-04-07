// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeScript = 5;

Tundra.EC_Script = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeScript);
    this.addAttribute(Tundra.cAttributeAssetReferenceList, "scriptRef", "Script ref");
    this.addAttribute(Tundra.cAttributeBool, "runOnLoad", "Run on load", false);
    this.addAttribute(Tundra.cAttributeInt, "runMode", "Run mode");
    this.addAttribute(Tundra.cAttributeString, "applicationName", "Script application name");
    this.addAttribute(Tundra.cAttributeString, "className", "Script class name");
};

Tundra.EC_Script.prototype = new Tundra.Component(Tundra.cComponentTypeScript);

Tundra.registerComponent(Tundra.cComponentTypeScript, "Script", function(){ return new Tundra.EC_Script(); });
