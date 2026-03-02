class Particle extends toxi.physics2d.VerletParticle2D {
  constructor(x, y) {
    super(x, y);
    physics.addParticle(this);
  }

  show() {
    fill(255);
    circle(this.x, this.y, 10);
  }
}
