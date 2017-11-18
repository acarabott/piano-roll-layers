import { Rectangle } from './Rectangle.js';

export class Layer {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this._subdivision = 1;
    this.active = true;
    this.highlight = false;
    this.subdivisionChanged = true;
  }

  render(ctx, style = 'rgba(0, 0, 0, 1.0)', width = 1) {
    if (!this.active) { return; }

    ctx.save();
    ctx.strokeStyle = style;

    // subdivisions
    ctx.lineWidth = width;
    this.rects.forEach((rect, i) => {
      ctx.strokeRect(...rect);
      ctx.fillStyle = style;
      const fontsize = 20;
      ctx.font = `${fontsize}px Monaco`;
      ctx.textAlign = 'center';
      ctx.fillText(i + 1, rect.x + rect.width / 2, rect.y + fontsize * 1.5);
    });

    // border
    ctx.lineWidth = width * 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    ctx.restore();
  }

  get rects() {
    const subWidth = this.width / this.subdivision;
    return Array.from(Array(this.subdivision)).map((_, i ) => {
      return new Rectangle(this.x + i * subWidth, this.y, subWidth, this.height);
    });
  }

  get frame() {
    return new Rectangle(this.x, this.y, this.width, this.height);
  }

  clone() {
    const clone = new Layer(this.x, this.y, this.width, this.height);
    clone.subdivision = this.subdivision;
    return clone;
  }

  set origin (point) {
    this.x = point.x;
    this.y = point.y;
  }

  get subdivision() {
    return this._subdivision;
  }

  set subdivision(subdivision) {
    this.subdivisionChanged = true;
    this._subdivision = Math.max(1, subdivision);
  }
}
