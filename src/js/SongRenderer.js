import { Rectangle } from './Rectangle.js';
import * as color from './color.js';
import { loop } from './utils.js';

export class SongRenderer {
  constructor() {
    this.song = undefined;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 400;
    this.ctx = this.canvas.getContext('2d');
  }

  get keyRect() {
    return new Rectangle(0, 0, this.canvas.width * 0.075, this.canvas.height);
  }

  get patternRect() {
    const kr = this.keyRect;
    return new Rectangle(kr.br.x, kr.y, this.canvas.width - kr.width, kr.height);
  }

  renderPiano(rect, alpha = 1.0) {
    this.ctx.save();

    const keyColors = [
      color.white, color.black, color.white, color.black,
      color.white, color.white, color.black, color.white,
      color.black, color.white, color.black];

    this.ctx.globalAlpha = alpha;
    loop(this.song.numKeys, i => {
      this.ctx.fillStyle = keyColors[i % keyColors.length];
      const y = rect.y + ((this.song.numKeys - (i + 1)) * this.song.noteHeight);
      this.ctx.fillRect(rect.x, y, rect.width, this.song.noteHeight);
      this.ctx.strokeStyle = 'rgba(100, 100, 100)';
      this.ctx.strokeRect(rect.x, y, rect.width, this.song.noteHeight);
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();
  }

  render() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // piano
    this.renderPiano(this.keyRect, 1.0);
    // background
    this.renderPiano(this.patternRect, 0.1);
    this.ctx.restore();
  }
}
