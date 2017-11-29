import { Rectangle } from './Rectangle.js';
import { MicroEvent } from './MicroEvent.js';

export class Playhead extends MicroEvent {
  constructor(song, songRenderer) {
    super();
    this.song = song;
    this.songRenderer = songRenderer;
    this.time = 0;
    this._grabbed = false;
    this.hover = false;
    this.mouseThreshold = 4;
  }

  get rect() {
    const normTime = this.time / this.song.duration;
    const width = this.hover ? 6 : 3;
    const x = this.songRenderer.patternRect.x +
              Math.max(0, this.songRenderer.patternRect.width * normTime) -
              (width / 2);
    const y = this.songRenderer.patternRect.y;
    const height = this.songRenderer.patternRect.height;
    return new Rectangle(x, y, width, height);
  }

  get grabbed() {
    return this._grabbed;
  }

  set grabbed(grabbed) {
    this._grabbed = grabbed;
    this.trigger('grabbed', grabbed);
  }

  render(ctx, color, alpha=0.5) {
    ctx.save();

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(...this.rect);
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  updateMouseDown(point) {
    if (this.hover) {
      this.grabbed = true;
    }
  }

  updateMouseMove(point) {
    this.hover = this.rect.containsPoint(point, this.mouseThreshold);
    if (this.grabbed) {
      this.time = this.songRenderer.positionToTime(point.x);
      this.trigger('time', this.time);
    }
  }

  updateMouseUp(point) {
    this.grabbed = false;
  }
}
