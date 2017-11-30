export class Note {
  constructor(freq, timeStart, timeStop) {
    this.freq = freq;
    this.timeStart = timeStart;
    this.timeStop = timeStop;
  }

  static get MIN_LENGTH() { return 0.001; }

  clone() {
    return new Note(this.freq, this.timeStart, this.timeStop);
  }
}
