import { Point } from './Point.js';

export class Rectangle {
  constructor(x=0, y=0, width=0, height=0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  static fromPoints(tl, br) {
    return new Rectangle(...tl, br.x - tl.x, br.y - tl.y);
  }

  get tl() {
    return new Point(this.x, this.y);
  }

  set tl(point) {
    this.x = point.x;
    this.y = point.y;
  }

  get br() {
    return new Point(this.x + this.width, this.y + this.height);
  }

  set br(point) {
    this.width = point.x - this.x;
    this.height = point.y - this.y;
  }

  *[Symbol.iterator]() {
    yield this.tl.x;
    yield this.tl.y;
    yield this.width;
    yield this.height;
  }

  get drawRect() { return [...this.tl, this.width, this.height]; }

  containsPoint(point, thresh = 0) {
    if (thresh === 0) {
      return point.greaterOrEqualTo(this.tl) && point.lessOrEqualTo(this.br);
    }

    const threshTl = new Point(this.tl.x - thresh, this.tl.y - thresh);
    const ThreshBr = new Point(this.br.x + thresh, this.br.y + thresh);
    return point.greaterOrEqualTo(threshTl) && point.lessOrEqualTo(ThreshBr);
  }

  containsRect(rect) {
    return this.containsPoint(rect.tl) && this.containsPoint(rect.br);
  }

  containsPartialRect(rect) {
    return this.containsPoint(rect.tl) || this.containsPoint(rect.br);
  }

  isPointOnLine(point, threshold = 1) {
    const inX = point.x >= this.x && point.x <= this.br.x;
    const inY = point.y >= this.tl.y && point.y <= this.br.y;

    const onTop =    Math.abs(point.y - this.y) <= threshold && inX;
    const onRight =  Math.abs(point.x - this.br.x) <= threshold && inY;
    const onBottom = Math.abs(point.y - this.br.y) <= threshold && inX;
    const onLeft =   Math.abs(point.x - this.x) <= threshold && inY;

    return onTop || onRight || onBottom || onLeft;
  }
}
