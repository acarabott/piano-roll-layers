/*
  TODO:
  - play from time
  - style
  - note release
  - instructions
  - put at top and overlay the vertical lines?
*/

// Helper functions
// -----------------------------------------------------------------------------

import { loop, rrandint, midiToFreq } from './utils.js';
import * as color from './color.js';
import { ModeManager, ModeManagerRenderer } from './ModeManager.js';
import { Note, NoteManager, NoteController, NoteRenderer } from './Note.js';
import { AudioPlayback } from './AudioPlayback.js';
import { LayerManager } from './LayerManager.js';
import { Rectangle } from './Rectangle.js';
import { Cursor } from './Cursor.js';
import { Point } from './Point.js';
import { Scroll } from './Scroll.js';

// constants
const NUM_KEYS = 20;
const DURATION = 10;
const ROOT_NOTE = 60;

// canvas
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 400;
canvas.setAttribute('tabindex', 1);
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

const keyRect = new Rectangle(0, 0, canvas.width * 0.075, canvas.height);
const patternRect = new Rectangle(keyRect.br.x,
                                  keyRect.y,
                                  canvas.width - keyRect.width,
                                  keyRect.height);

// managers
const modeManager = new ModeManager();
modeManager.addModes('layers', 'notes');
modeManager.currentMode = modeManager.modes.layers;
const modeManagerRenderer = new ModeManagerRenderer(modeManager);
const layerManager = new LayerManager();

const noteManager = new NoteManager();
const noteRenderer = new NoteRenderer();
noteRenderer.parentRect = patternRect;
noteRenderer.duration = DURATION;
noteRenderer.numKeys = NUM_KEYS;
noteRenderer.rootNote = ROOT_NOTE;
const noteController = new NoteController(noteManager, noteRenderer);

// audio
const audio = new AudioContext();
const audioPlayback = new AudioPlayback(audio);
audioPlayback.duration = DURATION;

function startPlayback() {
  audioPlayback.playFrom(noteManager.notes);
}

function stopPlayback() {
  audioPlayback.stop();
}




// ui
const controls = document.createElement('div');
controls.id = 'controls';
document.body.appendChild(controls);

const playButton = document.createElement('button');
playButton.textContent = 'Play';
playButton.style.display = 'block';
function updatePlayButton() {
  playButton.textContent = audioPlayback.isPlaying ? 'Stop' : 'Play';
}
playButton.addEventListener('click', event => {
  audioPlayback.isPlaying ? stopPlayback() : startPlayback();
  updatePlayButton();
});
controls.appendChild(playButton);

const subdivisionInput = document.createElement('input');
subdivisionInput.id = 'subdivision';
subdivisionInput.type = 'text';
subdivisionInput.value = layerManager.subdivision;

const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
controls.appendChild(subdivisionLabel);
controls.appendChild(subdivisionInput);
controls.appendChild(modeManagerRenderer.label);

// user input
let snapping = true;

const cursor = new Cursor();
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.layers, 'crosshair');
cursor.addCursorState(() => layerManager.grabbableLayers.length > 0, 'move');
cursor.addCursorState(() => layerManager.dragging, 'move');
cursor.addCursorState(() => layerManager.copying, 'copy');
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.notes, 'pointer');
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.notes && noteController.isGrabbing, 'move');
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.notes && noteController.isHovering, 'move');

const scroll = new Scroll();
scroll.range = 0.25;
scroll.min = 1;

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
    ctx.strokeStyle = color.blue;
    ctx.setLineDash([20, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(...layerManager.creation.rect);
  }

  if (layerManager.dragging) {
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 10]);
    ctx.strokeStyle = layerManager.copying ? color.green : color.black;
    layerManager.draggingLayer.rects.forEach(rect => ctx.strokeRect(...rect));
  }

  // notes
  noteController.render(ctx);

  if (modeManager.currentMode === modeManager.modes.notes &&
      layerManager.currentRect !== undefined)
  {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color.blue;
    ctx.fillRect(...layerManager.currentRect);
  }

  // playhead
  {
    ctx.fillStyle = color.red;
    ctx.globalAlpha = 0.8;
    const curTime = audioPlayback.isPlaying
      ? (audio.currentTime - audioPlayback.audioStart)
      : 0;
    const normTime = curTime / DURATION;
    const x = patternRect.x + Math.max(0, patternRect.width * normTime);
    ctx.fillRect(x, 0, 3, canvas.height);
    ctx.globalAlpha = 1.0;
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
      subdivisionInput.value = layerManager.subdivision;
      subdivisionInput.selectionStart = 0;
      subdivisionInput.selectionEnd = subdivisionInput.value.length;
      layerManager.currentLayer.subdivisionChanged = false;
    }
  }
  if (layerManager.subdivisionString !== '' &&
      layerManager.subdivisionString !== subdivisionInput.value)
  {
    subdivisionInput.value = layerManager.subdivisionString;
  }

  audioPlayback.update();
  modeManagerRenderer.update();
  cursor.update();
  updatePlayButton();
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

function snapPointToLayers(point, thresh = 20) {
  const rects = [patternRect, ...layerManager.rects];
  return getSnappedPoint(point, patternRect, NUM_KEYS, rects, thresh);
}

