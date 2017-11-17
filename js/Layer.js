import { Rectangle } from './Rectangle.js';

export class Layer {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.subdivision = 1;
    this.active = true;
    this.highlight = false;
  }

  render(ctx, style = 'rgba(0, 0, 0, 1.0)', width = 1) {
    if (!this.active) { return; }

    const widthMultiplier = this.highlight ? 2 : 1;
    ctx.save();
    ctx.strokeStyle = style;

    // border
    // ctx.lineWidth = width ;
    // ctx.strokeRect(this.x, this.y, this.width, this.height);

    // subdivisions
    ctx.lineWidth = width * widthMultiplier;
    this.rects.forEach((rect, i) => {
      ctx.strokeRect(...rect);
      ctx.fillStyle = style;
      const fontsize = 20;
      ctx.font = `${fontsize}px Monaco`;
      ctx.textAlign = 'center';
      ctx.fillText(i + 1, rect.x + rect.width / 2, rect.y + fontsize * 1.5);
    });


    // border
    // ctx.setLineDash([20, 10]);
    ctx.lineWidth = width * widthMultiplier * 4;
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
}
