/*
  TODO:

  - refactor bullshit
  - resize layers
  - put at top and overlay the vertical lines?
*/

// Helper functions
// -----------------------------------------------------------------------------

import { loop, rrandint, midiToFreq } from './utils.js';
import * as color from './color.js';
import { ModeManager, ModeManagerRenderer } from './ModeManager.js';
import { Note, NoteManager } from './Note.js';
import { LayerManager } from './LayerManager.js';
import { Rectangle } from './Rectangle.js';
import { Cursor } from './Cursor.js';
import { Point } from './Point.js';
import { Scroll } from './Scroll.js';

const modeManager = new ModeManager();
modeManager.addModes('layers', 'notes');
modeManager.currentMode = modeManager.modes.layers;
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

const cursor = new Cursor();
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.layers, 'crosshair');
cursor.addCursorState(() => layerManager.grabbableLayers.length > 0, 'move');
cursor.addCursorState(() => layerManager.dragging, 'move');
cursor.addCursorState(() => layerManager.copying, 'copy');
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.notes, 'pointer');

const scroll = new Scroll();
scroll.range = 0.25;
scroll.min = 1;

const controls = document.createElement('div');
controls.id = 'controls';
document.body.appendChild(controls);
const subdivisionInput = document.createElement('input');
subdivisionInput.id = 'subdivision';
subdivisionInput.type = 'text';
subdivisionInput.value = 3;
const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
controls.appendChild(subdivisionLabel);
controls.appendChild(subdivisionInput);
controls.appendChild(modeManagerRenderer.label);

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

  if (layerManager.creation.active) {
    ctx.strokeStyle = color.green;
    ctx.setLineDash([20, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(...layerManager.creation.rect);
  }

  if (layerManager.dragging) {
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 10]);
    ctx.strokeStyle = layerManager.dragging.copy ? color.green : color.black;
    layerManager.draggingLayer.rects.forEach(rect => ctx.strokeRect(...rect));
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
  if (layerManager.currentLayer !== undefined) {
    if (layerManager.currentChanged) {
      subdivisionInput.value = layerManager.currentLayer.subdivision;
      scroll.valueAsFloat = layerManager.currentLayer.subdivision;
      layerManager.currentChanged = false;
    }
    if (layerManager.currentLayer.subdivisionChanged) {
      subdivisionInput.value = layerManager.currentLayer.subdivision;
      layerManager.currentLayer.subdivisionChanged = false;
    }
  }

  modeManagerRenderer.update();
  cursor.update();
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

function rectPointToMidiNote(rectangle, point, rootNote, numNotes) {
  const noteHeight = rectangle.height / numNotes;
  const noteIdx = numNotes - 1 - ((point.y - (point.y % noteHeight)) / noteHeight);
  return rootNote + noteIdx;
}

canvas.addEventListener('mousedown', event => {
  if (modeManager.currentMode === modeManager.modes.layers) {
    if (layerManager.grabbableLayers.length > 0) {
      const chosen = layerManager.grabbableLayers[0];
      const point = new Point(event.offsetX, event.offsetY);
      layerManager.setDraggingLayer(chosen, point);
    }
    else {
      layerManager.creation.active = true;
      const point = getPointFromInput(event);
      layerManager.creation.rect.tl = point;
      layerManager.creation.rect.br = point;
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    const point = getPointFromInput(event);
    const midiNote = rectPointToMidiNote(patternRect, point, 60, NUM_KEYS);
    const freq = midiToFreq(midiNote);
    // TODO this is a hack, hardcoded length on the grid...
    const sampleStart = ((point.x - patternRect.x) / patternRect.width) * 10 * audio.sampleRate;
    const sampleEnd = sampleStart + 0.25 * audio.sampleRate;
    noteManager.currentNote = new Note(freq, sampleStart, sampleEnd);
  }
});

document.addEventListener('mousedown', event => {
  if (modeManager.currentMode === modeManager.modes.layers) {
    if (event.target === document.body) {
      layerManager.currentLayer = undefined;
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    // console.log('notes mousedown2');
  }
});

document.addEventListener('mouseup', event => {
  if (modeManager.currentMode === modeManager.modes.layers) {
    if (event.srcElement === canvas) {
      if (layerManager.creation.active) {
        layerManager.creation.active = false;
        const selRect = layerManager.creation.rect;
        if (selRect.width > 0 && selRect.height > 0) {
          const layer = layerManager.addLayer(...selRect, currentSubdivision());
          layerManager.currentLayer = layer;
          subdivisionInput.focus();
          subdivisionInput.selectionStart = 0;
          subdivisionInput.selectionEnd = subdivisionInput.value.length;
        }
      }

      if (layerManager.dragging) {
        if (layerManager.dragging.copy) {
          // copy the layer
          const layer = layerManager.addLayer(...layerManager.draggingLayer.frame,
                                              layerManager.draggingLayer.subdivision);

          // reset the original
          layerManager.draggingLayer.x = layerManager.dragging.origin.x;
          layerManager.draggingLayer.y = layerManager.dragging.origin.y;
          layerManager.currentLayer = layer;
        }
        else {
          // move the original
          layerManager.moveDraggedLayer();
        }
        subdivisionInput.focus();
        layerManager.stopDragging();
      }
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    if (event.srcElement === canvas) {
      noteManager.addNote(noteManager.currentNote);
    }
    noteManager.currentNote = undefined;
  }

  layerManager.setDraggingLayer(undefined);
});

canvas.addEventListener('mousemove', event => {
  if (modeManager.currentMode === modeManager.modes.layers) {
    // creation
    if (layerManager.creation.active) {
      const point = getPointFromInput(event);
      layerManager.creation.rect.br = point;
    }

    // update
    if (!layerManager.creation.active) {
      layerManager.updateMove(new Point(event.offsetX, event.offsetY));
    }

    // dragging layer
    if (layerManager.dragging) {
      const inputPoint = new Point(event.offsetX, event.offsetY);
      let origin = inputPoint.subtract(layerManager.dragOffset);
      if (snapping) { origin = snapPointToLayers(origin); }
      layerManager.dragTo(origin);
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    if (noteManager.currentNote !== undefined) {
      const point = getPointFromInput(event);
      const midiNote = rectPointToMidiNote(patternRect, point, 60, NUM_KEYS);
      const freq = midiToFreq(midiNote);
      noteManager.currentNote.freq = freq;
      noteManager.currentNote.sampleEnd = ((point.x - patternRect.x) / patternRect.width) * 10 * audio.sampleRate;
    }
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Shift' && snapping) { snapping = false; }
  if (event.key === 'Alt')               { layerManager.copying = true; }
  if (event.key === 'Shift')             { layerManager.adjustingSubdivision = true; }
  if (event.key === 'Escape')            { document.activeElement.blur(); }

  if (event.code === 'KeyQ') { modeManager.currentMode = modeManager.modes.layers; }
  if (event.code === 'KeyW') { modeManager.currentMode = modeManager.modes.notes; }
  if (document.activeElement === subdivisionInput && ['KeyQ', 'KeyW'].includes(event.code)) {
    event.preventDefault();
  }

  // key='Shift'      code='ShiftLeft'
  // key='Control'    code='ControlLeft'
  // key='Alt'        code='AltLeft'
  // key='Meta'       code='MetaLeft'
  // key='Meta'       code='MetaLeft'
});

document.addEventListener('keyup', event => {
  if (event.key === 'Shift' && !snapping) { snapping = true; }
  if (event.key === 'Alt')                { layerManager.copying = false; }
  if (event.key === 'Shift')              { layerManager.adjustingSubdivision = false; }
});

subdivisionInput.addEventListener('input', event => {
  if (layerManager.currentLayer !== undefined) {
    layerManager.currentLayer.subdivision = currentSubdivision();
    layerManager.layersChanged = true;
  }
});


const scrollSensitivityInput = document.createElement('input');
scrollSensitivityInput.type = 'number';
scrollSensitivityInput.id = 'scrollSensitivity';
scrollSensitivityInput.min = 0;
scrollSensitivityInput.max = 1.0;
scrollSensitivityInput.value = 0.3;
scrollSensitivityInput.step = 0.01;
scrollSensitivityInput.addEventListener('input', event => {
  scroll.sensitivity = scrollSensitivityInput.valueAsNumber;
});
const scrollSensitivityLabel = document.createElement('label');
scrollSensitivityLabel.htmlFor = 'scrollSensitivity';
scrollSensitivityLabel.textContent = 'Scroll Sensitivity: ';
controls.appendChild(scrollSensitivityLabel);


controls.appendChild(scrollSensitivityInput);
canvas.addEventListener('wheel', event => {
  if (layerManager.adjustingSubdivision) {
    event.preventDefault();
    if (layerManager.currentLayer !== undefined) {
      scroll.update(event);
      layerManager.currentLayer.subdivision = scroll.valueAsInt;
    }
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

window.modeManager = modeManager;
window.layerManager = layerManager;
