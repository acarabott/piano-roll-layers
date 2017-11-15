/* global Point, Rectangle, Layer, LayerManager */

/*
  TODO:

  - resize layers
  - put at top and overlay the vertical lines?
  - dont use linlin for midi note number, gets fucked up.
*/

// Helper functions
// -----------------------------------------------------------------------------

function loop(n, func) {
  for (let i = 0; i < n; i++) {
    func(i, n);
  }
}

function linlin(val, inMin, inMax, outMin, outMax, clamp='minmax') {
  if (clamp === 'minmax') {
    if (val <= inMin) { return outMin; }
    if (val >= inMax) { return outMax; }
  }
  else if (clamp === 'min' && val <= inMin) { return outMin; }
  else if (clamp === 'max' && val >= inMax) { return outMax; }
  return outMin + (((val - inMin) / (inMax - inMin)) * (outMax - outMin));
}

function constrain(val, min=0, max=1.0) {
  return Math.min(Math.min(val, max), min);
}

function rrand(min, max) {
  return min + (Math.random() * (max - min));
}

function rrandint(min, max) {
  return Math.floor(rrand(min, max));
}

function midiToFreq(midinote) {
  return 440 * Math.pow(2, (midinote - 69) * 0.08333333333333333333333333);
}

function freqToMidi(freq) {
  return Math.log2(freq * 0.002272727272727272727272727) * 12 + 69;
}

const color = {
  blue:   'rgb(43, 156, 212)',
  red:    'rgb(212, 100, 100)',
  orange: 'rgb(249, 182, 118)',
  green:  'rgb(43, 212, 156)',
  black:  'rgb(0, 0, 0)'
};

const modes = {
  layers: Symbol('layers'),
  notes: Symbol('notes')
};

class ModeManager {
  constructor() {
    this._currentMode = modes.layers;
    this.changed = true;
  }

  get currentMode() {
    return this._currentMode;
  }

  set currentMode(mode) {
    this._currentMode = mode;
    this.changed = true;
    document.body.style.cursor = mode === modes.notes  ? 'pointer'
                               : mode === modes.layers ? 'crosshair'
                               : 'default';
  }
}

class ModeManagerRenderer {
  constructor(modeManager) {
    this.modeManager = modeManager;
    this.label = document.createElement('div');
  }

  update() {
    if (this.modeManager.changed) {
      const currentModeEntry = Object.entries(modes).find(pair => {
        return pair[1] === this.modeManager.currentMode;
      });
      const label = currentModeEntry === undefined
        ? ''
        : `${currentModeEntry[0][0].toUpperCase()}${currentModeEntry[0].slice(1)}`;
      this.label.textContent = `Mode: ${label}`;
      this.modeManager.changed = false;
    }
  }
}

const modeManager = new ModeManager();
modeManager.currentMode = modes.layers;
const modeManagerRenderer = new ModeManagerRenderer(modeManager);

const audio = new AudioContext();
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 400;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
const layerManager = new LayerManager();
let snapping = true;
const NUM_KEYS = 20;

const keyRect = new Rectangle(0, 0, canvas.width * 0.075, canvas.height);
const patternRect = new Rectangle(keyRect.br.x,
                                  keyRect.y,
                                  canvas.width - keyRect.width,
                                  keyRect.height);


const controls = document.createElement('div');
controls.id = 'controls';
document.body.appendChild(controls);
const subdivisionInput = document.createElement('input');
subdivisionInput.id = 'subdivision';
subdivisionInput.type = 'text';
subdivisionInput.value = 3;
subdivisionInput.min = 1;
const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
controls.appendChild(subdivisionLabel);
controls.appendChild(subdivisionInput);
controls.appendChild(modeManagerRenderer.label);

class Note {
  constructor(freq, sampleStart, sampleEnd) {
    this.freq = freq;
    this.sampleStart = sampleStart;
    this._sampleEnd = sampleEnd;
  }

  render(ctx, style, parentRect, parentNumSamples, parentNumNotes) {
    const x = parentRect.x + (this.sampleStart / parentNumSamples) * parentRect.width;
    const midiNote = freqToMidi(this.freq);
    const noteHeight = parentRect.height / parentNumNotes;
    const y = parentRect.height - noteHeight - Math.floor(linlin(midiNote, 60, 60 + NUM_KEYS, 0, parentRect.height));
    const width = Math.max(2, parentRect.width * ((this.sampleEnd - this.sampleStart) / parentNumSamples));
    ctx.fillStyle = style;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, width, noteHeight);
    ctx.globalAlpha = 1.0;
  }

  get sampleEnd() {
    return this._sampleEnd;
  }

  set sampleEnd(sampleEnd) {
    this._sampleEnd = Math.max(sampleEnd, this.sampleStart + 1);
  }
}

class NoteManager {
  constructor() {
    this._notes = [];
    this.currentNote;
  }

  get notes() { return this._notes; }

  addNote(note) {
    this._notes.push(note);
  }
}

const noteManager = new NoteManager();

