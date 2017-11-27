import { freqToMidi } from './utils.js';
import { Rectangle } from './Rectangle.js';
import { Point } from './Point.js';
import * as color from './color.js';

export class NoteRenderer {
  constructor(song) {
    this.song = song;
    this.parentRect = song.rect;
    this.duration = song.duration;
    this.numKeys = song.numKeys;
    this.rootNote = song.rootNote;
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
