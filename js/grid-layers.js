/*
  TODO:
  - example button
  - instructions
  - adding note during playback
  - play from time
  - style
  - note release
  - put at top and overlay the vertical lines?
*/

// Helper functions
// -----------------------------------------------------------------------------

import { loop, rrandint, midiToFreq } from './utils.js';
import * as color from './color.js';
import { Song } from './Song.js';
import { ModeManager, ModeManagerRenderer } from './ModeManager.js';
import { Note } from './Note.js';
import { NoteManager } from './NoteManager.js';
import { NoteController } from './NoteController.js';
import { NoteRenderer } from './NoteRenderer.js';
import { AudioPlayback } from './AudioPlayback.js';
import { LayerManager } from './LayerManager.js';
import { LayerRenderer } from './LayerRenderer.js';
import { Rectangle } from './Rectangle.js';
import { Cursor } from './Cursor.js';
import { Point } from './Point.js';

const container = document.getElementById('container');
// info
const info = document.createElement('div');
info.id = 'info';
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

const song = new Song();
song.numKeys = 20;
song.duration = 30;
song.rootNote = 60;
song.rect = patternRect;

// managers
const modeManager = new ModeManager();
modeManager.addModes('layers', 'notes');
modeManager.currentMode = modeManager.modes.layers;
const modeManagerRenderer = new ModeManagerRenderer(modeManager);
info.appendChild(modeManagerRenderer.label);
info.appendChild(modeManagerRenderer.select);
const layerManager = new LayerManager(song);

const noteManager = new NoteManager();
const noteRenderer = new NoteRenderer(song);
const noteController = new NoteController(noteManager, noteRenderer);

// audio
const audio = new AudioContext();
const audioPlayback = new AudioPlayback(audio);
audioPlayback.duration = song.duration;

function startPlayback() {
  audioPlayback.playFrom(noteManager.notes);
}

function stopPlayback() {
  audioPlayback.stop();
}


// ui
const subdivisionInput = document.createElement('span');
subdivisionInput.id = 'subdivision';
layerManager.bind('currentChanged', layer => {
  if (layer !== undefined) subdivisionInput.textContent = layer.subdivision;
});

layerManager.bind('subdivisionChanged', subdivision => {
  subdivisionInput.textContent = subdivision;
});
layerManager.bind('subdivisionStringChanged', subdivisionString => {
  if (subdivisionString !== '') {
    subdivisionInput.textContent = subdivisionString;
  }
});
const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
info.appendChild(subdivisionLabel);
info.appendChild(subdivisionInput);


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

function updatePlayButton() {
  playButton.textContent = audioPlayback.isPlaying ? 'Stop' : 'Play';
}
playButton.addEventListener('click', event => {
  audioPlayback.isPlaying ? stopPlayback() : startPlayback();
  updatePlayButton();
});
controls.appendChild(playButton);
controls.appendChild(layerManager.list);


// user input
let snapping = true;

const cursor = new Cursor();

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.layers;
}, 'crosshair');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.layers &&
         layerManager.grabbableLayer !== undefined;
}, 'move');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.layers &&
         (layerManager.resizableCorner === LayerManager.corners.tl ||
          layerManager.resizableCorner === LayerManager.corners.br);
}, 'nwse-resize');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.layers &&
         (layerManager.resizableCorner === LayerManager.corners.tr ||
          layerManager.resizableCorner === LayerManager.corners.bl);
}, 'nesw-resize');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.layers &&
         layerManager.dragging;
}, 'move');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.layers &&
         layerManager.copying;
}, 'copy');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.notes;
}, 'pointer');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.notes &&
         noteController.isGrabbing;
}, 'move');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.notes &&
         noteController.isHovering;
}, 'move');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.notes &&
         (noteController.isResizing || noteController.isResizeHovering);
}, 'ew-resize');


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
  renderPiano(ctx, keyRect, song.numKeys);
  renderPiano(ctx, patternRect, song.numKeys, 0.1);

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
    const normTime = curTime / song.duration;
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
      : noteManager.previewNote;
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
      : noteManager.previewNote;
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
  else if (event.key  === 'Alt')    { layerManager.copying = true; }
  else if (event.code === 'Space')  {
    event.preventDefault();
    audioPlayback.isPlaying ? stopPlayback() : startPlayback();
  }
  else if (event.key  === 'Escape') {
    layerManager.creation.active = false;
    if (document.activeElement !== canvas) { document.activeElement.blur(); }
  }
  else if (event.key === 'Shift')   {
    snapping = false;
    layerManager.adjustingSubdivision = true;
  }
  else if (event.key === 'Backspace') {
    if (modeManager.currentMode === modeManager.modes.layers) {
      if (layerManager.currentLayer !== layerManager.parentLayer) {
        layerManager.removeLayer(layerManager.currentLayer);
      }
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
    const midiNote = Math.floor(Math.random() * song.numKeys) + song.rootNote;
    const freq = midiToFreq(midiNote);
    const timeStart = song.duration * 0.75 * Math.random();
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
window.LayerManager = LayerManager;
window.noteManager = noteManager;
window.audio = audio;
window.audioPlayback = audioPlayback;
window.noteRenderer = noteRenderer;
window.noteController = noteController;
window.cursor = cursor;
window.song = song;
