const directions = {
  up:   Symbol('up'),
  down: Symbol('down')
};

export class Scroll {
  static get up()   { return directions.up; }
  static get down() { return directions.down; }

  constructor() {
    this.sensitivity = 0.5;
    this.valueAsFloat = 1.0;
    this.valueAsInt = Math.floor(this.valueAsFloat);
    this.range = 1;
    this.min = 0;
    this.max = Infinity;
    this.trackpad = true;
    this.direction = Scroll.up;
  }

  update(event) {
    const step = this.trackpad ? this.range * this.sensitivity : this.range;
    this.direction = event.wheelDelta > 0 ? Scroll.down : Scroll.up;
    this.valueAsFloat += this.direction === Scroll.down ? -step : step;
    this.valueAsInt = Math.floor(this.valueAsFloat);
  }
}
