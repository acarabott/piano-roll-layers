export class Point {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }

  *[Symbol.iterator]() { yield this.x; yield this.y; }

  add(point) {
    return new Point(this.x + point.x, this.y + point.y);
  }

  subtract(point) {
    return new Point(this.x - point.x, this.y - point.y);
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
    if (distX > 0 || distY > 0) { console.log('distX, distY:', distX, distY);}
    return Math.sqrt(Math.pow(distX, 2) + Math.pow(distY, 2));
  }
}
