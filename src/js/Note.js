export class Note {
  constructor(freq, timeStart, timeStop) {
    this.freq = freq;
    this._timeStart = timeStart;
    this._timeStop = timeStop;
  }

  static get MIN_LENGTH() { return 0.001; }

  get timeStart() {
    return this._timeStart;
  }

  set timeStart(timeStart) {
    this._timeStart = Math.min(timeStart, this.timeStop - Note.MIN_LENGTH);
  }

  get timeStop() {
    return this._timeStop;
  }

  set timeStop(timeStop) {
    this._timeStop = Math.max(timeStop, this.timeStart + Note.MIN_LENGTH);
  }

  clone() {
    return new Note(this.freq, this.timeStart, this.timeStop);
  }
}