function currentSubdivision() {
  const value = Math.max(parseInt(subdivisionInput.value, 10), 0);
  return isFinite(value) ? value : 1;
}


// Render functions
// -----------------------------------------------------------------------------

function renderPiano(ctx, drawRect, numKeys, alpha = 1.0) {
  const colors = ['w', 'b', 'w', 'b', 'w', 'w', 'b', 'w', 'b', 'w', 'b', 'w'];
  const keyHeight = drawRect.height / numKeys;

  loop(numKeys, i => {
    ctx.fillStyle = colors[i % colors.length] === 'w'
      ? `rgba(255, 255, 255, ${alpha}`
      : `rgba(0, 0, 0, ${alpha}`;
    const y = drawRect.y + ((numKeys - (i + 1)) * keyHeight);
    ctx.fillRect(drawRect.x, y, drawRect.width, keyHeight);
    ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
    ctx.strokeRect(drawRect.x, y, drawRect.width, keyHeight);
  });
}

function render() {
  ctx.save();
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // piano / background
  renderPiano(ctx, keyRect, NUM_KEYS);
  renderPiano(ctx, patternRect, NUM_KEYS, 0.1);

  // layers
  layerManager.layers.forEach(layer => {
    const isCurrent = layer === layerManager.currentLayer;
    layer.render(ctx, isCurrent ? color.blue : color.black,
                 isCurrent ? 2 : 1);
  });

  if (layerManager.selection.active) {
    ctx.strokeStyle = color.green;
    ctx.setLineDash([20, 10]);
    ctx.lineWidth = 4;
    ctx.strokeRect(...layerManager.selection.rect);
  }

  if (layerManager.dragging.layer !== undefined) {
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 10]);
    ctx.strokeStyle = layerManager.dragging.copy ? color.green : color.black;
    layerManager.dragging.layer.rects.forEach(rect => ctx.strokeRect(...rect));
  }

  // notes
  noteManager.notes.forEach((note, i, arr) => {
    note.render(ctx, color.blue, patternRect, 10 * audio.sampleRate, NUM_KEYS);
  });
  if (noteManager.currentNote !== undefined) {
    noteManager.currentNote.render(ctx, color.green, patternRect, 10 * audio.sampleRate, NUM_KEYS);
  }

  ctx.restore();
}


// Update loop
// -----------------------------------------------------------------------------
function update() {
  if (layerManager.layersChanged) {
    const layerList = layerManager.list;
    controls.appendChild(layerList);
    layerManager.layersChanged = false;
  }

  modeManagerRenderer.update();
}

// User Input
// -----------------------------------------------------------------------------

function getSnappedPoint(point, containerRect, vertDivision, horzRects) {
  let x = point.x;
  let minDistance = Infinity;
  horzRects.forEach(rect => {
    [rect.tl.x, rect.br.x].forEach(cx => {
      const dist = Math.abs(cx - point.x);
      if (dist < minDistance) {
        minDistance = dist;
        x = cx;
      }
    });
  });

  const vertStep = containerRect.height / vertDivision;
  const distanceToStepAbove = point.y % vertStep;
  const y = point.y - distanceToStepAbove + (distanceToStepAbove > (vertStep / 2)
                                              ? vertStep
                                              : 0);
  return new Point(x, y);
}

function snapPointToLayers(point) {
  const rects = layerManager.layers.map(l => l.rects).reduce((cur, prev) => {
    return prev.concat(cur);
  }, [patternRect]);
  return getSnappedPoint(point, patternRect, NUM_KEYS, rects);
}

function getPointFromInput(event) {
  let point = new Point(event.offsetX, event.offsetY);
  if (snapping) { point = snapPointToLayers(point); }
  return point;
}

canvas.addEventListener('mousedown', event => {
  if (modeManager.currentMode === modes.layers) {
    if (layerManager.highlightedLayers.length > 0) {
      const chosen = layerManager.highlightedLayers[0];
      layerManager.draggingLayer = chosen;
      const point = new Point(event.offsetX, event.offsetY);
      layerManager.dragging.offset = point.subtract(chosen.frame.tl);
    }
    else {
      layerManager.selection.active = true;
      const point = getPointFromInput(event);
      layerManager.selection.rect.tl = point;
      layerManager.selection.rect.br = point;
    }
  }
  else if (modeManager.currentMode === modes.notes) {
    const point = getPointFromInput(event);
    const noteHeight = patternRect.height / NUM_KEYS;
    const midiNote = Math.floor(linlin(point.y, 0, patternRect.height - noteHeight, 60 + NUM_KEYS, 60));
    const freq = midiToFreq(midiNote);
    // TODO this is a hack, hardcoded length on the grid...
    const sampleStart = ((point.x - patternRect.x) / patternRect.width) * 10 * audio.sampleRate;
    const sampleEnd = sampleStart + 0.25 * audio.sampleRate;
    noteManager.currentNote = new Note(freq, sampleStart, sampleEnd);
  }
});

