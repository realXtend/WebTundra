// For conditions of distribution and use, see copyright notice in LICENSE

Tundra.cComponentTypeCamera = 15;

Tundra.EC_Camera = function () {
    Tundra.Component.call(this, Tundra.cComponentTypeCamera);
    this.addAttribute(Tundra.cAttributeFloat3, "upVector", "Up vector", {x: 0.0, y: 1.0, z: 1.0});
    this.addAttribute(Tundra.cAttributeReal, "nearPlane", "Near plane", 0.1);
    this.addAttribute(Tundra.cAttributeReal, "farPlane", "Far plane", 2000.0);
    this.addAttribute(Tundra.cAttributeReal, "verticalFov", "Vertical FOV", 45.0);
    this.addAttribute(Tundra.cAttributeString, "aspectRatio", "Aspect ratio", "");
    
    this.setCameraActive = new signals.Signal();
}

Tundra.EC_Camera.prototype = new Tundra.Component(Tundra.cComponentTypeCamera);

Tundra.registerComponent(Tundra.cComponentTypeCamera, "Camera", function(){ return new Tundra.EC_Camera(); });
