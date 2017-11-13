class Layer {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.subdivisions = 1;
  }

  render(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    // ctx.strokeRect(this.x, this.y, this.width, this.height);

    const subWidth = this.width / this.subdivisions;
    for (let i = 0; i < this.subdivisions; i++) {
      ctx.strokeRect(this.x + i * subWidth, this.y, subWidth, this.height);
    }
    ctx.restore();
  }
}