function getPointFromInput(event) {
  let point = new Point(event.offsetX, event.offsetY);
  if (snapping) { point = snapPointToLayers(point); }
  return point;
}

canvas.addEventListener('mousedown', event => {
  const point = new Point(event.offsetX, event.offsetY);
  const snappedPoint = getPointFromInput(event);

  if (modeManager.currentMode === modeManager.modes.layers) {
    layerManager.updateMouseDown(point, snappedPoint);
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    const targetRect = layerManager.currentRect === undefined
      ? patternRect
      : layerManager.currentRect;
    noteController.updateMouseDown(point, snappedPoint, targetRect);

    audioPlayback.previewNote = noteController.isGrabbing
      ? noteController.grabbed[0]
      : noteManager.currentNote;
  }
});

document.addEventListener('mousedown', event => {
  if (modeManager.currentMode === modeManager.modes.layers) {
    if (event.target === document.body) {
      layerManager.currentLayer = undefined;
    }
  }
});

document.addEventListener('mouseup', event => {
  if (modeManager.currentMode === modeManager.modes.layers) {
    if (event.srcElement === canvas) {
      layerManager.updateMouseUp();
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    const point = new Point(event.offsetX, event.offsetY);
    noteController.updateMouseUp(point, event.srcElement === canvas);
  }

  layerManager.setDraggingLayer(undefined);
  audioPlayback.previewNote = undefined;
});

canvas.addEventListener('mousemove', event => {
  const point = new Point(event.offsetX, event.offsetY);
  const snappedPoint = getPointFromInput(event);

  layerManager.updateMove(point, snappedPoint);

  if (modeManager.currentMode === modeManager.modes.layers) {
    // dragging layer
    if (layerManager.dragging) {
      const inputPoint = new Point(event.offsetX, event.offsetY);
      let origin = inputPoint.subtract(layerManager.dragOffset);
      if (snapping) { origin = snapPointToLayers(origin); }
      layerManager.dragTo(origin);
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    const targetRect = layerManager.currentRect === undefined
      ? patternRect
      : layerManager.currentRect;

    const focusedSnappedPoint = layerManager.currentLayer === undefined
      ? snappedPoint
      : snapping
        ? new Point(targetRect.x, snappedPoint.y)
        : point;

    noteController.updateMouseMove(point, focusedSnappedPoint, targetRect);

    audioPlayback.previewNote = noteController.isGrabbing
      ? noteController.grabbed[0]
      : noteManager.currentNote;
  }
});

document.addEventListener('keydown', event => {
  if      (event.key === 'Shift')   { snapping = false; }
  else if (event.key === 'Alt')     { layerManager.copying = true; }
  else if (event.key === 'Shift')   { layerManager.adjustingSubdivision = true; }
  else if (event.key === 'Escape')  { document.activeElement.blur(); }
  else if (event.code === 'KeyQ')   { modeManager.currentMode = modeManager.modes.layers; }
  else if (event.code === 'KeyW')   { modeManager.currentMode = modeManager.modes.notes; }
  else if (event.code === 'Space')  { event.preventDefault(); audioPlayback.isPlaying ? stopPlayback() : startPlayback(); }

  if (event.target === canvas) {
    if (isFinite(parseInt(event.key, 10))) {
      layerManager.subdivisionInput(event.key);
    }
    if (event.key === 'Backspace') {
      if (modeManager.currentMode === modeManager.modes.layers) {
        if (layerManager.currentLayer !== undefined) {
          layerManager.removeLayer(layerManager.currentLayer);
        }
      }
      else if (modeManager.currentMode === modeManager.modes.notes) {
        noteController.hovering.forEach(note => noteManager.deleteNote(note));
      }
    }
  }
});

document.addEventListener('keyup', event => {
  if      (event.key === 'Shift') { snapping = true; }
  else if (event.key === 'Alt')   { layerManager.copying = false; }
  else if (event.key === 'Shift') { layerManager.adjustingSubdivision = false; }
});

subdivisionInput.addEventListener('keydown', event => {
  const whitelist = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
    'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp',
    'Control', 'Alt', 'Meta', 'Shift', 'Tab', 'Backspace', 'Delete', 'Enter'];
  if (!whitelist.includes(event.key)) { event.preventDefault(); }

  if (event.code === 'KeyQ') { modeManager.currentMode = modeManager.modes.layers; }
  if (event.code === 'KeyW') { modeManager.currentMode = modeManager.modes.notes; }
});

subdivisionInput.addEventListener('input', event => {
  layerManager.subdivisionInput(event.data);
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

  loop(10, (i, n) => {
    const midiNote = Math.floor(Math.random() * NUM_KEYS) + ROOT_NOTE;
    const freq = midiToFreq(midiNote);
    const timeStart = DURATION * 0.75 * Math.random();
    const timeStop = timeStart + Math.random() + 0.2;
    const note = new Note(freq, timeStart, timeStop);
    noteManager.addNote(note);
  });
}

// test();
document.addEventListener('DOMContentLoaded', mainLoop);

window.modeManager = modeManager;
window.layerManager = layerManager;
window.noteManager = noteManager;
window.audio = audio;
window.audioPlayback = audioPlayback;
window.noteRenderer = noteRenderer;
window.noteController = noteController;
