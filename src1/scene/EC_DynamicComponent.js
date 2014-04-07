// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeDynamicComponent = 25;

Tundra.EC_DynamicComponent = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeDynamicComponent);
    this.supportsDynamicAttributes = true;
};

Tundra.EC_DynamicComponent.prototype = new Tundra.Component(Tundra.cComponentTypeDynamicComponent);

Tundra.registerComponent(Tundra.cComponentTypeDynamicComponent, "DynamicComponent", function(){ return new Tundra.EC_DynamicComponent(); });
