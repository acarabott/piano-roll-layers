import { toCapitalCase } from './utils.js';

export class ModeManager {
  constructor() {
    this.modes = {};
    this._currentMode = undefined;
    this.currentModeChanged = true;
    this.modesChanged = true;
  }

  addModes(...names) {
    names.forEach(name => this.modes[name] = Symbol(name));
    this.modesChanged = true;
  }

  get currentMode() {
    return this._currentMode;
  }

  set currentMode(symbol) {
    if (Object.values(this.modes).includes(symbol)) {
      this._currentMode = symbol;
      this.currentModeChanged = true;
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
    this.select = document.createElement('select');
    this.select.id = 'modeSelect';
    this.select.name = 'modeSelect';
    this.select.addEventListener('change', event => {
      this.manager.currentMode = this.manager.modes[event.target.value];
    });
    this.label = document.createElement('label');
    this.label.htmlFor = this.select.id;
    this.label.textContent = 'Mode: ';
  }

  updateOptions() {
    Object.values(this.select.children).forEach(child => this.select.remove(child));

    Object.entries(this.manager.modes).forEach(entry => {
      const label = entry[0];
      const option = document.createElement('option');
      option.value = label;
      option.textContent = toCapitalCase(label);
      this.select.appendChild(option);
    });
  }

  update() {
    if (this.manager.currentModeChanged) {
      this.select.value = this.manager.getNameForMode(this.manager.currentMode);
      this.manager.currentModeChanged = false;
    }

    if (this.manager.modesChanged) {
      this.updateOptions();
      this.manager.modesChanged = false;
    }
  }
}
