export class Point {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }

  *[Symbol.iterator]() { yield this.x; yield this.y; }

  set(point) {
    this.x = point.x;
    this.y = point.y;
  }

  add(point) {
    return new Point(this.x + point.x, this.y + point.y);
  }

  subtract(point) {
    return new Point(this.x - point.x, this.y - point.y);
  }

  addVal(val) {
    return new Point(this.x + val, this.y + val);
  }

  subtractVal(val) {
    return new Point(this.x - val, this.y - val);
  }

  equalTo(point, thresh = 0) {
    return Math.abs(this.x - point.x) <= thresh  &&
           Math.abs(this.y - point.y) <= thresh;
  }

  lessOrEqualTo(point) {
    return this.x <= point.x && this.y <= point.y;
  }

  greaterOrEqualTo(point) {
    return this.x >= point.x && this.y >= point.y;
  }

  lessThan(point) {
    return this.x < point.x && this.y < point.y;
  }

  greaterThan(point) {
    return this.x > point.x && this.y > point.y;
  }

  eitherLessThan(point) {
    return this.x < point.x || this.y < point.y;
  }

  eitherGreaterThan(point) {
    return this.x > point.x || this.y > point.y;
  }

  eitherLessThanOrEqualTo(point) {
    return this.x <= point.x || this.y <= point.y;
  }

  eitherGreaterThanOrEqualTo(point) {
    return this.x >= point.x || this.y >= point.y;
  }

  manhattanDistanceTo(point) {
    return Math.abs(this.x - point.x) + Math.abs(this.y + point.y);
  }

  euclideanDistanceTo(point) {
    const distX = Math.abs(this.x - point.x);
    const distY = Math.abs(this.y - point.y);
    return Math.sqrt(Math.pow(distX, 2) + Math.pow(distY, 2));
  }

  // return whichever point is 'greater' (both vals must be greater)
  minPoint(point) {
    return this.lessOrEqualTo(point) ? this : point;
  }

  // return whichever point is 'less' (both vals must be less)
  maxPoint(point) {
    return this.greaterOrEqualTo(point) ? this : point;
  }

  // return a new point with the min x and y of both points
  min(point) {
    return new Point(Math.min(this.x, point.x), Math.min(this.y, point.y));
  }

  // return a new point with the max x and y of both points
  max(point) {
    return new Point(Math.max(this.x, point.x), Math.max(this.y, point.y));
  }
}
