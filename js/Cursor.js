class Cursor {
  constructor() {
    this.cursorStates = [];
  }

  update() {
    const active = this.cursorStates.filter(state => state.testFunc());
    this.style = active.length === 0
                   ? 'default'
                   : active[active.length - 1].style;

    return [active, this.style];
  }

  // @testFunc is a function that should return a boolean value
  // @style is the cursor style to return
  addCursorState(testFunc, style) {
    this.cursorStates.push({testFunc, style});
  }

  set style(style) {
    if (style !== this.style) { document.body.style.cursor = style; }
  }

  get style() {
    return document.body.style.cursor;
  }
}
