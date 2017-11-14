/* global Rectangle */

class Layer {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.subdivision = 1;
    this.active = true;
  }

  render(ctx) {
    if (!this.active) { return; }
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    // ctx.strokeRect(this.x, this.y, this.width, this.height);

    const subWidth = this.width / this.subdivision;
    for (let i = 0; i < this.subdivision; i++) {
      ctx.strokeRect(this.x + i * subWidth, this.y, subWidth, this.height);
    }
    ctx.restore();
  }

  get rects() {
    const subWidth = this.width / this.subdivision;
    return Array.from(Array(this.subdivision)).map((_, i ) => {
      return new Rectangle(this.x + i * subWidth, this.y, subWidth, this.height);
    });
  }
}
