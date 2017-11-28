import { MicroEvent } from './MicroEvent.js';
import { midiToFreq, freqToMidi } from './utils.js';
import { Rectangle } from './Rectangle.js';

export class Song extends MicroEvent {
  constructor() {
    super();
    this._numKeys = 25;
    this._duration = 60;
    this._rootNote = 60;
    this._rect = undefined;
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

  get rect() {
    return this._rect;
  }

  set rect(rect) {
    this._rect = rect;
    this.trigger('rect', this._rect);
  }

  get noteHeight() {
    return this.rect.height / this.numKeys;
  }

  timeToPosition(time) {
    return this.rect.x + Math.round((time / this.duration) * this.rect.width);
  }

  positionToTime(x) {
    return ((x - this.rect.x) / this.rect.width) * this.duration;
  }

  freqToPosition(freq) {
    const midiNote = freqToMidi(freq);
    return this.rect.y + ((this.numKeys - (midiNote - this.rootNote)) * this.noteHeight);
  }

  positionToFreq(y) {
    const idx = this.numKeys - ((y - (y % this.noteHeight)) / this.noteHeight);
    return midiToFreq(this.rootNote + idx);
  }

  positionToMidiNote(y) {
    return freqToMidi(this.positionToFreq(y));
  }

  rectToFreqsAndTimes(rect) {
    const freqStart = this.positionToFreq(rect.br.y);
    const freqStop  = this.positionToFreq(rect.y);
    const timeStart = this.positionToTime(rect.x);
    const timeStop  = this.positionToTime(rect.br.x);
    return [freqStart, freqStop, timeStart, timeStop];
  }

  freqsAndTimesToRect(freqStart, freqStop, timeStart, timeStop) {
    const x = this.timeToPosition(timeStart);
    const y = this.freqToPosition(freqStop);
    const width = this.timeToPosition(timeStop) - x;
    const height = this.freqToPosition(freqStart) - y;
    return new Rectangle(x, y, width, height);
  }
}
