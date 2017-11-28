import { toCapitalCase } from './utils.js';
import { MicroEvent } from './MicroEvent.js';

export class ModeManager {
  constructor() {
    this.modes = {};
    this._currentMode = undefined;
  }

  addModes(...names) {
    names.forEach(name => this.modes[name] = Symbol(name));
    this.trigger('modeListChanged', this.modes);
  }

  get currentMode() {
    return this._currentMode;
  }

  set currentMode(symbol) {
    if (Object.values(this.modes).includes(symbol)) {
      this._currentMode = symbol;
      this.trigger('currentModeChanged', this._currentMode);
    }
    else {
      throw new TypeError(`Invalid mode: ${symbol}`);
    }
  }

  getNameForMode(symbol) {
    return Object.entries(this.modes).find(e => e[1] === this._currentMode)[0];
  }
}

MicroEvent.mixin(ModeManager);

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

    this.manager.bind('currentModeChanged', currentMode => {
      this.select.value = this.manager.getNameForMode(currentMode);
    });

    this.manager.bind('modeListChanged', modes => this.updateOptions(modes));
    this.updateOptions(this.manager.modes);
  }

  updateOptions(modes) {
    Object.values(this.select.children).forEach(child => this.select.remove(child));

    Object.entries(modes).forEach(entry => {
      const label = entry[0];
      const option = document.createElement('option');
      option.value = label;
      option.textContent = toCapitalCase(label);
      this.select.appendChild(option);
    });
  }
}
