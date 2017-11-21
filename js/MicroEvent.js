export class MicroEvent {
  constructor() {
    this._events = {};
  }

  bind(event, func) {
    if (!this._events.hasOwnProperty(event)) { this._events[event] = []; }
    this._events[event].push(func);
  }

  unbind(event, func) {
    if (this._events.hasOwnProperty(event)) {
      this._events[event].splice(this._events[event].indexOf(func), 1);
    }
  }

  trigger(event, ...args) {
    if (this._events.hasOwnProperty(event)) {
      this._events[event].forEach(func => func(...args));
    }
  }

  static mixin(obj) {
    const target = typeof obj === 'function' ? obj.prototype : obj;
    if (target.hasOwnProperty('_events')) {
      throw new Error('target already has an "_events" property, cannot add MicroEvent mixin');
    }
    else {
      target._events = {};
    }

    ['bind', 'unbind', 'trigger'].forEach(prop => {
      target[prop] = MicroEvent.prototype[prop];
    });

    return obj;
  }
}
