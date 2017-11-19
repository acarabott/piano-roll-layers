import { freqToMidi, midiToFreq } from './utils.js';
import { Rectangle } from './Rectangle.js';
import { Point } from './Point.js';
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

  getKeyFromPoint(point) {
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
    metadata.grabbed
      ? (() => {
          const lineWidth = 5;
          ctx.lineWidth = lineWidth;
          const inset = new Point(lineWidth / 2, lineWidth / 2);
          const strokeRect = Rectangle.fromPoints(rect.tl.add(inset),
                                                  rect.br.subtract(inset));
          ctx.strokeRect(...strokeRect);
        })()
      : ctx.fillRect(...rect);
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
      grabbedOffset: new Point(0, 0)
    };
  }

  updateMouseDown(point, snappedPoint) {
    this.manager.notes.forEach(note => {
      const noteRect = this.renderer.getRectFromNote(note);
      const grabbed = noteRect.containsPoint(point);
      this.setMetadata(note, 'grabbed', grabbed);
      this.setMetadata(note, 'grabbedOffset', point.subtract(noteRect.tl));
    });

    const anyGrabbed = this.manager.notes.some(note => this.metadata.get(note).grabbed);
    if (!anyGrabbed) {
      const midiNote = this.renderer.getKeyFromPoint(snappedPoint);
      const freq = midiToFreq(midiNote);
      const rect = this.renderer.parentRect;
      const timeStart = ((snappedPoint.x - rect.x) / rect.width) * this.renderer.duration;
      const timeStop = timeStart + Note.MIN_LENGTH;
      this.manager.currentNote = new Note(freq, timeStart, timeStop);
    }
  }

  updateMouseMove(point, snappedPoint) {
    if (this.manager.currentNote !== undefined) {
      const midiNote = this.renderer.getKeyFromPoint(point);
      this.manager.currentNote.freq = midiToFreq(midiNote);
      const rect = this.renderer.parentRect;
      this.manager.currentNote.timeStop = ((snappedPoint.x - rect.x) / rect.width) * this.renderer.duration;
    }

    const grabbed = this.manager.notes.filter(note => this.metadata.get(note).grabbed);
    grabbed.forEach(note => {
      const midiNote = this.renderer.getKeyFromPoint(snappedPoint);
      note.freq = midiToFreq(midiNote);

      const rect = this.renderer.parentRect;
      const duration = note.timeStop - note.timeStart;
      const newTopLeft = point.equalTo(snappedPoint)
        ? snappedPoint.subtract(this.metadata.get(note).grabbedOffset)
        : snappedPoint;

      note.timeStart = ((newTopLeft.x - rect.x) / rect.width) * this.renderer.duration;
      note.timeStop = note.timeStart + duration;
    });

    this.manager.notesWithCurrent.forEach(note => {
      const hover = this.renderer.getRectFromNote(note).containsPoint(point);
      this.setMetadata(note, 'hover', hover && grabbed.length === 0);
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
