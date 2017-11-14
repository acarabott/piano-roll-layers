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

  render(ctx, style = 'rgba(0, 0, 0, 1.0)', width = 1) {
    if (!this.active) { return; }
    ctx.save();
    ctx.strokeStyle = style;

    // border
    // ctx.lineWidth = width ;
    // ctx.strokeRect(this.x, this.y, this.width, this.height);

    // subdivisions
    ctx.lineWidth = width;
    this.rects.forEach(rect => {
      ctx.strokeRect(...rect);
    });


    // border
    // ctx.setLineDash([20, 10]);
    ctx.lineWidth = width * 4;
    // ctx.strokeStyle = 'rgb(255, 0, 0)';
    ctx.strokeRect(this.x, this.y, this.width, this.height);


    ctx.restore();
  }

  get rects() {
    const subWidth = this.width / this.subdivision;
    return Array.from(Array(this.subdivision)).map((_, i ) => {
      return new Rectangle(this.x + i * subWidth, this.y, subWidth, this.height);
    });
  }
}
