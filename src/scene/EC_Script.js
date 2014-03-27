// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeScript = 5;

function EC_Script() {
    Tundra.Component.call(this, cComponentTypeScript);
    this.addAttribute(Tundra.cAttributeAssetReferenceList, "scriptRef", "Script ref");
    this.addAttribute(Tundra.cAttributeBool, "runOnLoad", "Run on load", false);
    this.addAttribute(Tundra.cAttributeInt, "runMode", "Run mode");
    this.addAttribute(Tundra.cAttributeString, "applicationName", "Script application name");
    this.addAttribute(Tundra.cAttributeString, "className", "Script class name");
}

EC_Script.prototype = new Tundra.Component(cComponentTypeScript);

Tundra.registerComponent(cComponentTypeScript, "Script", function(){ return new EC_Script(); });
