import { freqToMidi, midiToFreq, constrain } from './utils.js';
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

  xToTime(x) {
    return ((x - this.parentRect.x) / this.parentRect.width) * this.duration;
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
    this.currentNoteChangedFreq = false;
  }

  getInputNoteTimes(point, snappedPoint, targetRect) {
    const snapping = !point.equalTo(snappedPoint);
    const x = snapping ? targetRect.x : point.x;
    const timeStart = this.renderer.xToTime(x);
    const timeStop = snapping
      ? this.renderer.xToTime(targetRect.br.x)
      : timeStart + Note.MIN_LENGTH;

    return [timeStart, timeStop];
  }

  updateMouseDown(point, snappedPoint, targetRect) {
    this.manager.notes.forEach(note => {
      const noteRect = this.renderer.getRectFromNote(note);
      const grabbed = noteRect.containsPoint(point);
      this.setMetadata(note, 'grabbed', grabbed);
      this.setMetadata(note, 'grabbedOffset', point.subtract(noteRect.tl));
    });

    if (!this.isGrabbing) {
      const midiNote = this.renderer.getKeyFromPoint(point);
      const freq = midiToFreq(midiNote);
      const times = this.getInputNoteTimes(point, snappedPoint, targetRect);
      this.manager.currentNote = new Note(freq, ...times);
    }
  }

  get isGrabbing() {
    return this.manager.notes.some(note => this.getMetadata(note).grabbed);
  }

  get isHovering() {
    return this.manager.notes.some(note => this.getMetadata(note).hover);
  }

  get hovering() {
    return this.manager.notes.filter(note => this.getMetadata(note).hover);
  }

  updateMouseMove(point, snappedPoint, targetRect) {
    if (this.manager.currentNote !== undefined) {
      const midiNote = this.renderer.getKeyFromPoint(point);
      const prevMidiNote = Math.floor(freqToMidi(this.manager.currentNote.freq));
      this.manager.currentNote.freq = midiToFreq(midiNote);
      this.currentNoteChangedFreq = midiNote !== prevMidiNote;

      const times = this.getInputNoteTimes(point, snappedPoint, targetRect);
      this.manager.currentNote.timeStop = times[1];
    }

    const grabbed = this.manager.notes.filter(note => this.getMetadata(note).grabbed);
    grabbed.forEach(note => {
      const midiNote = constrain(this.renderer.getKeyFromPoint(snappedPoint),
                                 this.renderer.rootNote,
                                 this.renderer.rootNote + this.renderer.numKeys);
      note.freq = midiToFreq(midiNote);

      const duration = note.timeStop - note.timeStart;
      const snapping = point.equalTo(snappedPoint);
      const newTopLeft = snapping
        ? snappedPoint.subtract(this.getMetadata(note).grabbedOffset)
        : snappedPoint;

      note.timeStart = Math.max(0, this.renderer.xToTime(newTopLeft.x));
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

  ensureMetadata(note) {
    if (!this.metadata.has(note)) {
      const meta = {};
      Object.entries(this._metadataTemplate).forEach(e => meta[e[0]] = e[1]);
      this.metadata.set(note, meta);
    }
  }

  setMetadata(note, key, value) {
    this.ensureMetadata(note);
    this.metadata.get(note)[key] = value;
  }

  getMetadata(note) {
    this.ensureMetadata(note);
    return this.metadata.get(note);
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
