import { Note } from './Note.js';
import { Point } from './Point.js';
import * as color from './color.js';

export class NoteManager {
  constructor(song, noteRenderer) {
    this.song = song;
    this.renderer = noteRenderer;
    this.notes = [];
    this.previewNote = undefined;
    this.metadata = new Map();
    this._metadataTemplate = {
      hover: false,
      grabbed: false,
      grabbedOffset: new Point(0, 0),
      originalGrabbedNote: undefined,
      resizing: false,
      resizeHover: false,
      resizingSide: undefined,
    };
    this.currentNoteChangedFreq = false;
    this.resizeThreshold = 4;
    this.copying = false;
  }

  addNote(note) {
    this.notes.push(note);
  }

  deleteNote(note) {
    if (this.notes.includes(note)) {
      this.notes.splice(this.notes.indexOf(note), 1);
    }
  }

  get previewing() {
    return this.previewNote !== undefined;
  }

  getInputNoteTimes(point, snappedPoint, targetRect) {
    const snapping = !point.equalTo(snappedPoint);
    const x = snapping ? targetRect.x : point.x;
    const timeStart = this.song.positionToTime(x);
    const timeStop = snapping
      ? this.song.positionToTime(targetRect.br.x)
      : timeStart + Note.MIN_LENGTH;

    return [timeStart, timeStop];
  }

  get isGrabbing() {
    return this.notes.some(note => this.getMetadata(note).grabbed);
  }

  get grabbed() {
    return this.notes.filter(note => this.getMetadata(note).grabbed);
  }

  get isHovering() {
    return this.notes.some(note => this.getMetadata(note).hover);
  }

  get hovering() {
    return this.notes.filter(note => this.getMetadata(note).hover);
  }

  get isResizeHovering() {
    return this.notes.some(note => this.getMetadata(note).resizeHover);
  }

  get resizing() {
    return this.notes.filter(note => this.getMetadata(note).resizing);
  }

  get isResizing() {
    return this.resizing.length > 0;
  }

  updateMouseDown(point, snappedPoint, targetRect) {
    this.notes.forEach(note => {
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
        this.setMetadata(note, 'originalGrabbedNote', note.clone());
      }
    });

    if (!this.isGrabbing && !this.isResizing) {
      const freq = this.song.positionToFreq(point.y);
      const times = this.getInputNoteTimes(point, snappedPoint, targetRect);
      this.previewNote = new Note(freq, ...times);
    }
  }

  updateMouseMove(point, snappedPoint, targetRect, snapping) {
    if (this.previewing) {
      this.previewNote.freq = this.song.positionToFreq(point.y);

      const times = this.getInputNoteTimes(point, snappedPoint, targetRect);
      this.previewNote.timeStop = times[1];
    }

    this.grabbed.forEach(note => {
      note.freq = this.song.positionToFreq(point.y);
      const duration = note.timeStop - note.timeStart;
      const newTopLeft = snapping
        ? snappedPoint
        : point.subtract(this.getMetadata(note).grabbedOffset);

      note.timeStart = Math.max(0, this.song.positionToTime(newTopLeft.x));
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

    this.notes.forEach(note => {
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
    if (onCanvas && this.previewing) {
      this.addNote(this.previewNote);
    }
    this.previewNote = undefined;
    this.notes.forEach(note => {
      const meta = this.getMetadata(note);
      if (this.copying && meta.grabbed) {
        this.addNote(meta.originalGrabbedNote);
      }
      this.setMetadata(note, 'grabbed', false);
      this.setMetadata(note, 'resizing', false);
      this.setMetadata(note, 'originalGrabbedNote', undefined);
    });
  }

  render(ctx) {
    this.renderer.renderNotes(ctx, this.notes, this.metadata, this.copying);
    if (this.previewing) {
      this.renderer.renderNote(ctx, this.previewNote, color.green,
                               this.metadata, this.copying);
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
