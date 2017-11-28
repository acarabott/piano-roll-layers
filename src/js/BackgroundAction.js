export class BackgroundAction {
  constructor(deferTimeMs) {
    this.deferTimeMs = deferTimeMs;
    this.timer = undefined;
  }

  set(func) {
    this.cancel();
    this.timer = setInterval(() => {
      if (!func()) { this.cancel(); }
    }, this.deferTimeMs);
  }

  cancel() {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
