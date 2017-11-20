export class Scroll {
  constructor() {
    this.sensitivity = 0.5;
    this.valueAsFloat = 1.0;
    this.valueAsInt = Math.floor(this.valueAsFloat);
    this.range = 1;
    this.min = 0;
    this.max = Infinity;
    this.trackpad = true;
  }

  update(event) {
    const step = this.trackpad ? this.range * this.sensitivity : this.range;
    this.valueAsFloat += event.wheelDelta > 0 ? -step : step;
    this.valueAsInt = Math.floor(this.valueAsFloat);
  }
}
