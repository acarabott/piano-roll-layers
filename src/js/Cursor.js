export class Cursor {
  constructor() {
    this.states = [];
    this.snapping = false;
  }

  update() {
    const active = this.states.filter(state => state.test());
    this.style = active.length === 0
                   ? 'default'
                   : active[active.length - 1].style;

    return [active, this.style];
  }

  // @test is a function that should return a boolean value
  // @style is the cursor style to return
  addState(test, style) {
    this.states.push({ test, style });
  }

  set style(style) {
    if (style !== this.style) { document.body.style.cursor = style; }
  }

  get style() {
    return document.body.style.cursor;
  }
}
