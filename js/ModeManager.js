import { toCapitalCase } from './utils.js';

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
    return this._currentMode;
  }

  set currentMode(symbol) {
    if (Object.values(this.modes).includes(symbol)) {
      this._currentMode = symbol;
      this.changed = true;
    }
    else {
      throw new TypeError(`Invalid mode: ${symbol}`);
    }
  }

  getNameForMode(symbol) {
    return Object.entries(this.modes).find(e => e[1] === this._currentMode)[0];
  }
}

export class ModeManagerRenderer {
  constructor(modeManager) {
    this.manager = modeManager;
    this.label = document.createElement('div');
  }

  update() {
    if (this.manager.changed) {
      const label = this.manager.currentMode === undefined
        ? ''
        : toCapitalCase(this.manager.getNameForMode(this.manager.currentMode));

      this.label.textContent = `Mode: ${label}`;
      this.manager.changed = false;
    }
  }
}
