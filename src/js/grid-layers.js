import { ensureAudioContext, constrain, loop, midiToFreq } from './utils.js';
import * as color from './color.js';
import { Song } from './Song.js';
import { SongRenderer } from './SongRenderer.js';
import { ModeManager, ModeManagerRenderer } from './ModeManager.js';
import { Note } from './Note.js';
import { NoteManager } from './NoteManager.js';
import { NoteRenderer } from './NoteRenderer.js';
import { AudioPlayback } from './AudioPlayback.js';
import { LayerManager } from './LayerManager.js';
import { LayerRenderer } from './LayerRenderer.js';
import { Cursor } from './Cursor.js';
import { Point } from './Point.js';
import { Playhead } from './Playhead.js';


function main() {
  const container = document.getElementById('container');
  const info = document.createElement('div');
  info.id = 'info';
  container.appendChild(info);

  const song = new Song();
  song.numKeys = 20;
  song.duration = 30;
  song.rootNote = 60;

  const songRenderer = new SongRenderer();
  songRenderer.song = song;
  song.rect = songRenderer.patternRect;
  container.appendChild(songRenderer.canvas);

  // managers
  const modeManager = new ModeManager();
  modeManager.addModes('layers', 'notes');
  modeManager.currentMode = modeManager.modes.layers;
  const modeManagerRenderer = new ModeManagerRenderer(modeManager);
  info.appendChild(modeManagerRenderer.label);
  info.appendChild(modeManagerRenderer.select);
  const layerManager = new LayerManager(song);

  // audio
  ensureAudioContext();
  const audio = new AudioContext();
  const audioPlayback = new AudioPlayback(audio);
  audioPlayback.duration = song.duration;
  const playhead = new Playhead(song);
  audioPlayback.bind('playheadTime', time => playhead.time = time);
  playhead.bind('time', time => audioPlayback._playheadTime = time);
  playhead.bind('grabbed', grabbed => {
    if (grabbed && audioPlayback.isPlaying) { audioPlayback.stop(); }
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
    if (layer !== undefined) { subdivisionDisplay.textContent = layer.subdivision; }
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
  playButton.style.width = `${songRenderer.canvas.width}px`;
  playButton.style.fontSize = '20px';
  playButton.style.background = color.blue;
  playButton.style.color = color.white;
  playButton.style.padding = '5px';


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

  const listHeader = document.createElement('h2');
  listHeader.textContent = 'Layers';
  controls.appendChild(listHeader);
  controls.appendChild(layerManager.list);

  const cursor = new Cursor();
  cursor.snapping = true;
  // layer mode
  {
    const layersModeCursorTest = (test, style) => {
      cursor.addState(() => {
        return modeManager.currentMode === modeManager.modes.layers && test();
      }, style);
    };

    layersModeCursorTest(() => true, 'crosshair');
    layersModeCursorTest(() => layerManager.grabbableLayer !== undefined, 'move');
    layersModeCursorTest(() => {
      return layerManager.resizableCorner === LayerManager.corners.tl ||
             layerManager.resizableCorner === LayerManager.corners.br;
    }, 'nwse-resize');
    layersModeCursorTest(() => {
      return layerManager.resizableCorner === LayerManager.corners.tr ||
             layerManager.resizableCorner === LayerManager.corners.bl;
    }, 'nesw-resize');
    layersModeCursorTest(() => layerManager.dragging, 'move');
    layersModeCursorTest(() => layerManager.copying, 'copy');
  }
  // notes mode
  {
    const notesModeCursorTest = (test, style) => {
      cursor.addState(() => {
        return modeManager.currentMode === modeManager.modes.notes && test();
      }, style);
    };
    notesModeCursorTest(() => true, 'pointer');
    notesModeCursorTest(() => noteManager.copying, 'copy');
    notesModeCursorTest(() => noteManager.isGrabbing || noteManager.isHovering, 'move');
    notesModeCursorTest(() => (noteManager.isResizing || noteManager.isResizeHovering), 'ew-resize');
  }
  // playhead
  cursor.addState(() => {
    return playhead.hover;
  }, 'ew-resize');



  // Render functions
  // -----------------------------------------------------------------------------

  function render() {
    songRenderer.ctx.save();
    // keys / background
    songRenderer.render();

    // layers
    LayerRenderer.render(songRenderer.ctx, layerManager);

    // notes
    noteManager.render(songRenderer.ctx);

    // playhead
    playhead.render(songRenderer.ctx, color.red, 0.8);
    songRenderer.ctx.restore();
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
    if (cursor.snapping) { point = layerManager.snapPointToLayers(point); }
    return point;
  }

  songRenderer.canvas.addEventListener('mousedown', event => {
    const point = new Point(event.offsetX, event.offsetY);

    playhead.updateMouseDown(point);

    if (!playhead.grabbed) {
      if (modeManager.currentMode === modeManager.modes.layers) {
        layerManager.updateMouseDown(point, cursor.snapping);
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
    const point = new Point(constrain(event.pageX - songRenderer.canvas.offsetLeft, 0, songRenderer.canvas.width),
                            constrain(event.pageY - songRenderer.canvas.offsetTop, 0, songRenderer.canvas.height));

    layerManager.updateMouseMove(point, cursor.snapping);

    if (modeManager.currentMode === modeManager.modes.notes) {
      const snappedPoint = getPointFromInput(event);
      const focusedSnappedPoint = layerManager.currentLayer === undefined
        ? snappedPoint
        : cursor.snapping
          ? new Point(layerManager.currentRect.x, snappedPoint.y)
          : point;

      noteManager.updateMouseMove(point, focusedSnappedPoint, layerManager.currentRect, cursor.snapping);
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
    else if (event.key  === 'Shift')  { cursor.snapping = false; }
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
      if (document.activeElement !== songRenderer.canvas) { document.activeElement.blur(); }
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
    if (event.target === songRenderer.canvas) {
      if (isFinite(parseInt(event.key, 10))) {
        layerManager.subdivisionInput(event.key);
      }
    }
  });

  document.addEventListener('keyup', event => {
    if      (event.key === 'Shift') { cursor.snapping = true; }
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
  mainLoop();
}

document.addEventListener('DOMContentLoaded', main);
