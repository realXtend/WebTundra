define([
        "lib/three"
    ], function(THREE) {

THREE.SmokeParticleSystem = function(options){
  this.opts = {
    size: 50,
    color: 0x111111,
    boxGeometry: {x:32, y:230, z:32},
    max_particles: 300,
    timeScale: 1
  };
  
  $.extend(this.opts, options);

  console.log("SmokeParticleSystem: ", this.opts);

  this.smokeParticles = new THREE.Geometry;
  for (var i = 0; i < this.opts.max_particles; i++) {
      var particle = new THREE.Vector3(Math.random() * this.opts.boxGeometry.x - (this.opts.boxGeometry.x/2),
                                       Math.random() * this.opts.boxGeometry.y, 
                                       Math.random() * this.opts.boxGeometry.z - (this.opts.boxGeometry.z/2));
      this.smokeParticles.vertices.push(particle);
  }

  this.smokeTexture = THREE.ImageUtils.loadTexture('textures/smokeparticle.png');
  this.smokeMaterial = new THREE.PointCloudMaterial({
    map: this.smokeTexture,
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
    var particleCount = this.smokeParticles.vertices.length;
    while (particleCount--) {
        var particle = this.smokeParticles.vertices[particleCount];
        particle.y += delta * (this.opts.size/2) * this.opts.timeScale;
         
        if (particle.y >= this.opts.boxGeometry.y) {
            particle.y = Math.random() * (this.opts.boxGeometry.y);
            particle.x = Math.random() * this.opts.boxGeometry.x - (this.opts.boxGeometry.x/2);
            particle.z = Math.random() * this.opts.boxGeometry.z - (this.opts.boxGeometry.z/2);
        }
    }
    this.smokeParticles.verticesNeedUpdate = true;    
  }

  this.init = function(){
    this.smoke = new THREE.PointCloud(this.smokeParticles, this.smokeMaterial);
    this.add(this.smoke);
  }

  this.init();
}

THREE.SmokeParticleSystem.prototype = Object.create(THREE.Object3D.prototype);
THREE.SmokeParticleSystem.prototype.constructor = THREE.SmokeParticleSystem;

});