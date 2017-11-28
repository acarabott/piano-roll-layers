import { freqToMidi } from './utils.js';
import { Rectangle } from './Rectangle.js';
import { Point } from './Point.js';
import * as color from './color.js';

export class NoteRenderer {
  constructor(song) {
    this.song = song;
  }

  getRectFromNote(note) {
    const x = this.song.rect.x + ((note.timeStart / this.song.duration) * this.song.rect.width);
    const midiNote = freqToMidi(note.freq);
    const y = ((this.song.numKeys - 1) - (midiNote - this.song.rootNote)) * this.song.noteHeight;
    const width = Math.max(2, this.song.rect.width *
                              ((note.timeStop - note.timeStart) / this.song.duration));
    return new Rectangle(x, y, width, this.song.noteHeight);
  }

  getKeyFromPoint(point) {
    const noteIdx = (this.song.numKeys - 1) -
                    ((point.y - (point.y % this.song.noteHeight)) / this.song.noteHeight);
    return this.song.rootNote + noteIdx;
  }

  renderNote(ctx, note, style, metadata = {}, copying) {
    ctx.save();
    ctx.fillStyle = style;
    ctx.strokeStyle = style;
    ctx.globalAlpha = metadata.hover ? 0.8 : 0.5;
    const rect = this.getRectFromNote(note);
    metadata.hasOwnProperty('grabbed') && metadata.grabbed
      ? (() => {
          const lineWidth = 5;
          ctx.lineWidth = lineWidth;
          const inset = new Point(lineWidth / 2, lineWidth / 2);
          const strokeRect = Rectangle.fromPoints(rect.tl.add(inset),
                                                  rect.br.subtract(inset));
          ctx.strokeRect(...strokeRect);

          if (metadata.hasOwnProperty('originalGrabbedNote') &&
              metadata.originalGrabbedNote !== undefined)
          {
            ctx.lineWidth = 2;
            ctx.setLineDash([20, 10]);
            ctx.strokeStyle = copying ? color.green : color.black;

            const originalRect = this.getRectFromNote(metadata.originalGrabbedNote);
            ctx.strokeRect(...originalRect);
          }
        })()
      : ctx.fillRect(...rect);

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  renderNotes(ctx, notes, metadata, copying) {
    notes.forEach(note => {
      this.renderNote(ctx, note, color.orange, metadata.get(note), copying);
    });
  }

  xToTime(x) {
    return ((x - this.song.rect.x) / this.song.rect.width) * this.song.duration;
  }
}
