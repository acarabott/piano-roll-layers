export class ModeManager {
  constructor() {
    this.modes = {};
    this._currentMode = undefined;
    this.changed = true;
  }

  addModes(...names) {
    names.forEach(name => this.modes[name] = Symbol(name));
  }

  get currentMode() {
    const found = Object.entries(this.modes).find(e => e[1] === this._currentMode);
    return found !== undefined ? found[0] : undefined;
  }

  set currentMode(name) {
    if (Object.keys(this.modes).includes(name)) {
      this._currentMode = this.modes[name];
      this.changed = true;
    }
  }
}

export class ModeManagerRenderer {
  constructor(modeManager) {
    this.manager = modeManager;
    this.label = document.createElement('div');
  }

  update() {
    if (this.manager.changed) {
      const currentModeEntry = Object.entries(this.manager.modes).find(pair => {
        return pair[1] === this.manager.currentMode;
      });
      const label = currentModeEntry === undefined
        ? ''
        : `${currentModeEntry[0][0].toUpperCase()}${currentModeEntry[0].slice(1)}`;
      this.label.textContent = `Mode: ${label}`;
      this.manager.changed = false;
    }
  }
}
