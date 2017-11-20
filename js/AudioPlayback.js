import { Note } from './Note.js';

export class AudioPlayback {
  constructor(audioContext) {
    this.audio = audioContext;
    this.lookahead = 0.05;
    this.audioStart = 0;
    this.notes = [];
    this.marker = Symbol('played');
    this._previewNote = undefined;
    this._currentNodes = undefined;
    this._nodes = new Map();
    this.isPlaying = false;
    this.loop = true;
    this.duration = 0;
  }

  playFrom(notes) {
    this.audioStart = this.audio.currentTime + this.lookahead;
    this.notes = notes.map(note => note.clone());
    this.isPlaying = true;
  }

  stopNode(nodeObj) {
    const gainNode = nodeObj.gain;
    gainNode.gain.setTargetAtTime(0.0, this.audio.currentTime + 0.1, 0.001);
    gainNode.gain.cancelScheduledValues(this.audio.currentTime + 0.2);
    const oscNodes = nodeObj.oscs;
    setTimeout(() => {
      oscNodes.forEach(osc => osc.disconnect());
      gainNode.disconnect();
    }, 500);
  }

  stop() {
    this._nodes.forEach((nodeObj, key) => {
      this.stopNode(nodeObj);
    });
    this._nodes.clear();
    this.notes = [];
    this.isPlaying = false;
  }

  playNote(note, audioStart) {
    const gain = this.audio.createGain();
    const oscs = [-5, 0, 5].map(detune => {
      const osc = this.audio.createOscillator();
      osc.frequency.value = note.freq;
      osc.detune.value = detune;
      osc.type = 'sine';
      osc.connect(gain);
      return osc;
    });

    const volume = 0.1;
    gain.gain.setValueAtTime(0.0, this.audio.currentTime + 0.01);
    gain.gain.setTargetAtTime(volume, audioStart + note.timeStart, 0.001);

    const releaseTime = audioStart + note.timeStop - 0.1;
    gain.gain.setValueAtTime(volume, releaseTime);
    gain.gain.setTargetAtTime(0.0, releaseTime, 0.001);


    gain.connect(this.audio.destination);

    oscs.forEach(osc => {
      osc.start(audioStart + note.timeStart);
      osc.stop(audioStart + note.timeStop + 1);
    });

    return { note, oscs, gain };
  }

  update() {
    if (!this.isPlaying) { return; }

    const toPlay = this.notes.filter(note => {
      const noteStartTime = this.audioStart + note.timeStart;
      return noteStartTime >= this.audio.currentTime &&
             noteStartTime <= this.audio.currentTime + this.lookahead;
    });

    toPlay.forEach(note => {
      if (!note[this.marker]) {
        const nodes = this.playNote(note, this.audioStart);
        this._nodes.set(note, nodes);
        note[this.marker] = true;
      }
    });

    if (this.loop && this.currentTime >= this.duration) {
      this.playFrom(this.notes);
    }
  }

  set previewNote(note) {
    const sameFreq = this._previewNote !== undefined &&
                     note !== undefined &&
                     Math.abs(this._previewNote.freq - note.freq) < Number.EPSILON;
    if (sameFreq) { return; }

    if (this._currentNodes !== undefined) {
      const gainNode = this._currentNodes.gain;
      gainNode.gain.setTargetAtTime(0.0, this.audio.currentTime + 0.1, 0.001);
      gainNode.gain.cancelScheduledValues(this.audio.currentTime + 0.2);
      const oscNodes = this._currentNodes.oscs;
      setTimeout(() => {
        oscNodes.forEach(osc => osc.disconnect());
        gainNode.disconnect();
      }, 500);
      this._currentNodes = undefined;
    }

    this._previewNote = note === undefined ? undefined : new Note(note.freq, 0, 60);
    // play new note
    if (this._previewNote !== undefined) {
      this._currentNodes = this.playNote(this._previewNote, this.audio.currentTime + 0.05);
    }
  }

  get currentTime() {
    return this.audio.currentTime - this.audioStart;
  }
}
