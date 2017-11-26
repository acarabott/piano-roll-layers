import { Note } from './Note.js';
import { Point } from './Point.js';
import { freqToMidi, midiToFreq, constrain } from './utils.js';
import * as color from './color.js';

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

  get isGrabbing() {
    return this.manager.notes.some(note => this.getMetadata(note).grabbed);
  }

  get grabbed() {
    return this.manager.notes.filter(note => this.getMetadata(note).grabbed);
  }

  get isHovering() {
    return this.manager.notes.some(note => this.getMetadata(note).hover);
  }

  get hovering() {
    return this.manager.notes.filter(note => this.getMetadata(note).hover);
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
