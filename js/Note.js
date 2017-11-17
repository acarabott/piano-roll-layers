import { linlin, freqToMidi } from './utils.js';

export class Note {
  constructor(freq, sampleStart, sampleEnd) {
    this.freq = freq;
    this.sampleStart = sampleStart;
    this._sampleEnd = sampleEnd;
  }

  render(ctx, style, parentRect, parentNumSamples, parentNumNotes) {
    const x = parentRect.x + (this.sampleStart / parentNumSamples) * parentRect.width;
    const midiNote = freqToMidi(this.freq);
    const noteHeight = parentRect.height / parentNumNotes;
    const y = parentRect.height - noteHeight - Math.floor(linlin(midiNote, 60, 60 + parentNumNotes, 0, parentRect.height));
    const width = Math.max(2, parentRect.width * ((this.sampleEnd - this.sampleStart) / parentNumSamples));
    ctx.fillStyle = style;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, width, noteHeight);
    ctx.globalAlpha = 1.0;
  }

  get sampleEnd() {
    return this._sampleEnd;
  }

  set sampleEnd(sampleEnd) {
    this._sampleEnd = Math.max(sampleEnd, this.sampleStart + 1);
  }
}

export class NoteManager {
  constructor() {
    this._notes = [];
    this.currentNote;
  }

  get notes() { return this._notes; }

  addNote(note) {
    this._notes.push(note);
  }
}
