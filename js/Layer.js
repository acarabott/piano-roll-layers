import { Rectangle } from './Rectangle.js';

export class Layer {
  constructor(x, y, width, height) {
    this.rect = new Rectangle(x, y, width, height);
    this.frame = this.rect;
    this._subdivision = 1;
    this.active = true;
    this.focused = false;
  }

  get rects() {
    const subWidth = this.rect.width / this.subdivision;
    return Array.from(Array(this.subdivision)).map((_, i ) => {
      const x = this.rect.x + (i * subWidth);
      return new Rectangle(x, this.rect.y, subWidth, this.rect.height);
    });
  }

  clone() {
    const clone = new Layer(...this.rect);
    clone.subdivision = this.subdivision;
    return clone;
  }

  set origin (point) {
    this.rect.tl = point;
  }

  get subdivision() {
    return this._subdivision;
  }

  set subdivision(subdivision) {
    this._subdivision = Math.max(1, subdivision);
  }
}
