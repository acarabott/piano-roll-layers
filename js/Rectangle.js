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

  get tr() {
    return new Point(this.x + this.width, this.y);
  }

  set tr(point) {
    this.width = point.x - this.x;
    this.y = point.y;
  }

  get bl() {
    return new Point(this.x, this.y + this.height);
  }

  set bl(point) {
    this.x = point.x;
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

  isPointInBoundsX(point, threshold = 0) {
    return point.x >= (this.x - threshold) && point.x <= (this.br.x + threshold);
  }

  isPointInBoundsY(point, threshold = 0) {
    return point.y >= (this.tl.y - threshold) && point.y <= (this.br.y + threshold);
  }

  isPointOnTopLine(point, threshold = 0) {
    return this.isPointInBoundsX(point, threshold) &&
           point.y >= this.tl.y - threshold && point.y <= this.tl.y + threshold;
  }

  isPointOnBottomLine(point, threshold = 0) {
    return this.isPointInBoundsX(point, threshold) &&
           point.y >= this.br.y - threshold && point.y <= this.br.y + threshold;
  }

  isPointOnLeftLine(point, threshold = 0) {
    return this.isPointInBoundsY(point, threshold) &&
           point.x >= this.tl.x - threshold && point.x <= this.tl.x + threshold;
  }

  isPointOnRightLine(point, threshold = 0) {
    return this.isPointInBoundsY(point, threshold) &&
           point.x >= this.br.x - threshold && point.x <= this.br.x + threshold;
  }


  isPointOnLine(point, threshold = 0) {
    return this.isPointOnTopLine(point, threshold) ||
           this.isPointOnBottomLine(point, threshold) ||
           this.isPointOnLeftLine(point, threshold) ||
           this.isPointOnRightLine(point, threshold);
  }

  isPointOnTopLeft(point, threshold = 0) {
    return this.isPointOnTopLine(point, threshold) &&
           this.isPointOnLeftLine(point, threshold);
  }

  isPointOnTopRight(point, threshold = 0) {
    return this.isPointOnTopLine(point, threshold) &&
           this.isPointOnRightLine(point, threshold);
  }

  isPointOnBottomLeft(point, threshold = 0) {
    return this.isPointOnBottomLine(point, threshold) &&
           this.isPointOnLeftLine(point, threshold);
  }

  isPointOnBottomRight(point, threshold = 0) {
    return this.isPointOnBottomLine(point, threshold) &&
           this.isPointOnRightLine(point, threshold);
  }

}
