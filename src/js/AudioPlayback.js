import { MicroEvent } from './MicroEvent.js';
import { Note } from './Note.js';
import { BackgroundAction } from './BackgroundAction.js';

export class AudioPlayback extends MicroEvent {
  constructor(audioContext, song) {
    super();
    this.audio = audioContext;
    this.song = song;
    this._notes = [];
    this.lookahead = 0.05;
    this.audioStart = 0;
    this._previewNoteData = undefined;
    this._noteData = new Map();
    this._isPlaying = false;
    this.loop = true;
    this._playheadTime = 0;
    const updateIntervalMs = this.lookahead * 0.5 * 1000;
    this.updateAction = new BackgroundAction(updateIntervalMs);

    this.song.bind('tempo', (tempo, prevTempo) => {
      this.playheadTime = (prevTempo / tempo) * this.playheadTime;
    });
  }

  getNoteDataTemplate(note) {
    return { note, played: false, nodes: undefined, timeout: undefined };
  }

  get notes() {
    return this._notes;
  }

  set notes(notes) {
    this._notes = notes;
    notes.forEach(note => {
      if (!this._noteData.has(note)) {
        this._noteData.set(note, this.getNoteDataTemplate(note));
      }
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
    data.played = false;
    clearTimeout(data.timeout);
    if (data.nodes !== undefined) {
      data.nodes.gain.gain.setTargetAtTime(0.0, this.audio.currentTime + 0.1, 0.001);
      data.nodes.gain.gain.cancelScheduledValues(this.audio.currentTime + 0.2);
      // caching these so timeout has a proper reference to them
      const oscNodes = data.nodes.oscs;
      const gain = data.nodes.gain;
      setTimeout(() => {
        gain.disconnect();
        oscNodes.forEach(osc => osc.disconnect());
      }, 500);
    }
  }

  stopAllNodes() {
    this._noteData.forEach((data, key) => this.stopNoteData(data));
  }

  stop() {
    this.stopAllNodes();
    this.isPlaying = false;
    this.updateAction.cancel();
  }

  createNodes(note) {
    const gain = this.audio.createGain();
    const oscs = [-5, 0, 5].map(detune => {
      const osc = this.audio.createOscillator();
      osc.frequency.value = note.freq;
      osc.detune.value = detune;
      osc.type = 'sine';
      osc.connect(gain);
      return osc;
    });

    return { oscs, gain };
  }

  playNoteData(data, audioStart) {
    let timeStart = this.audioStart + data.note.timeStart;

    if (timeStart < this.audio.currentTime) {
      timeStart = this.audio.currentTime + 0.1;
    }

    const volume = 0.1;
    data.nodes.gain.gain.setValueAtTime(0.0, this.audio.currentTime + 0.01);
    data.nodes.gain.gain.setTargetAtTime(volume, timeStart, 0.001);

    const timeStop = this.audioStart + data.note.timeStop;
    const releaseTime = timeStop - 0.1;
    data.nodes.gain.gain.setValueAtTime(volume, releaseTime);
    data.nodes.gain.gain.setTargetAtTime(0.0, releaseTime, 0.001);

    data.nodes.gain.connect(this.audio.destination);

    const timeOff =  timeStop + 1;
    data.nodes.oscs.forEach(osc => {
      osc.start(timeStart);
      osc.stop(timeOff);
    });

    const wait = (timeOff - timeStart) * 1000;
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
      const noteData = this._noteData.get(note);
      if (!noteData.played) {
        noteData.nodes = this.createNodes(note);
        noteData.played = true;
        this.playNoteData(noteData, this.audioStart);
      }
    });

    if (this.currentTime >= this.song.duration) {
      this.stop();
      this.playheadTime = 0;
      if (this.loop) { this.play(); }
    }

    this.playheadTime = this.currentTime + this.lookahead;
  }

  set previewNote(note) {
    const sameFreq = note !== undefined &&
                     this._previewNoteData !== undefined &&
                     Math.abs(this._previewNoteData.note.freq - note.freq) < Number.EPSILON;
    if (sameFreq) { return; }

    // if notes already being previewed, stop them
    if (this._previewNoteData !== undefined) {
      this.stopNoteData(this._previewNoteData);
      this._previewNoteData = undefined;
    }

    // play new note
    if (note !== undefined) {
      const newNote = new Note(note.freq, 0.05, 60);
      this._previewNoteData = this.getNoteDataTemplate(newNote);
      this._previewNoteData.nodes = this.createNodes(newNote);
      this.playNoteData(this._previewNoteData, this.audio.currentTime + 0.05);
    }
    else {
      this._previewNoteData = undefined;
    }
  }

  get currentTime() {
    return this.audio.currentTime - this.audioStart;
  }
}
