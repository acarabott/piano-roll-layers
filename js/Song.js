export class Song {
  constructor() {
    this.numKeys = 25;
    this.duration = 60;
    this.rootNote = 60;
    this.rect = undefined;
  }

  positionToTime(x) {
    return ((x - this.rect.x) / this.rect.width) * this.duration;
  }

  get noteHeight() {
    return this.rect.height / this.numKeys;
  }
}
