/* global Point, Rectangle, Layer, LayerManager */

// blue: rgb(43, 156, 212);
// red: rgb(212, 100, 100);
// orange: rgb(249, 182, 118);
// green: rgb(43, 212, 156);

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
subdivisionInput.type = 'number';
subdivisionInput.value = 3;
subdivisionInput.min = 0;
controls.appendChild(subdivisionInput);

function currentSubdivision() {
  return subdivisionInput.valueAsNumber;
}

// Helper functions
// -----------------------------------------------------------------------------

function loop(n, func) {
  for (let i = 0; i < n; i++) {
    func(i);
  }
}

function constrain(val, min=0, max=1.0) {
  return Math.min(Math.min(val, max), min);
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
  ctx.fillStyle = 'rgb(200, 200, 200)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  renderPiano(ctx, keyRect, NUM_KEYS);
  renderPiano(ctx, patternRect, NUM_KEYS, 0.2);

  layerManager.layers.forEach(layer => layer.render(ctx));

  if (layerManager.selection.active) {
    ctx.strokeStyle = 'rgb(43, 212, 156)';
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

function getSnappedMouse(event) {
  let point = new Point(event.offsetX, event.offsetY);
  const rects = layerManager.layers.map(l => l.rects).reduce((cur, prev) => {
    return prev.concat(cur);
  }, [patternRect]);
  if (snapping) { point = getSnappedPoint(point, patternRect, NUM_KEYS, rects); }
  return point;
}

canvas.addEventListener('mousedown', event => {
  layerManager.selection.active = true;
  const point = getSnappedMouse(event);
  layerManager.selection.rect.tl = point;
  layerManager.selection.rect.br = point;
});

document.addEventListener('mouseup', event => {
  layerManager.selection.active = false;

  if (event.srcElement === canvas) {
    const selRect = layerManager.selection.rect;
    if (selRect.width > 0 && selRect.height > 0) {
      layerManager.addLayer(...selRect, currentSubdivision());
    }
  }
});

canvas.addEventListener('mousemove', event => {
  if (layerManager.selection.active) {
    const point = getSnappedMouse(event);
    layerManager.selection.rect.br = point;
  }
});

// main loop
// -----------------------------------------------------------------------------
function mainLoop() {
  update();
  render();
  requestAnimationFrame(mainLoop);
}

document.addEventListener('DOMContentLoaded', mainLoop);
