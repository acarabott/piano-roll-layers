/*
  TODO:
  - resize layers
  - resize notes
  - nicer looking layer list
  - example button
  - adding note during playback
  - play from time
  - style
  - note release
  - put at top and overlay the vertical lines?
*/

// Helper functions
// -----------------------------------------------------------------------------

import { loop, rrandint, midiToFreq, toCapitalCase } from './utils.js';
import * as color from './color.js';
import { ModeManager, ModeManagerRenderer } from './ModeManager.js';
import { Note, NoteManager, NoteController, NoteRenderer } from './Note.js';
import { AudioPlayback } from './AudioPlayback.js';
import { LayerManager } from './LayerManager.js';
import { LayerRenderer } from './LayerRenderer.js';
import { Rectangle } from './Rectangle.js';
import { Cursor } from './Cursor.js';
import { Point } from './Point.js';
import { Scroll } from './Scroll.js';

// constants
const NUM_KEYS = 25;
const DURATION = 10;
const ROOT_NOTE = 60;

const container = document.getElementById('container');
// info
const info = document.createElement('div');
container.appendChild(info);

// canvas
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 400;
canvas.setAttribute('tabindex', 1);
container.appendChild(canvas);
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
info.appendChild(modeManagerRenderer.label);
info.appendChild(modeManagerRenderer.select);
const layerManager = new LayerManager();
layerManager.parentRect = patternRect;
layerManager.numKeys = NUM_KEYS;

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

container.appendChild(controls);

const playButton = document.createElement('button');
playButton.textContent = 'Play';
playButton.style.display = 'block';
playButton.style.width = `${canvas.width}px`;
playButton.style.fontSize = '20px';
playButton.style.background = 'white';
playButton.style.marginBottom = '20px';

window.playButton = playButton;
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
subdivisionInput.style.width = '40px';
layerManager.bind('currentChanged', layer => {
  if (layer !== undefined) subdivisionInput.value = layer.subdivision;
});
layerManager.bind('subdivisionChanged', subdivision => {
  subdivisionInput.value = subdivision;
  subdivisionInput.selectionStart = 0;
  subdivisionInput.selectionEnd = subdivisionInput.value.length;
});
layerManager.bind('subdivisionStringChanged', subdivisionString => {
  if (subdivisionString !== '') {
    subdivisionInput.value = subdivisionString;
  }
});



const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
controls.appendChild(subdivisionLabel);
controls.appendChild(subdivisionInput);
controls.appendChild(document.createElement('br'));

const scroll = new Scroll();
scroll.sensitivity = 0.125;
scroll.range = 1;
scroll.min = 1;
layerManager.bind('currentChanged', layer => {
  if (layer !== undefined) scroll.valueAsFloat = layer.subdivision;
});


const scrollLabel = document.createElement('div');
scrollLabel.textContent = 'Input';
scrollLabel.style.fontWeight = 'bold';
controls.appendChild(scrollLabel);

['trackpad', 'mouse'].forEach((name, i) => {
  const input = document.createElement('input');
  input.id = `scroll${name}`;
  input.type = 'radio';
  input.name = 'scroll';
  input.checked = i === 0 ? 'checked' : '';
  input.addEventListener('change', event => {
    scroll.trackpad = name === 'trackpad';
  });
  const label = document.createElement('label');
  label.htmlFor = input.id;
  label.textContent = `${toCapitalCase(name)}: `;
  label.style.marginLeft = '10px';
  controls.appendChild(label);
  controls.appendChild(input);
  controls.appendChild(document.createElement('br'));
});

controls.appendChild(layerManager.list);


// user input
let snapping = true;

const cursor = new Cursor();
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.layers, 'crosshair');
cursor.addCursorState(() => layerManager.grabbableLayer !== undefined, 'move');
cursor.addCursorState(() => layerManager.dragging, 'move');
cursor.addCursorState(() => layerManager.copying, 'copy');
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.notes, 'pointer');
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.notes && noteController.isGrabbing, 'move');
cursor.addCursorState(() => modeManager.currentMode === modeManager.modes.notes && noteController.isHovering, 'move');


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
  LayerRenderer.render(ctx, layerManager);

  // notes
  noteController.render(ctx);

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
  audioPlayback.update();
  cursor.update();
  updatePlayButton();
}

