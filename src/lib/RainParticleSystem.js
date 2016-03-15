define([
        "lib/three"
    ], function(THREE) {

THREE.RainParticleSystem = function(options){
  this.opts = {
    size: 25,
    color: 0x111111,
    boxGeometry: {x:32, y:230, z:32},
    max_particles: 300,
    timeScale: 1
  };
  
  $.extend(this.opts, options);

  console.log("RainParticleSystem: ", this.opts);

  this.rainParticles = new THREE.Geometry;
  for (var i = 0; i < this.opts.max_particles; i++) {
      var particle = new THREE.Vector3(Math.random() * this.opts.boxGeometry.x - (this.opts.boxGeometry.x/2),
                                       Math.random() * this.opts.boxGeometry.y, 
                                       Math.random() * this.opts.boxGeometry.z - (this.opts.boxGeometry.z/2));
      this.rainParticles.vertices.push(particle);
  }

  this.rainTexture = THREE.ImageUtils.loadTexture('textures/rainparticle.png');
  this.rainMaterial = new THREE.PointCloudMaterial({
    map: this.rainTexture,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending, 
    depthWrite: false,
    sizeAttenuation: true,
    color: this.opts.color,
    size: this.opts.size,
  });

  // extend Object3D
  THREE.Object3D.apply(this, arguments);

  this.update = function(delta){
    var particleCount = this.rainParticles.vertices.length;
    while (particleCount--) {
        var particle = this.rainParticles.vertices[particleCount];
        particle.y -= delta * (this.opts.size/2) * this.opts.timeScale;
         
        if (particle.y <= 0) {
            particle.y = Math.random() * (this.opts.boxGeometry.y);
            particle.x = Math.random() * this.opts.boxGeometry.x - (this.opts.boxGeometry.x/2);
            particle.z = Math.random() * this.opts.boxGeometry.z - (this.opts.boxGeometry.z/2);
        }
    }
    this.rainParticles.verticesNeedUpdate = true;    
  }

  this.init = function(){
    this.rain = new THREE.PointCloud(this.rainParticles, this.rainMaterial);
    this.add(this.rain);
  }

  this.init();
}

THREE.RainParticleSystem.prototype = Object.create(THREE.Object3D.prototype);
THREE.RainParticleSystem.prototype.constructor = THREE.RainParticleSystem;

});