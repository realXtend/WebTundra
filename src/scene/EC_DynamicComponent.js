// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeDynamicComponent = 25;

function EC_DynamicComponent() {
    Tundra.Component.call(this, cComponentTypeDynamicComponent);
    this.supportsDynamicAttributes = true;
}

EC_DynamicComponent.prototype = new Tundra.Component(cComponentTypeDynamicComponent);

Tundra.registerComponent(cComponentTypeDynamicComponent, "DynamicComponent", function(){ return new EC_DynamicComponent(); });
