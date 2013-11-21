// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeScript = 5;

function EC_Script() {
    Component.call(this, cComponentTypeScript);
    this.addAttribute(cAttributeAssetReferenceList, "scriptRef", "Script ref");
    this.addAttribute(cAttributeBool, "runOnLoad", "Run on load", false);
    this.addAttribute(cAttributeInt, "runMode", "Run mode");
    this.addAttribute(cAttributeString, "applicationName", "Script application name");
    this.addAttribute(cAttributeString, "className", "Script class name");
}

EC_Script.prototype = new Component(cComponentTypeScript);

registerComponent(cComponentTypeScript, "Script", function(){ return new EC_Script(); });
