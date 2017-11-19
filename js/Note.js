import { freqToMidi } from './utils.js';
import { Rectangle } from './Rectangle.js';
import * as color from './color.js';

export class Note {
  constructor(freq, timeStart, timeStop) {
    this.freq = freq;
    this.timeStart = timeStart;
    this._timeStop = timeStop;
    this.selected = false;
  }

  static get MIN_LENGTH() { return 0.001; }

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

export class NoteRenderer {
  constructor() {
    this.parentRect = undefined;
    this.duration = undefined;
    this.numKeys = undefined;
    this.rootNote = undefined;
  }

  getNoteRect(note) {
    const x = this.parentRect.x + (note.timeStart / this.duration) * this.parentRect.width;
    const midiNote = freqToMidi(note.freq);
    const noteHeight = this.parentRect.height / this.numKeys;
    const y = ((this.numKeys - 1) - (midiNote - this.rootNote)) * noteHeight;
    const width = Math.max(2, this.parentRect.width * ((note.timeStop - note.timeStart) / this.duration));

    return new Rectangle(x, y, width, noteHeight);
  }

  renderNote(ctx, note, style) {
    ctx.save();
    ctx.fillStyle = style;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(...this.getNoteRect(note));
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  render(ctx, noteManager) {
    noteManager.notes.forEach(note => {
      this.renderNote(ctx, note, color.orange);
    });
    if (noteManager.currentNote !== undefined) {
      this.renderNote(ctx, noteManager.currentNote, color.green);
    }
  }
}


export class NoteManager {
  constructor() {
    this.notes = [];
    this.noteMetadata = new Map();
    this.currentNote;
  }

  addNote(note) {
    this.notes.push(note);
    this.noteMetadata.set(note, {
      hover: false
    });
  }

  deleteNote(note) {
    if (this.notes.includes(note)) {
      this.notes.splice(this.notes.indexOf(note), 1);
    }
  }

  updateMouseUp(point, onCanvas) {
    if (onCanvas) {
      this.addNote(this.currentNote);
    }
    this.currentNote = undefined;
  }
}
