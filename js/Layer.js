export class Layer {
  // freqStart is the lower frequency, freqStop is the higher
  // in terms of a rectangle freqStart is the bottom, freqStop is the top
  constructor(freqStart, freqStop, timeStart, timeStop) {
    this.set(freqStart, freqStop, timeStart, timeStop);
    this._subdivision = 1;
    this.active = true;
    this.focused = false;
  }

  set(freqStart, freqStop, timeStart, timeStop) {
    this.freqStart = freqStart;
    this.freqStop = freqStop;
    this.timeStart = timeStart;
    this.timeStop = timeStop;
  }

  clone() {
    const clone = new Layer(this.freqStart, this.freqStop, this.timeStart, this.timeStop);
    clone.subdivision = this.subdivision;
    return clone;
  }

  get subdivision() {
    return this._subdivision;
  }

  set subdivision(subdivision) {
    this._subdivision = Math.max(1, subdivision);
  }
}
