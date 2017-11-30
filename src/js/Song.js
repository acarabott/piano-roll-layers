import { MicroEvent } from './MicroEvent.js';

export class Song extends MicroEvent {
  constructor() {
    super();
    this._numKeys = 25;
    this._duration = 60;
    this._rootNote = 60;
    this._tempo = 60;
  }

  get numKeys() {
    return this._numKeys;
  }

  set numKeys(numKeys) {
    this._numKeys = Math.max(0, numKeys);
    this.trigger('numKeys', this._numKeys);
  }

  get duration() {
    return this._duration;
  }

  set duration(duration) {
    this._duration = Math.max(0, duration);
    this.trigger('duration', this._duration);
  }

  get rootNote() {
    return this._rootNote;
  }

  set rootNote(rootNote) {
    this._rootNote = rootNote;
    this.trigger('rootNote', this._rootNote);
  }

  get tempo() {
    return this._tempo;
  }

  set tempo(tempo) {
    const prev = this.tempo;
    this._tempo = Math.max(0, tempo);
    this.trigger('tempo', this.tempo, prev / this.tempo);
  }

  get speed() {
    return this.tempo / 60;
  }
}
