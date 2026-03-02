class Spring extends toxi.physics2d.VerletSpring2D {
  constructor(p1, p2, strength) {
    let length = dist(p1.x, p1.y, p2.x, p2.y);
    super(p1, p2, length, strength);
    physics.addSpring(this);
  }
}
