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
      grabbedOffset: new Point(0, 0),
      resizing: false,
      resizeHover: false,
      resizingSide: undefined,
    };
    this.currentNoteChangedFreq = false;
    this.resizeThreshold = 4;
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

  get isResizeHovering() {
    return this.manager.notes.some(note => this.getMetadata(note).resizeHover);
  }

  get resizing() {
    return this.manager.notes.filter(note => this.getMetadata(note).resizing);
  }

  get isResizing() {
    return this.resizing.length > 0;
  }

  updateMouseDown(point, snappedPoint, targetRect) {
    this.manager.notes.forEach(note => {
      const noteRect = this.renderer.getRectFromNote(note);
      const resizingSide = noteRect.isPointOnLeftLine (point, this.resizeThreshold) ? 'left'
                         : noteRect.isPointOnRightLine(point, this.resizeThreshold) ? 'right'
                         : undefined;
      const resizing = resizingSide !== undefined;
      this.setMetadata(note, 'resizing', resizing);
      this.setMetadata(note, 'resizingSide', resizingSide);

      const grabbed = noteRect.containsPoint(point) && !resizing;
      this.setMetadata(note, 'grabbed', grabbed);
      if (grabbed) {
        this.setMetadata(note, 'grabbedOffset', point.subtract(noteRect.tl));
      }
    });

    if (!this.isGrabbing && !this.isResizing) {
      const midiNote = this.renderer.getKeyFromPoint(point);
      const freq = midiToFreq(midiNote);
      const times = this.getInputNoteTimes(point, snappedPoint, targetRect);
      this.manager.previewNote = new Note(freq, ...times);
    }
  }

  updateMouseMove(point, snappedPoint, targetRect, snapping) {
    if (this.manager.previewing) {
      const midiNote = this.renderer.getKeyFromPoint(point);
      const prevMidiNote = Math.floor(freqToMidi(this.manager.previewNote.freq));

      this.manager.previewNote.freq = midiToFreq(midiNote);
      this.currentNoteChangedFreq = midiNote !== prevMidiNote;

      const times = this.getInputNoteTimes(point, snappedPoint, targetRect);
      this.manager.previewNote.timeStop = times[1];
    }

    this.grabbed.forEach(note => {
      const midiNote = constrain(this.renderer.getKeyFromPoint(point),
                                 this.renderer.song.rootNote,
                                 this.renderer.song.rootNote + this.renderer.song.numKeys);
      note.freq = midiToFreq(midiNote);

      const duration = note.timeStop - note.timeStart;
      const newTopLeft = snapping
        ? snappedPoint
        : point.subtract(this.getMetadata(note).grabbedOffset);

      note.timeStart = Math.max(0, this.renderer.xToTime(newTopLeft.x));
      note.timeStop = note.timeStart + duration;
    });

    this.resizing.forEach(note => {
      const side = this.getMetadata(note).resizingSide;
      const times = this.getInputNoteTimes(point, snappedPoint, targetRect);
      if (side === 'left') {
        note.timeStart = Math.min(note.timeStop, times[0]);
      }
      else if (side === 'right') {
        note.timeStop = Math.max(note.timeStart, times[1]);
      }
    });

    this.manager.notes.forEach(note => {
      const noteRect = this.renderer.getRectFromNote(note);
      const hover = noteRect.containsPoint(point);
      const grabbing = this.grabbed.length > 0;
      this.setMetadata(note, 'hover', hover && !grabbing);

      const resizeHover = noteRect.isPointOnLeftLine (point, this.resizeThreshold) ||
                          noteRect.isPointOnRightLine(point, this.resizeThreshold);
      this.setMetadata(note, 'resizeHover', resizeHover && !grabbing);
    });
  }

  updateMouseUp(point, onCanvas) {
    if (onCanvas && this.manager.previewing) {
      this.manager.addNote(this.manager.previewNote);
    }
    this.manager.previewNote = undefined;
    this.manager.notes.forEach(note => this.setMetadata(note, 'grabbed', false));
    this.manager.notes.forEach(note => this.setMetadata(note, 'resizing', false));
  }

  render(ctx) {
    this.renderer.renderNotes(ctx, this.manager.notes, this.metadata);
    if (this.manager.previewing) {
      this.renderer.renderNote(ctx, this.manager.previewNote, color.green, this.metadata);
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
