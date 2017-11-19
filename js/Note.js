import { freqToMidi, midiToFreq } from './utils.js';
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

  getRectFromNote(note) {
    const x = this.parentRect.x + (note.timeStart / this.duration) * this.parentRect.width;
    const midiNote = freqToMidi(note.freq);
    const noteHeight = this.parentRect.height / this.numKeys;
    const y = ((this.numKeys - 1) - (midiNote - this.rootNote)) * noteHeight;
    const width = Math.max(2, this.parentRect.width * ((note.timeStop - note.timeStart) / this.duration));

    return new Rectangle(x, y, width, noteHeight);
  }

  getNoteFromPoint(point) {
    const noteHeight = this.parentRect.height / this.numKeys;
    const noteIdx = this.numKeys - 1 - ((point.y - (point.y % noteHeight)) / noteHeight);
    return this.rootNote + noteIdx;
  }

  renderNote(ctx, note, style, metadata = {}) {
    ctx.save();
    ctx.fillStyle = style;
    ctx.strokeStyle = style;
    ctx.globalAlpha = metadata.hover ? 0.8 : 0.5;
    const rect = this.getRectFromNote(note);
    metadata.grabbed ? ctx.strokeRect(...rect) : ctx.fillRect(...rect);
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  renderNotes(ctx, notes, metadata) {
    notes.forEach(note => {
      this.renderNote(ctx, note, color.orange, metadata.get(note));
    });
  }
}

export class NoteController {
  constructor(noteManager, noteRenderer) {
    this.manager = noteManager;
    this.renderer = noteRenderer;
    this.metadata = new Map();
    this._metadataTemplate = {
      hover: false,
      grabbed: false,
    };
  }

  updateMouseDown(point, snappedPoint) {
    this.manager.notes.forEach(note => {
      const grabbed = this.renderer.getRectFromNote(note).containsPoint(point);
      this.setMetadata(note, 'grabbed', grabbed);
    });

    const anyGrabbed = this.manager.notes.some(note => this.metadata.get(note).grabbed);
    if (!anyGrabbed) {
      const midiNote = this.renderer.getNoteFromPoint(snappedPoint);
      const freq = midiToFreq(midiNote);
      const rect = this.renderer.parentRect;
      const timeStart = ((snappedPoint.x - rect.x) / rect.width) * this.renderer.duration;
      const timeStop = timeStart + Note.MIN_LENGTH;
      this.manager.currentNote = new Note(freq, timeStart, timeStop);
    }
  }

  updateMouseMove(point) {
    this.manager.notesWithCurrent.forEach(note => {
      const hover = this.renderer.getRectFromNote(note).containsPoint(point);
      this.setMetadata(note, 'hover', hover);
    });
  }

  updateMouseUp(point, onCanvas) {
    if (onCanvas && this.manager.currentNote !== undefined) {
      this.manager.addNote(this.manager.currentNote);
    }
    this.manager.currentNote = undefined;
    this.manager.notesWithCurrent.forEach(note => this.setMetadata(note, 'grabbed', false));
  }

  render(ctx) {
    this.renderer.renderNotes(ctx, this.manager.notes, this.metadata);
    if (this.manager.currentNote !== undefined) {
      this.renderer.renderNote(ctx, this.manager.currentNote, color.green, this.metadata);
    }
  }

  setMetadata(note, key, value) {
    if (!this.metadata.has(note)) {
      const meta = {};
      Object.entries(this._metadataTemplate).forEach(e => meta[e[0]] = e[1]);
      this.metadata.set(note, meta);
    }
    this.metadata.get(note)[key] = value;
  }
}

export class NoteManager {
  constructor() {
    this.notes = [];
    this.currentNote;
  }

  addNote(note) {
    this.notes.push(note);
  }

  deleteNote(note) {
    if (this.notes.includes(note)) {
      this.notes.splice(this.notes.indexOf(note), 1);
    }
  }

  get notesWithCurrent() {
    const notes = this.notes.slice();
    if (this.currentNote !== undefined) { notes.push(this.currentNote); }
    return notes;
  }
}
