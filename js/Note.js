import { linlin, freqToMidi } from './utils.js';

export class Note {
  constructor(freq, timeStart, timeStop) {
    this.freq = freq;
    this.timeStart = timeStart;
    this._timeStop = timeStop;
  }

  static get MIN_LENGTH() { return 0.001; }

  render(ctx, style, parentRect, parentNumSeconds, parentNumNotes) {
    const x = parentRect.x + (this.timeStart / parentNumSeconds) * parentRect.width;
    const midiNote = freqToMidi(this.freq);
    const noteHeight = parentRect.height / parentNumNotes;
    const y = parentRect.height - noteHeight - Math.floor(linlin(midiNote, 60, 60 + parentNumNotes, 0, parentRect.height));
    const width = Math.max(2, parentRect.width * ((this.timeStop - this.timeStart) / parentNumSeconds));

    ctx.fillStyle = style;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, width, noteHeight);
    ctx.globalAlpha = 1.0;
  }

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
