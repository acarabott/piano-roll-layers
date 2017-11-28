/*
  TODO:
  - video instructions?
  - example button
  - style
  - better sound
  - put at top and overlay the vertical lines?
*/

// Helper functions
// -----------------------------------------------------------------------------

import { constrain, loop, midiToFreq } from './utils.js';
import * as color from './color.js';
import { Song } from './Song.js';
import { ModeManager, ModeManagerRenderer } from './ModeManager.js';
import { Note } from './Note.js';
import { NoteManager } from './NoteManager.js';
import { NoteRenderer } from './NoteRenderer.js';
import { AudioPlayback } from './AudioPlayback.js';
import { LayerManager } from './LayerManager.js';
import { LayerRenderer } from './LayerRenderer.js';
import { Rectangle } from './Rectangle.js';
import { Cursor } from './Cursor.js';
import { Point } from './Point.js';
import { Playhead } from './Playhead.js';

document.addEventListener('DOMContentLoaded', event => {

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
                                  canvas.height);

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

// audio
const audio = new AudioContext();
const audioPlayback = new AudioPlayback(audio);
audioPlayback.duration = song.duration;
const playhead = new Playhead(song);
audioPlayback.bind('playheadTime', time => playhead.time = time);
playhead.bind('time', time => audioPlayback._playheadTime = time);
playhead.bind('grabbed', grabbed => {
  if (grabbed && audioPlayback.isPlaying) {
    audioPlayback.stop();
  }
});

const noteRenderer = new NoteRenderer(song);
const noteManager = new NoteManager(song, noteRenderer);
noteManager.bind('previewNote', note => audioPlayback.previewNote = note);
noteManager.bind('notes', notes => audioPlayback.notes = notes);


// ui
const subdivisionDisplay = document.createElement('span');
subdivisionDisplay.id = 'subdivision';
subdivisionDisplay.textContent = layerManager.subdivision;
subdivisionDisplay.style.marginRight = '20px';
layerManager.bind('currentChanged', layer => {
  if (layer !== undefined) subdivisionDisplay.textContent = layer.subdivision;
});
layerManager.bind('subdivisionChanged', subdivision => {
  subdivisionDisplay.textContent = subdivision;
});
layerManager.bind('subdivisionStringChanged', subdivisionString => {
  if (subdivisionString !== '') {
    subdivisionDisplay.textContent = subdivisionString;
  }
});
const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
info.appendChild(subdivisionLabel);
info.appendChild(subdivisionDisplay);

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
audioPlayback.bind('isPlaying', isPlaying => {
  playButton.textContent = isPlaying ? 'Stop' : 'Play';
});
playButton.addEventListener('click', event => {
  audioPlayback.isPlaying ? audioPlayback.stop() : audioPlayback.play();
});

controls.appendChild(playButton);

const keyboardSizeInput = document.createElement('input');
keyboardSizeInput.id = 'keyboardSizeInput';
keyboardSizeInput.name = 'keyboardSizeInput';
keyboardSizeInput.type = 'number';
keyboardSizeInput.value = song.numKeys;
keyboardSizeInput.min = 1;
keyboardSizeInput.max = Infinity;
keyboardSizeInput.style.width = '40px';
keyboardSizeInput.style.marginRight = '20px';
keyboardSizeInput.addEventListener('input', event => {
  song.numKeys = keyboardSizeInput.valueAsNumber;
});
const keyboardSizeLabel = document.createElement('label');
keyboardSizeLabel.htmlFor = keyboardSizeInput.id;
keyboardSizeLabel.textContent = 'Number of keys: ';
[keyboardSizeLabel, keyboardSizeInput].forEach(el => controls.appendChild(el));

const rootNoteInput = document.createElement('input');
rootNoteInput.id = 'rootNoteInput';
rootNoteInput.name = 'rootNoteInput';
rootNoteInput.type = 'number';
rootNoteInput.value = song.rootNote;
rootNoteInput.min = 0;
rootNoteInput.max = Infinity;
rootNoteInput.step = 12;
rootNoteInput.style.width = '40px';
rootNoteInput.style.marginRight = '20px';
rootNoteInput.addEventListener('change', event => {
  const input = rootNoteInput.valueAsNumber;
  const newRoot = input - (input % 12);
  song.rootNote = newRoot;
  rootNoteInput.value = newRoot;
});
const rootNoteLabel = document.createElement('label');
rootNoteLabel.htmlFor = rootNoteInput.id;
rootNoteLabel.textContent = 'Root note: ';
[rootNoteLabel, rootNoteInput].forEach(el => controls.appendChild(el));

const durationInput = document.createElement('input');
durationInput.id = 'durationInput';
durationInput.name = 'durationInput';
durationInput.type = 'number';
durationInput.value = song.duration;
durationInput.min = 0;
durationInput.max = Infinity;
durationInput.style.width = '40px';
durationInput.addEventListener('input', event => {
  song.duration = durationInput.valueAsNumber;
});
const durationLabel = document.createElement('label');
durationLabel.htmlFor = durationInput.id;
durationLabel.textContent = 'Duration (seconds): ';
[durationLabel, durationInput].forEach(el => controls.appendChild(el));

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
         noteManager.isGrabbing;
}, 'move');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.notes &&
         noteManager.isHovering;
}, 'move');

