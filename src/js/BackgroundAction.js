export class BackgroundAction {
  constructor(action, deferTimeMs) {
    this.action = action;
    this.deferTimeMs = deferTimeMs;
    this.timer = undefined;
  }

  start() {
    this.cancel();
    this.timer = setInterval(() => {
      if (!this.action()) { this.cancel(); }
    }, this.deferTimeMs);
  }

  cancel() {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
