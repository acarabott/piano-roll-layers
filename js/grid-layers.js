/*
  TODO:
  - moving notes
  - delete note
  - play note on draw
  - resize layers
  - put at top and overlay the vertical lines?
  - snap any line?
*/

// Helper functions
// -----------------------------------------------------------------------------

import { loop, rrandint, midiToFreq } from './utils.js';
import * as color from './color.js';
import { ModeManager, ModeManagerRenderer } from './ModeManager.js';
import { Note, NoteManager, NoteRenderer } from './Note.js';
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
canvas.setAttribute('tabindex', 1);
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

const layerManager = new LayerManager();
let snapping = true;
const NUM_KEYS = 20;
const DURATION = 10;
const ROOT_NOTE = 60;

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
subdivisionInput.value = layerManager.subdivision;
const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
controls.appendChild(subdivisionLabel);
controls.appendChild(subdivisionInput);
controls.appendChild(modeManagerRenderer.label);

const noteManager = new NoteManager();
const noteRenderer = new NoteRenderer();
noteRenderer.parentRect = patternRect;
noteRenderer.duration = DURATION;
noteRenderer.numKeys = NUM_KEYS;
noteRenderer.rootNote = ROOT_NOTE;


class AudioPlayback {
  constructor(audioContext) {
    this.audio = audioContext;
    this.lookahead = 0.5;
    this.audioStart = 0;
    this.notes = [];
    this.marker = Symbol('played');
  }

  playFrom(notes) {
    this.audioStart = this.audio.currentTime;
    this.notes = notes.map(note => note.clone());
  }

  playNote(note) {
    const gain = this.audio.createGain();
    const oscs = [-5, 0, 5].map(detune => {
      const osc = this.audio.createOscillator();
      osc.frequency.value = note.freq;
      osc.detune.value = detune;
      osc.type = 'sine';
      osc.connect(gain);
      return osc;
    });

    const volume = 0.1;
    gain.gain.setValueAtTime(0.0, this.audio.currentTime);
    gain.gain.setTargetAtTime(volume, this.audioStart + note.timeStart, 0.001);

    const releaseTime = this.audioStart + note.timeStop - 0.1;
    gain.gain.setValueAtTime(volume, releaseTime);
    gain.gain.setTargetAtTime(0.0, releaseTime, 0.3);


    gain.connect(this.audio.destination);

    oscs.forEach(osc => {
      osc.start(this.audioStart + note.timeStart);
      osc.stop(this.audioStart + note.timeStop + 1);
    });
  }

  update() {
    const toPlay = this.notes.filter(note => {
      const noteStartTime = this.audioStart + note.timeStart;
      return noteStartTime >= this.audio.currentTime &&
             noteStartTime <= this.audio.currentTime + this.lookahead;
    });

    toPlay.forEach(note => {
      if (!note[this.marker]) {
        this.playNote(note);
        note[this.marker] = true;
      }
    });
  }
}

const audioPlayback = new AudioPlayback(audio);

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
  noteRenderer.render(ctx, noteManager);

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
    const midiNote = rectPointToMidiNote(patternRect, point, ROOT_NOTE, NUM_KEYS);
    const freq = midiToFreq(midiNote);
    const timeStart = ((point.x - patternRect.x) / patternRect.width) * DURATION;
    const timeStop = timeStart + Note.MIN_LENGTHgg;
    noteManager.currentNote = new Note(freq, timeStart, timeStop);
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
      layerManager.updateMouseUp();
    }
  }
  else if (modeManager.currentMode === modeManager.modes.notes) {
    const point = new Point(event.offsetX, event.offsetY);
    noteManager.updateMouseUp(point, event.srcElement === canvas);
  }

  layerManager.setDraggingLayer(undefined);
});

canvas.addEventListener('mousemove', event => {
  const point = new Point(event.offsetX, event.offsetY);
  const snappedPoint = getPointFromInput(event);
  if (modeManager.currentMode === modeManager.modes.layers) {
    layerManager.updateMove(point, snappedPoint);

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
      const midiNote = rectPointToMidiNote(patternRect, point, ROOT_NOTE, NUM_KEYS);
      const freq = midiToFreq(midiNote);
      noteManager.currentNote.freq = freq;
      const end = ((point.x - patternRect.x) / patternRect.width) * DURATION;
      noteManager.currentNote.timeStop = end;
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

  if (event.target === canvas && isFinite(parseInt(event.key, 10))) {
    layerManager.subdivisionInput(event.key);
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
