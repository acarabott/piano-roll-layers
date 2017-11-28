import { MicroEvent } from './MicroEvent.js';
import { Note } from './Note.js';
import { BackgroundAction } from './BackgroundAction.js';

export class AudioPlayback extends MicroEvent {
  constructor(audioContext) {
    super();
    this.audio = audioContext;
    this.lookahead = 0.05;
    this.audioStart = 0;
    this._notes = [];
    this.marker = Symbol('played');
    this._previewNote = undefined;
    this._currentNodes = undefined;
    this._nodes = new Map();
    this._isPlaying = false;
    this.loop = true;
    this.duration = 0;
    this._playheadTime = 0;
    const updateIntervalMs = this.lookahead * 0.5 * 1000;
    this.updateAction = new BackgroundAction(updateIntervalMs);
  }

  get notes() {
    return this._notes;
  }

  set notes(notes) {
    this.stopAllNodes();
    this._notes = notes.map(note => {
      const newNote = note.clone();
      newNote[this.marker] = false;
      return newNote;
    });
  }

  get isPlaying() {
    return this._isPlaying;
  }

  set isPlaying(isPlaying) {
    this._isPlaying = isPlaying;
    this.updateAction.set(() => {
      this.update();
      return this.isPlaying;
    });
    this.trigger('isPlaying', isPlaying);
  }

  get playheadTime() {
    return this._playheadTime;
  }

  set playheadTime(playheadTime) {
    this._playheadTime = playheadTime;
    this.trigger('playheadTime', playheadTime);
  }

  play() {
    this.audioStart = this.audio.currentTime + this.lookahead - this.playheadTime;
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

  stopAllNodes() {
    this._nodes.forEach((nodeObj, key) => this.stopNode(nodeObj));
    this._nodes.clear();
  }

  stop() {
    this.stopAllNodes();
    this._notes.forEach(note => note[this.marker] = false);
    this.isPlaying = false;
    this.updateAction.cancel();
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

    let timeStart = audioStart + note.timeStart;
    if (timeStart < this.audio.currentTime) {
      timeStart = this.audio.currentTime + 0.1;
    }

    const volume = 0.1;
    gain.gain.setValueAtTime(0.0, this.audio.currentTime + 0.01);
    gain.gain.setTargetAtTime(volume, timeStart, 0.001);

    const releaseTime = audioStart + note.timeStop - 0.1;
    gain.gain.setValueAtTime(volume, releaseTime);
    gain.gain.setTargetAtTime(0.0, releaseTime, 0.001);


    gain.connect(this.audio.destination);

    oscs.forEach(osc => {
      osc.start(timeStart);
      osc.stop(audioStart + note.timeStop + 1);
    });

    return { note, oscs, gain };
  }

  update() {
    const toPlay = this.notes.filter(note => {
      const now = this.audio.currentTime;
      const noteStartTime = this.audioStart + note.timeStart;
      const noteStopTime = this.audioStart + note.timeStop;
      const inUnplayedNote = !note[this.marker] &&
            noteStartTime <= now &&
            noteStopTime  >= now;
      const inLookaheadWindow = noteStartTime >= now &&
                                noteStartTime <= now + this.lookahead;
      return inLookaheadWindow || inUnplayedNote;
    });

    toPlay.forEach(note => {
      if (!note[this.marker]) {
        const nodes = this.playNote(note, this.audioStart);
        this._nodes.set(note, nodes);
        note[this.marker] = true;
      }
    });

    if (this.loop && this.currentTime >= this.duration) {
      this.play();
    }

    this.playheadTime = this.currentTime + this.lookahead;
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
