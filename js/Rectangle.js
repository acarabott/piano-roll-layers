class Rectangle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get tl() {
    return [this.x, this.y];
  }

  get br() {
    return [this.x + this.width, this.y + this.height];
  }
}
