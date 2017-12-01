import { freqToMidi, midiToFreq } from './utils.js';
import { Rectangle } from './Rectangle.js';
import { Point } from './Point.js';
import * as color from './color.js';

export class NoteRenderer {
  constructor(songRenderer) {
    this.songRenderer = songRenderer;
  }

  getRectFromNote(note) {
    const nextNote = freqToMidi(note.freq) + 1;
    const rect = this.songRenderer.freqsAndTimesToRect(note.freq,
                                                       midiToFreq(nextNote),
                                                       note.timeStart,
                                                       note.timeStop);
    return rect;
  }

  renderNote(ctx, note, style, metadata = {}, copying) {
    ctx.save();
    ctx.fillStyle = style;
    ctx.globalAlpha = metadata.selected ? 1.0
                    : metadata.hover    ? 0.8
                    : 0.5;
    const rect = this.getRectFromNote(note);
    metadata.grabbed
      ? (() => {
          // dragged note
          const lineWidth = 4;
          ctx.lineWidth = lineWidth;
          ctx.setLineDash([20, 10]);
          const inset = new Point(lineWidth / 2, lineWidth / 2);
          const strokeRect = Rectangle.fromPoints(rect.tl.add(inset),
                                                  rect.br.subtract(inset));
          ctx.strokeStyle = copying ? color.green : color.black;
          ctx.strokeRect(...strokeRect);

          // original note
          if (metadata.originalGrabbedNote !== undefined)
          {
            ctx.setLineDash([]);
            ctx.strokeStyle = style;
            const originalRect = this.getRectFromNote(metadata.originalGrabbedNote);
            ctx.strokeRect(...originalRect);
          }
        })()
      : ctx.fillRect(...rect);

    if (metadata.selected) {
      ctx.fillStyle = color.black;
      ctx.strokeRect(...rect);
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  renderNotes(ctx, notes, metadata, copying) {
    ctx.save();

    notes.forEach(note => {
      this.renderNote(ctx, note, color.orange, metadata.get(note), copying);
    });

    ctx.restore();
  }
}
