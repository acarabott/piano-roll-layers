/* global Point, Rectangle, Layer, LayerManager */

/*
  TODO:

  - drag move layers
  - text in each chunk? 1 2 3 4
*/

const color = {
  blue:   'rgb(43, 156, 212)',
  red:    'rgb(212, 100, 100)',
  orange: 'rgb(249, 182, 118)',
  green:  'rgb(43, 212, 156)',
  black:  'rgb(0, 0, 0)'
};

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
subdivisionInput.type = 'number';
subdivisionInput.value = 3;
subdivisionInput.min = 1;
const subdivisionLabel = document.createElement('label');
subdivisionLabel.htmlFor = 'subdivision';
subdivisionLabel.textContent = 'Subdivision: ';
controls.appendChild(subdivisionLabel);
controls.appendChild(subdivisionInput);

function currentSubdivision() {
  const value = subdivisionInput.valueAsNumber;
  return isFinite(value) ? value : 1;
}

// Helper functions
// -----------------------------------------------------------------------------

function loop(n, func) {
  for (let i = 0; i < n; i++) {
    func(i, n);
  }
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

  renderPiano(ctx, keyRect, NUM_KEYS);
  renderPiano(ctx, patternRect, NUM_KEYS, 0.1);

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
  if (layerManager.highlightedLayers.length > 0) {
    layerManager.dragging.layer = layerManager.highlightedLayers[0];
    const point = new Point(event.offsetX, event.offsetY);
    layerManager.dragging.offset = point.subtract(layerManager.dragging.layer.frame.tl);
  }
  else {
    layerManager.selection.active = true;
    const point = getPointFromInput(event);
    layerManager.selection.rect.tl = point;
    layerManager.selection.rect.br = point;
  }
});

document.addEventListener('mouseup', event => {
  layerManager.dragging.layer = undefined;

  if (event.srcElement === canvas) {
    if (layerManager.selection.active) {
      layerManager.selection.active = false;
      const selRect = layerManager.selection.rect;
      if (selRect.width > 0 && selRect.height > 0) {
        const layer = layerManager.addLayer(...selRect, currentSubdivision());
        layerManager.currentLayer = layer;
        subdivisionInput.focus();
      }
    }
  }
});

canvas.addEventListener('mousemove', event => {
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
});

document.addEventListener('keydown', event => {
  if (event.key === 'Shift' && snapping) { snapping = false; }
  // key='Shift'      code='ShiftLeft'
  // key='Control'    code='ControlLeft'
  // key='Alt'        code='AltLeft'
  // key='Meta'       code='MetaLeft'
  // key='Meta'       code='MetaLeft'

  // switch (event.key) {
  //   case '0':

  //     break;
  //   default:
  //     // statements_def
  //     break;
  // }
  // console.log(event);
});

document.addEventListener('keyup', event => {
  if (event.key === 'Shift' && !snapping) { snapping = true; }
});

subdivisionInput.addEventListener('input', event => {
  const value = isFinite(subdivisionInput.valueAsNumber)
    ? subdivisionInput.valueAsNumber
    : 1;

  if (layerManager.currentLayer !== undefined) {
    layerManager.currentLayer.subdivision = value;
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