cursor.addState(() => {
  return modeManager.currentMode === modeManager.modes.notes &&
         (noteManager.isResizing || noteManager.isResizeHovering);
}, 'ew-resize');

cursor.addState(() => {
  return playhead.hover;
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
  noteManager.render(ctx);

  // playhead
  playhead.render(ctx, color.red, 0.8);

  ctx.restore();
}


// Update loop
// -----------------------------------------------------------------------------
function update() {
  cursor.update();
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

  playhead.updateMouseDown(point);

  if (!playhead.grabbed) {
    if (modeManager.currentMode === modeManager.modes.layers) {
      layerManager.updateMouseDown(point, snapping);
    }
    else if (modeManager.currentMode === modeManager.modes.notes) {
      const snappedPoint = getPointFromInput(event);
      noteManager.updateMouseDown(point, snappedPoint, layerManager.currentRect);
    }
  }
});

document.addEventListener('mouseup', event => {
  const point = new Point(event.offsetX, event.offsetY);

  playhead.updateMouseUp(point);

  if (modeManager.currentMode === modeManager.modes.layers) {
    layerManager.updateMouseUp(point);
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    noteManager.updateMouseUp(point);
  }

  layerManager.setDraggingLayer(undefined);
});


document.addEventListener('mousemove', event => {
  const point = new Point(constrain(event.pageX - canvas.offsetLeft, 0, canvas.width),
                          constrain(event.pageY - canvas.offsetTop, 0, canvas.height));

  layerManager.updateMouseMove(point, snapping);

  if (modeManager.currentMode === modeManager.modes.notes) {
    const snappedPoint = getPointFromInput(event);
    const focusedSnappedPoint = layerManager.currentLayer === undefined
      ? snappedPoint
      : snapping
        ? new Point(layerManager.currentRect.x, snappedPoint.y)
        : point;

    noteManager.updateMouseMove(point, focusedSnappedPoint, layerManager.currentRect, snapping);
  }

  playhead.updateMouseMove(point);
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
  else if (event.key  === 'Shift')  { snapping = false; }
  else if (event.key  === 'Alt')    {
    layerManager.copying = true;
    noteManager.copying = true;
  }
  else if (event.code === 'Space')  {
    event.preventDefault();
    audioPlayback.isPlaying ? audioPlayback.stop() : audioPlayback.play();
  }
  else if (event.key  === 'Escape') {
    layerManager.creation.active = false;
    if (document.activeElement !== canvas) { document.activeElement.blur(); }
  }
  else if (event.key === 'Backspace' || event.code === 'KeyX' || event.code === 'KeyM') {
    if (modeManager.currentMode === modeManager.modes.layers) {
      if (layerManager.currentLayer !== layerManager.parentLayer) {
        layerManager.removeLayer(layerManager.currentLayer);
      }
    }
    else if (modeManager.currentMode === modeManager.modes.notes) {
      noteManager.hovering.forEach(note => noteManager.deleteNote(note));
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
  else if (event.key === 'Alt')   {
    layerManager.copying = false;
    noteManager.copying = false;
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
  function randomNote(min) {
    return Math.floor(Math.random() * song.numKeys) + min;
  }

  function randomTime(min) {
    return (Math.random() * (song.duration - min)) + min;
  }

  loop(4, (i, n) => {
    const noteStart = randomNote(song.rootNote);
    const noteStop = randomNote(noteStart);
    const timeStart = randomTime(song.duration);
    const timeStop = randomTime(timeStart);
    layerManager.addLayer(midiToFreq(noteStart), midiToFreq(noteStop), timeStart, timeStop);
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
window.noteManager = noteManager;
window.cursor = cursor;
window.song = song;
window.canvas = canvas;

});
