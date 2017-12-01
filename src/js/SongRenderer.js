import { Rectangle } from './Rectangle.js';
import * as color from './color.js';
import { loop } from './utils.js';
import { midiToFreq, freqToMidi } from './utils.js';
import { MicroEvent } from './MicroEvent.js';

export class SongRenderer extends MicroEvent {
  constructor() {
    super();
    this.song = undefined;
    this.canvas = document.createElement('canvas');
    this.canvas.tabIndex = 0;
    this.canvas.width = 800;
    this.canvas.height = 400;
    this.ctx = this.canvas.getContext('2d');
    this.duration = 30;
  }

  get duration() {
    return this._duration;
  }

  set duration(duration) {
    this._duration = Math.max(0, duration);
    this.trigger('duration', this.duration);
  }

  get width() {
    return this.canvas.width;
  }

  set width(width) {
    this.canvas.width = Math.max(0, width);
    this.trigger('canvasSize', [this.canvas.width, this.canvas.height]);
  }

  get height() {
    return this.canvas.height;
  }

  set height(height) {
    this.canvas.height = Math.max(0, height);
    this.trigger('canvasSize', [this.canvas.width, this.canvas.height]);
  }

  get keyRect() {
    return new Rectangle(0, 0, this.canvas.width * 0.075, this.canvas.height);
  }

  get patternRect() {
    const kr = this.keyRect;
    return new Rectangle(kr.br.x, kr.y, this.canvas.width - kr.width, kr.height);
  }

  get noteHeight() {
    return this.patternRect.height / this.song.numKeys;
  }

  timeToPosition(time) {
    return this.patternRect.x + Math.round((time / this.duration) * this.patternRect.width);
  }

  positionToTime(x) {
    return ((x - this.patternRect.x) / this.patternRect.width) * this.duration;
  }

  freqToPosition(freq) {
    const midiNote = freqToMidi(freq);
    const interval = midiNote - this.song.rootNote;
    return this.patternRect.y + (((this.song.numKeys) - interval) * this.noteHeight);
  }

  positionToFreq(y) {
    const index = (y - (y % this.noteHeight)) / this.noteHeight;
    const inverse = (this.song.numKeys - 1) - index;
    return midiToFreq(this.song.rootNote + inverse);
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

  renderPiano(rect, alpha = 1.0) {
    this.ctx.save();

    const keyColors = [
      color.white, color.black, color.white, color.black,
      color.white, color.white, color.black, color.white,
      color.black, color.white, color.black, color.white];

    this.ctx.globalAlpha = alpha;
    loop(this.song.numKeys, i => {
      this.ctx.fillStyle = keyColors[i % keyColors.length];
      const y = rect.y + ((this.song.numKeys - (i + 1)) * this.noteHeight);
      this.ctx.fillRect(rect.x, y, rect.width, this.noteHeight);
      this.ctx.strokeStyle = 'rgba(100, 100, 100)';
      this.ctx.strokeRect(rect.x, y, rect.width, this.noteHeight);
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();
  }

  render() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // piano
    this.renderPiano(this.keyRect, 1.0);
    // background
    this.renderPiano(this.patternRect, 0.1);
    this.ctx.restore();
  }
}
