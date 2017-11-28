export class Playhead {
  constructor(song) {
    this.song = song;
  }

  render(ctx, playheadTime, color, alpha=0.5) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    const normTime = playheadTime / this.song.duration;
    const x = this.song.rect.x + Math.max(0, this.song.rect.width * normTime);
    ctx.fillRect(x, 0, 3, this.song.rect.height);
    ctx.globalAlpha = 1.0;
  }
}
