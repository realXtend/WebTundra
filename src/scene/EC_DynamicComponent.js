// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeDynamicComponent = 25;

function EC_DynamicComponent() {
    Component.call(this, cComponentTypeDynamicComponent);
}

EC_DynamicComponent.prototype = new Component(cComponentTypeDynamicComponent);

registerComponent(cComponentTypeDynamicComponent, "DynamicComponent", function(){ return new EC_DynamicComponent(); });