// User Input
// -----------------------------------------------------------------------------

function getPointFromInput(event) {
  let point = new Point(event.offsetX, event.offsetY);
  if (snapping) { point = layerManager.snapPointToLayers(point); }
  return point;
}

canvas.addEventListener('mousedown', event => {
  const point = new Point(event.offsetX, event.offsetY);

  if (modeManager.currentMode === modeManager.modes.layers) {
    layerManager.updateMouseDown(point, snapping);
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    const snappedPoint = getPointFromInput(event);
    noteController.updateMouseDown(point, snappedPoint, layerManager.currentRect);

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
  const point = new Point(event.offsetX, event.offsetY);

  if (modeManager.currentMode === modeManager.modes.layers) {
    if (event.srcElement === canvas) {
      layerManager.updateMouseUp(point);
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    noteController.updateMouseUp(point, event.srcElement === canvas);
  }

  layerManager.setDraggingLayer(undefined);
  audioPlayback.previewNote = undefined;
});

canvas.addEventListener('mousemove', event => {
  const point = new Point(event.offsetX, event.offsetY);

  layerManager.updateMouseMove(point, snapping);

  if (modeManager.currentMode === modeManager.modes.notes) {
    const snappedPoint = getPointFromInput(event);
    const focusedSnappedPoint = layerManager.currentLayer === undefined
      ? snappedPoint
      : snapping
        ? new Point(layerManager.currentRect.x, snappedPoint.y)
        : point;

    noteController.updateMouseMove(point, focusedSnappedPoint, layerManager.currentRect);

    audioPlayback.previewNote = noteController.isGrabbing
      ? noteController.grabbed[0]
      : noteManager.currentNote;
  }
});

document.addEventListener('keydown', event => {
  // right handed
  if      (event.code === 'KeyQ')   { modeManager.currentMode = modeManager.modes.layers; }
  else if (event.code === 'KeyW')   { modeManager.currentMode = modeManager.modes.notes; }
  else if (event.code === 'KeyA')   { layerManager.cycleCurrentLayerBackward(); }
  else if (event.code === 'KeyS')   { layerManager.cycleCurrentLayerForward(); }
  // left handed
  else if (event.code === 'KeyO')   { modeManager.currentMode = modeManager.modes.layers; }
  else if (event.code === 'KeyP')   { modeManager.currentMode = modeManager.modes.notes; }
  else if (event.code === 'KeyK')   { layerManager.cycleCurrentLayerBackward(); }
  else if (event.code === 'KeyL')   { layerManager.cycleCurrentLayerForward(); }
  else if (event.code === 'Space')  { event.preventDefault(); audioPlayback.isPlaying ? stopPlayback() : startPlayback(); }
  else if (event.key  === 'Alt')     { layerManager.copying = true; }
  else if (event.key  === 'Escape')  {
    layerManager.creation.active = false;
    if (document.activeElement !== canvas) {
      document.activeElement.blur();
    }
  }
  else if (event.key  === 'Shift')   {
    snapping = false;
    layerManager.adjustingSubdivision = true;
  }
  else if (event.key === 'Backspace') {
    if (modeManager.currentMode === modeManager.modes.layers) {
      layerManager.removeLayer(layerManager.currentLayer);
    }
    else if (modeManager.currentMode === modeManager.modes.notes) {
      noteController.hovering.forEach(note => noteManager.deleteNote(note));
    }
  }

  // subdivision input
  if (event.target === canvas) {
    if (isFinite(parseInt(event.key, 10))) {
      layerManager.subdivisionInput(event.key);
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

  if (event.code === 'KeyQ' || event.code === 'KeyO') { modeManager.currentMode = modeManager.modes.layers; }
  if (event.code === 'KeyW' || event.code === 'KeyP') { modeManager.currentMode = modeManager.modes.notes; }
});

subdivisionInput.addEventListener('input', event => {
  layerManager.subdivisionInput(event.data);
});

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
    const rect = new Rectangle(x, y , width, height);
    layerManager.addLayer(rect, rrandint(1, 10));
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
window.modeManagerRenderer = modeManagerRenderer;
window.layerManager = layerManager;
window.noteManager = noteManager;
window.audio = audio;
window.audioPlayback = audioPlayback;
window.noteRenderer = noteRenderer;
window.noteController = noteController;
