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
    this._notePlaybackData = new Map();
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

  stopNoteData(data) {
    data.gain.gain.setTargetAtTime(0.0, this.audio.currentTime + 0.1, 0.001);
    data.gain.gain.cancelScheduledValues(this.audio.currentTime + 0.2);
    // caching these so timeout has a proper reference to them
    const oscNodes = data.oscs;
    const gain = data.gain;
    setTimeout(() => {
      gain.disconnect();
      oscNodes.forEach(osc => osc.disconnect());
    }, 500);
  }

  stopAllNodes() {
    this._notePlaybackData.forEach((data, key) => this.stopNoteData(data));
    this._notePlaybackData.clear();
  }

  stop() {
    this.stopAllNodes();
    this._notes.forEach(note => note[this.marker] = false);
    this.isPlaying = false;
    this.updateAction.cancel();
  }

  createNotePlaybackData(note) {
    const gain = this.audio.createGain();
    const oscs = [-5, 0, 5].map(detune => {
      const osc = this.audio.createOscillator();
      osc.frequency.value = note.freq;
      osc.detune.value = detune;
      osc.type = 'sine';
      osc.connect(gain);
      return osc;
    });

    return { note, oscs, gain };
  }

  playNotePlaybackData(data, audioStart) {
    let timeStart = audioStart + data.note.timeStart;
    if (timeStart < this.audio.currentTime) {
      timeStart = this.audio.currentTime + 0.1;
    }

    const volume = 0.1;
    data.gain.gain.setValueAtTime(0.0, this.audio.currentTime + 0.01);
    data.gain.gain.setTargetAtTime(volume, timeStart, 0.001);

    const releaseTime = audioStart + data.note.timeStop - 0.1;
    data.gain.gain.setValueAtTime(volume, releaseTime);
    data.gain.gain.setTargetAtTime(0.0, releaseTime, 0.001);

    data.gain.connect(this.audio.destination);

    const timeStop = audioStart + data.note.timeStop + 1;
    data.oscs.forEach(osc => {
      osc.start(timeStart);
      osc.stop(timeStop);
    });

    const wait = (timeStop - timeStart) * 1000;
    data.timeout = setTimeout(() => {
      this.stopNoteData(data);
    }, wait);
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
        const nodes = this.createNotePlaybackData(note);
        this.playNotePlaybackData(nodes, this.audioStart);
        this._notePlaybackData.set(note, nodes);
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

    // if notes already being previewed, stop them
    if (this._currentNodes !== undefined) {
      this.stopNoteData(this._currentNodes);
      this._currentNodes = undefined;
    }

    const gotNote = note !== undefined;
    this._previewNote = gotNote ? new Note(note.freq, 0.05, 60) : undefined;
    this._currentNodes = gotNote ? this.createNotePlaybackData(this._previewNote) : undefined;
    if (gotNote) {
      this.playNotePlaybackData(this._currentNodes, this.audio.currentTime + 0.05);
    }
  }

  get currentTime() {
    return this.audio.currentTime - this.audioStart;
  }
}
