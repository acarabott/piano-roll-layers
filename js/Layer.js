import { Rectangle } from './Rectangle.js';

export class Layer {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this._subdivision = 1;
    this.active = true;
    this.grabbable = false;
    this.focused = false;
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
    this._subdivision = Math.max(1, subdivision);
  }
}
