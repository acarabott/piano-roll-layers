export class Scroll {
  constructor() {
    this.sensitivity = 0.5;
    this.valueAsFloat = 1.0;
    this.valueAsInt = Math.floor(this.valueAsFloat);
    this.range = 1;
    this.min = 0;
    this.max = Infinity;
  }

  update(event) {
    const step = this.range * this.sensitivity;
    this.valueAsFloat += event.wheelDelta > 0 ? -step : step;
    this.valueAsInt = Math.floor(this.valueAsFloat);
  }
}