document.addEventListener('mousedown', event => {
  if (modeManager.currentMode === modes.layers) {
    if (event.target === document.body) {
      layerManager.currentLayer = undefined;
    }
  }
  else if (modeManager.currentMode === modes.notes) {
    // console.log('notes mousedown2');
  }
});

document.addEventListener('mouseup', event => {
  if (modeManager.currentMode === modes.layers) {
    if (event.srcElement === canvas) {
      if (layerManager.selection.active) {
        layerManager.selection.active = false;
        const selRect = layerManager.selection.rect;
        if (selRect.width > 0 && selRect.height > 0) {
          const layer = layerManager.addLayer(...selRect, currentSubdivision());
          layerManager.currentLayer = layer;
          subdivisionInput.focus();
          subdivisionInput.selectionStart = 0;
          subdivisionInput.selectionEnd = subdivisionInput.value.length;
        }
      }

      if (layerManager.dragging.layer !== undefined) {
        if (layerManager.dragging.copy) {
          // copy the layer
          const layer = layerManager.addLayer(...layerManager.dragging.layer.frame,
                                              layerManager.dragging.layer.subdivision);

          // reset the original
          layerManager.dragging.layer.x = layerManager.dragging.origin.x;
          layerManager.dragging.layer.y = layerManager.dragging.origin.y;
          layerManager.currentLayer = layer;
        }
        else {
          // move the original
          layerManager.dragging.sourceLayer.x = layerManager.dragging.layer.x;
          layerManager.dragging.sourceLayer.y = layerManager.dragging.layer.y;

          layerManager.currentLayer = layerManager.dragging.sourceLayer;
        }
        subdivisionInput.focus();
        layerManager.dragging.clear();
      }
    }
  }
  else if (modeManager.currentMode === modes.notes) {
    if (event.srcElement === canvas) {
      noteManager.addNote(noteManager.currentNote);
    }
    noteManager.currentNote = undefined;
  }
});

canvas.addEventListener('mousemove', event => {
  if (modeManager.currentMode === modes.layers) {
    // selection
    if (layerManager.selection.active) {
      const point = getPointFromInput(event);
      layerManager.selection.rect.br = point;
    }

    // highlight on hover
    if (!layerManager.selection.active) {
      const point = new Point(event.offsetX, event.offsetY);
      layerManager.layers.forEach(layer => {
        layer.highlight = layer.frame.isPointOnLine(point, 4);
      });
    }

    // dragging layer
    if (layerManager.dragging.layer !== undefined) {
      const inputPoint = new Point(event.offsetX, event.offsetY);
      let origin = inputPoint.subtract(layerManager.dragging.offset);
      if (snapping) { origin = snapPointToLayers(origin); }
      layerManager.dragging.layer.x = origin.x;
      layerManager.dragging.layer.y = origin.y;
    }
  }
  else if (modeManager.currentMode === modes.notes) {
    if (noteManager.currentNote !== undefined) {
      const point = getPointFromInput(event);
      const noteHeight = patternRect.height / NUM_KEYS;
      const midiNote = Math.floor(linlin(point.y, 0, patternRect.height - noteHeight, 60 + NUM_KEYS, 60));
      const freq = midiToFreq(midiNote);
      noteManager.currentNote.freq = freq;
      noteManager.currentNote.sampleEnd = ((point.x - patternRect.x) / patternRect.width) * 10 * audio.sampleRate;
    }
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Shift' && snapping) { snapping = false; }
  if (event.key === 'Alt') { layerManager.copying = true; }

  if (document.activeElement !== subdivisionInput) {
    if (event.key === '1') { modeManager.currentMode = modes.layers; }
    if (event.key === '2') { modeManager.currentMode = modes.notes; }
  }
  // key='Shift'      code='ShiftLeft'
  // key='Control'    code='ControlLeft'
  // key='Alt'        code='AltLeft'
  // key='Meta'       code='MetaLeft'
  // key='Meta'       code='MetaLeft'
});

document.addEventListener('keyup', event => {
  if (event.key === 'Shift' && !snapping) { snapping = true; }
  if (event.key === 'Alt') { layerManager.copying = false; }
});

subdivisionInput.addEventListener('input',event => {
  if (layerManager.currentLayer !== undefined) {
    layerManager.currentLayer.subdivision = currentSubdivision();
    layerManager.layersChanged = true;
  }
});

// main loop
// -----------------------------------------------------------------------------
function mainLoop() {
  update();
  render();
  requestAnimationFrame(mainLoop);
}

function test() {
  loop(4, (i, n) => {
    const x = rrandint(patternRect.x, patternRect.width * 0.75);
    const y = rrandint(patternRect.y, patternRect.height * 0.75);
    const width = rrandint(patternRect.width * 0.25, patternRect.width - x);
    const height = rrandint(patternRect.height * 0.25, patternRect.height - y);
    const layer = layerManager.addLayer(x, y, width, height, rrandint(1, 10));
    if (i === n - 1) { layerManager.currentLayer = layer; }
  });
}

// test();
document.addEventListener('DOMContentLoaded', mainLoop);
